const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authorized' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findById(id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!user.trialStartedAt) {
      user = await User.findOneAndUpdate(
        { _id: user._id, $or: [{ trialStartedAt: { $exists: false } }, { trialStartedAt: null }] },
        { $set: { trialStartedAt: new Date() } },
        { new: true },
      ).select('-password') || await User.findById(id).select('-password');
    }
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
};

const requirePro = (req, res, next) => {
  if (['pro', 'annual'].includes(req.user?.getEffectivePlan())) return next();
  res.status(403).json({ error: 'Pro plan required', upgrade: true });
};

module.exports = { protect, requirePro };
