const router = require('express').Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const PLANS = {
  pro_monthly: { amount: 5000, plan: 'pro', durationDays: 30 },
  pro_annual:  { amount: 50000, plan: 'annual', durationDays: 365 },
};

// POST /api/billing/paystack/initialize
router.post('/paystack/initialize', protect, async (req, res) => {
  const { planType } = req.body;
  const plan = PLANS[planType];
  if (!plan) return res.status(400).json({ error: 'Choose a valid Pro plan' });

  const { data } = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: req.user.email,
      amount: plan.amount,
      currency: 'GHS',
      callback_url: `${process.env.CLIENT_URL}/billing?ps_success=true`,
      metadata: { userId: req.user._id.toString(), planType, userName: req.user.name },
      channels: ['card', 'mobile_money', 'bank'],
    },
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );

  res.json({ url: data.data.authorization_url, reference: data.data.reference });
});

// POST /api/billing/paystack/verify
router.post('/paystack/verify', protect, async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: 'Reference required' });

  const { data } = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });

  if (data.data.status !== 'success') return res.status(400).json({ error: 'Payment not successful' });

  const transaction = data.data;
  const planType = transaction.metadata?.planType;
  const plan = PLANS[planType];
  if (!plan || transaction.metadata?.userId !== req.user._id.toString()) {
    return res.status(400).json({ error: 'Payment does not match this account' });
  }
  if (transaction.currency !== 'GHS' || transaction.amount !== plan.amount) {
    return res.status(400).json({ error: 'Payment amount or currency does not match the selected plan' });
  }

  await User.findByIdAndUpdate(req.user._id, {
    plan: plan.plan,
    paystackCustomerId: transaction.customer.customer_code,
    planExpiresAt: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
  });

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
