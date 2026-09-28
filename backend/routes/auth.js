const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { error } = Joi.object({
    name:     Joi.string().min(2).max(60).required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    school:   Joi.string().allow('').optional(),
    year:     Joi.string().allow('').optional(),
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const exists = await User.findOne({ email: req.body.email });
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const user = await User.create(req.body);
  res.status(201).json({ token: sign(user._id), user: user.toPublic() });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
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

module.exports = router;
