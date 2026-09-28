const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const PLANS = {
  pro_monthly: { price: 12, currency: 'usd', paystackAmount: 1200 * 100 }, // kobo/cents
  pro_annual:  { price: 99, currency: 'usd', paystackAmount: 9900 * 100 },
};

// ── STRIPE ────────────────────────────────────────────────────────────────────

// POST /api/billing/stripe/checkout
router.post('/stripe/checkout', protect, async (req, res) => {
  const { planType } = req.body; // 'pro_monthly' | 'pro_annual'
  let customerId = req.user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: req.user.email, name: req.user.name });
    customerId = customer.id;
    await User.findByIdAndUpdate(req.user._id, { stripeCustomerId: customerId });
  }

  const priceId = planType === 'pro_annual'
    ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID
    : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/billing?cancelled=true`,
    metadata: { userId: req.user._id.toString(), planType },
  });

  res.json({ url: session.url });
});

// POST /api/billing/stripe/portal — manage subscription
router.post('/stripe/portal', protect, async (req, res) => {
  if (!req.user.stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer found' });
  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/billing`,
  });
  res.json({ url: session.url });
});

// POST /api/billing/webhook/stripe — raw body
router.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).json({ error: 'Webhook signature failed' });
  }

  const session = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        plan: planType === 'pro_annual' ? 'annual' : 'pro',
        stripeSubscriptionId: session.subscription,
        planExpiresAt: planType === 'pro_annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customer = await stripe.customers.retrieve(session.customer);
    const user = await User.findOne({ stripeCustomerId: session.customer });
    if (user) await User.findByIdAndUpdate(user._id, { plan: 'free', stripeSubscriptionId: null });
  }

  res.json({ received: true });
});

// ── PAYSTACK ──────────────────────────────────────────────────────────────────

// POST /api/billing/paystack/initialize
router.post('/paystack/initialize', protect, async (req, res) => {
  const { planType } = req.body;
  const amount = planType === 'pro_annual' ? 9900 * 100 : 1200 * 100; // in kobo (GHS pesewas equivalent)

  const { data } = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: req.user.email,
      amount, // in lowest denomination
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

  const { planType } = data.data.metadata;
  await User.findByIdAndUpdate(req.user._id, {
    plan: planType === 'pro_annual' ? 'annual' : 'pro',
    paystackCustomerId: data.data.customer.customer_code,
    planExpiresAt: planType === 'pro_annual'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, plan: user.plan, user: user.toPublic() });
});

// GET /api/billing/status
router.get('/status', protect, (req, res) => {
  res.json({
    plan: req.user.plan,
    planExpiresAt: req.user.planExpiresAt,
    stripeSubscriptionId: req.user.stripeSubscriptionId,
    hasPaystack: !!req.user.paystackCustomerId,
  });
});

// POST /api/billing/cancel  (Stripe)
router.post('/cancel', protect, async (req, res) => {
  if (!req.user.stripeSubscriptionId) return res.status(400).json({ error: 'No active subscription' });
  await stripe.subscriptions.update(req.user.stripeSubscriptionId, { cancel_at_period_end: true });
  res.json({ message: 'Subscription will cancel at period end' });
});

module.exports = router;
