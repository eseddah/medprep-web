const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Progress = require('../models/Progress');

// GET /api/users/stats
router.get('/stats', protect, async (req, res) => {
  const progress = await Progress.find({ user: req.user._id }).sort('-createdAt').limit(50);
  res.json({ stats: req.user.stats, progress });
});

// PATCH /api/users/profile
router.patch('/profile', protect, async (req, res) => {
  const allowed = ['name', 'bio', 'school', 'year', 'avatar'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
  res.json({ user: user.toPublic() });
});

// PATCH /api/users/password
router.patch('/password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const user = await User.findById(req.user._id);
  if (!(await user.matchPassword(currentPassword))) return res.status(401).json({ error: 'Current password incorrect' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully' });
});

// PATCH /api/users/preferences
router.patch('/preferences', protect, async (req, res) => {
  const allowed = ['theme', 'emailNotifications', 'studyReminders', 'defaultQuizCount', 'defaultFlashCount'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[`preferences.${k}`] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-password');
  res.json({ preferences: user.preferences });
});

// GET /api/users/export
router.get('/export', protect, async (req, res) => {
  const user = req.user.toPublic();
  const progress = await Progress.find({ user: req.user._id });
  const exportData = {
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email, plan: user.plan, createdAt: user.createdAt },
    stats: user.stats,
    preferences: user.preferences,
    studyHistory: progress,
  };
  res.setHeader('Content-Disposition', 'attachment; filename="medprep-data.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(exportData);
});

// DELETE /api/users/account
router.delete('/account', protect, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required to delete account' });
  const user = await User.findById(req.user._id);
  if (!(await user.matchPassword(password))) return res.status(401).json({ error: 'Password incorrect' });
  // Soft delete
  await User.findByIdAndUpdate(req.user._id, { isDeleted: true, email: `deleted_${user._id}_${user.email}` });
  await Progress.deleteMany({ user: req.user._id });
  res.json({ message: 'Account deleted successfully' });
});

module.exports = router;
