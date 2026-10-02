const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { error, value } = Joi.object({
    name:     Joi.string().trim().min(2).max(60).required(),
    email:    Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(6).required(),
    school:   Joi.string().allow('').optional(),
    year:     Joi.string().allow('').optional(),
  }).validate(req.body, { abortEarly: true, stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details[0].message });

  const exists = await User.findOne({ email: value.email });
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const user = await User.create({ ...value, name: value.name.trim() });
  res.status(201).json({ token: sign(user._id), user: user.toPublic() });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email, isDeleted: false });
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: sign(user._id), user: user.toPublic() });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user.toPublic() }));

// POST /api/auth/logout (client just drops token; this is for future blocklist)
router.post('/logout', protect, (req, res) => res.json({ message: 'Logged out' }));

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified)
      return res.status(400).json({ error: 'Google email not verified' });

    const email = payload.email.trim().toLowerCase();
    let user = await User.findOne({ email, isDeleted: false });

    if (!user) {
      user = await User.create({
        name: (payload.name || email.split('@')[0]).slice(0, 60),
        email,
        emailVerified: true,
        password: crypto.randomBytes(24).toString('hex'),
      });
    } else if (user.emailVerified !== true) {
      user.emailVerified = true;
      await user.save();
    }

    res.json({ token: sign(user._id), user: user.toPublic() });
  } catch (err) {
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

module.exports = router;
