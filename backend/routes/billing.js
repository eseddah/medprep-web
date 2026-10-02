const router = require('express').Router();
const axios = require('axios');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const PaystackOrder = require('../models/PaystackOrder');

const PLANS = {
  pro_monthly: { amount: 5000, plan: 'pro', durationDays: 30 },
  pro_annual:  { amount: 50000, plan: 'annual', durationDays: 365 },
};
const REFERRAL_PERCENT_OFF = 10;
const REFERRAL_USE_LIMIT = 10;
const REFERRAL_REWARD_DAYS = 7;
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

function calculatePrice(baseAmount, percentOff = 0) {
  const discountAmount = Math.floor(baseAmount * percentOff / 100);
  return { baseAmount, discountAmount, amount: Math.max(1, baseAmount - discountAmount) };
}

async function findUsableCode(rawCode, userId) {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  if (!code || !/^[A-Z0-9_-]{4,32}$/.test(code)) return { error: 'Enter a valid discount code' };
  let promo = await PromoCode.findOne({ code }).lean();
  if (!promo || !promo.isActive) return { error: 'This code is invalid or disabled' };
  const now = new Date();
  if (promo.expiresAt <= now) return { error: 'This code has expired' };

  await PromoCode.updateOne({ _id: promo._id }, { $pull: { reservations: { expiresAt: { $lte: now } } } });
  promo = await PromoCode.findById(promo._id).lean();
  if (!promo || promo.usedCount + promo.reservations.length >= promo.useLimit) return { error: 'This code has reached its use limit' };
  if (promo.type === 'referral' && promo.owner?.toString() === userId.toString()) return { error: 'You cannot use your own referral code' };
  return { promo };
}

function validPaystackSetup(res) {
  const secretMode = process.env.PAYSTACK_SECRET_KEY?.match(/^sk_(live|test)_/)?.[1];
  const publicMode = process.env.PAYSTACK_PUBLIC_KEY?.match(/^pk_(live|test)_/)?.[1];
  if (!secretMode || !publicMode || secretMode !== publicMode) {
    res.status(503).json({ error: 'Paystack is not configured with matching test or live keys.' });
    return false;
  }

  let clientUrl;
  try { clientUrl = new URL(process.env.CLIENT_URL); } catch {
    res.status(503).json({ error: 'Set CLIENT_URL to the website address used for Paystack payment returns.' });
    return false;
  }
  if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1'].includes(clientUrl.hostname)) {
    res.status(503).json({ error: 'Set CLIENT_URL to the deployed website address before accepting live payments.' });
    return false;
  }
  return true;
}

router.post('/codes/validate', protect, async (req, res) => {
  const plan = PLANS[req.body.planType];
  if (!plan) return res.status(400).json({ error: 'Choose a valid Pro plan' });
  const { promo, error } = await findUsableCode(req.body.code, req.user._id);
  if (error) return res.status(400).json({ error });
  res.json({
    code: promo.code,
    percentOff: promo.percentOff,
    currency: 'GHS',
    ...calculatePrice(PLANS[req.body.planType].amount, promo.percentOff),
  });
});

router.get('/referral', protect, async (req, res) => {
  let promo = await PromoCode.findOne({ type: 'referral', owner: req.user._id }).sort({ createdAt: -1 });
  const now = new Date();
  if (!promo || !promo.isActive || promo.expiresAt <= now || promo.usedCount + promo.reservations.length >= promo.useLimit) {
    const code = `REF-${req.user._id.toString().slice(-8).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    promo = await PromoCode.create({
      code,
      type: 'referral',
      percentOff: REFERRAL_PERCENT_OFF,
      expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      useLimit: REFERRAL_USE_LIMIT,
      owner: req.user._id,
      rewardDays: REFERRAL_REWARD_DAYS,
    });
  }
  res.json({ code: promo.code, percentOff: promo.percentOff, expiresAt: promo.expiresAt, usesRemaining: Math.max(0, promo.useLimit - promo.usedCount - promo.reservations.length), rewardDays: promo.rewardDays });
});

// POST /api/billing/paystack/initialize
router.post('/paystack/initialize', protect, async (req, res) => {
  const { planType } = req.body;
  const plan = PLANS[planType];
  if (!plan) return res.status(400).json({ error: 'Choose a valid Pro plan' });
  if (!validPaystackSetup(res)) return;
  const clientUrl = new URL(process.env.CLIENT_URL);
  let promo = null;
  let reservationReference = '';
  if (req.body.code) {
    const result = await findUsableCode(req.body.code, req.user._id);
    if (result.error) return res.status(400).json({ error: result.error });
    promo = result.promo;
    reservationReference = `medprep_${crypto.randomBytes(18).toString('hex')}`;
    const now = new Date();
    const reserved = await PromoCode.findOneAndUpdate({
      _id: promo._id,
      isActive: true,
      expiresAt: { $gt: now },
      $expr: { $lt: [{ $add: ['$usedCount', { $size: { $ifNull: ['$reservations', []] } }] }, '$useLimit'] },
    }, { $push: { reservations: { reference: reservationReference, expiresAt: new Date(now.getTime() + ORDER_TTL_MS) } } }, { new: true });
    if (!reserved) return res.status(400).json({ error: 'This code has just reached its use limit or expired' });
    promo = reserved;
  }

  const price = calculatePrice(plan.amount, promo?.percentOff || 0);
  const order = await PaystackOrder.create({
    reference: reservationReference || `medprep_${crypto.randomBytes(18).toString('hex')}`,
    user: req.user._id,
    planType,
    baseAmount: plan.amount,
    amount: price.amount,
    promoCode: promo?._id || null,
    percentOff: promo?.percentOff || 0,
    referrer: promo?.type === 'referral' ? promo.owner : null,
    rewardDays: promo?.type === 'referral' ? promo.rewardDays : 0,
    expiresAt: new Date(Date.now() + ORDER_TTL_MS),
  });

  try {
    const { data } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: order.amount,
        currency: 'GHS',
        reference: order.reference,
        callback_url: `${clientUrl.origin}/billing?ps_success=true`,
        metadata: { userId: req.user._id.toString(), planType, orderId: order._id.toString(), userName: req.user.name },
        channels: ['card', 'mobile_money', 'bank'],
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
    );
    await PaystackOrder.updateOne({ _id: order._id }, { $set: { status: 'pending' } });
    res.json({ url: data.data.authorization_url, reference: order.reference, currency: 'GHS', amount: order.amount, percentOff: order.percentOff });
  } catch (error) {
    await PaystackOrder.updateOne({ _id: order._id }, { $set: { status: 'failed' } });
    if (promo) await PromoCode.updateOne({ _id: promo._id }, { $pull: { reservations: { reference: order.reference } } });
    res.status(502).json({ error: 'Could not initialize Paystack checkout. Please try again.' });
  }
});

// POST /api/billing/paystack/verify
router.post('/paystack/verify', protect, async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: 'Reference required' });

  const order = await PaystackOrder.findOne({ reference, user: req.user._id });
  if (!order) return res.status(400).json({ error: 'Payment does not match this account' });
  if (order.status === 'paid') {
    const user = await User.findById(req.user._id).select('-password');
    return res.json({ success: true, plan: user.plan, user: user.toPublic() });
  }
  if (order.status !== 'pending') return res.status(400).json({ error: 'Payment order is not active' });

  const { data } = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });

  if (data.data.status !== 'success') return res.status(400).json({ error: 'Payment not successful' });

  const transaction = data.data;
  const planType = transaction.metadata?.planType;
  const plan = PLANS[planType];
  if (!plan || planType !== order.planType || transaction.reference !== order.reference || transaction.metadata?.userId !== req.user._id.toString() || transaction.metadata?.orderId !== order._id.toString()) {
    return res.status(400).json({ error: 'Payment does not match this account' });
  }
  if (transaction.currency !== 'GHS' || transaction.amount !== order.amount || order.baseAmount !== plan.amount) {
    return res.status(400).json({ error: 'Payment amount or currency does not match the selected plan' });
  }

  const claimedOrder = await PaystackOrder.findOneAndUpdate({ _id: order._id, status: 'pending' }, { $set: { status: 'paid' } }, { new: true });
  if (!claimedOrder) return res.status(409).json({ error: 'Payment is already being verified' });

  const currentUser = await User.findById(req.user._id);
  const start = currentUser.planExpiresAt && currentUser.planExpiresAt > new Date() ? currentUser.planExpiresAt : new Date();
  await User.findByIdAndUpdate(req.user._id, {
    plan: plan.plan,
    paystackCustomerId: transaction.customer.customer_code,
    planExpiresAt: new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000),
  });

  if (order.promoCode) {
    await PromoCode.updateOne({ _id: order.promoCode }, {
      $inc: { usedCount: 1 },
      $pull: { reservations: { reference: order.reference } },
    });
  }

  if (order.referrer && order.rewardDays > 0 && !order.rewardApplied) {
    const referrer = await User.findById(order.referrer);
    if (referrer && !referrer.isDeleted) {
      const rewardStart = referrer.planExpiresAt && referrer.planExpiresAt > new Date() ? referrer.planExpiresAt : new Date();
      await User.findByIdAndUpdate(referrer._id, {
        plan: ['pro', 'annual'].includes(referrer.plan) ? referrer.plan : 'pro',
        planExpiresAt: new Date(rewardStart.getTime() + order.rewardDays * 24 * 60 * 60 * 1000),
      });
      await PaystackOrder.updateOne({ _id: order._id }, { $set: { rewardApplied: true } });
    }
  }

  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, plan: user.plan, user: user.toPublic() });
});

// GET /api/billing/status
router.get('/status', protect, (req, res) => {
  res.json({
    plan: req.user.plan,
    planExpiresAt: req.user.planExpiresAt,
    hasPaystack: !!req.user.paystackCustomerId,
  });
});

module.exports = router;
