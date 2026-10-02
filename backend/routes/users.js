const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Progress = require('../models/Progress');
const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const ReviewItem = require('../models/ReviewItem');
const TopicMastery = require('../models/TopicMastery');
const { sendEmailNotificationsEnabled } = require('../lib/email');

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
  if (req.body.timezone !== undefined) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: req.body.timezone }).format(); }
    catch { return res.status(400).json({ error: 'Enter a valid IANA timezone' }); }
    updates.timezone = req.body.timezone;
  }
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

  if (req.body.emailNotifications !== undefined && typeof req.body.emailNotifications !== 'boolean') {
    return res.status(400).json({ error: 'Email notifications must be enabled or disabled' });
  }
  if (req.body.studyReminders !== undefined && typeof req.body.studyReminders !== 'boolean') {
    return res.status(400).json({ error: 'Study reminders must be enabled or disabled' });
  }
  const emailNotificationsEnabled = req.body.emailNotifications
    ?? req.user.preferences?.emailNotifications
    ?? false;
  const studyRemindersEnabled = req.body.studyReminders !== undefined
    ? req.body.studyReminders
    : req.body.emailNotifications === false
      ? false
      : req.user.preferences?.studyReminders ?? false;
  if (studyRemindersEnabled && !emailNotificationsEnabled) {
    return res.status(400).json({ error: 'Enable Email Notifications before turning on daily study reminders' });
  }
  if (req.body.emailNotifications === false) updates['preferences.studyReminders'] = false;

  const enablingEmailNotifications = req.body.emailNotifications === true
    && req.user.preferences?.emailNotifications !== true;
  if (enablingEmailNotifications) {
    try {
      await sendEmailNotificationsEnabled(req.user);
    } catch (error) {
      const status = error.code === 'EMAIL_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ error: error.message || 'Notification email could not be sent.' });
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-password');
  res.json({ preferences: user.preferences });
});

// GET /api/users/export
router.get('/export', protect, async (req, res) => {
  const user = req.user.toPublic();
  const [progress, reviewItems, topicMastery] = await Promise.all([
    Progress.find({ user: req.user._id }),
    ReviewItem.find({ user: req.user._id }),
    TopicMastery.find({ user: req.user._id }),
  ]);
  const exportData = {
    exportedAt: new Date().toISOString(),
    account: {
      name: user.name,
      email: user.email,
      plan: user.plan,
      timezone: user.timezone,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastActivityDate: user.lastActivityDate,
      activityDates: user.activityDates,
      createdAt: user.createdAt,
    },
    stats: user.stats,
    preferences: user.preferences,
    studyHistory: progress,
    reviewItems,
    topicMastery,
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
  await Promise.all([
    Progress.deleteMany({ user: req.user._id }),
    ReviewItem.deleteMany({ user: req.user._id }),
    TopicMastery.deleteMany({ user: req.user._id }),
  ]);
  await ChatMessage.deleteMany({ sender: req.user._id });
  const ownedRooms = await ChatRoom.find({ createdBy: req.user._id }).select('_id');
  const ownedRoomIds = ownedRooms.map(room => room._id.toString());
  if (ownedRoomIds.length) {
    await ChatMessage.deleteMany({ room: { $in: ownedRoomIds } });
    await ChatRoom.deleteMany({ _id: { $in: ownedRooms.map(room => room._id) } });
  }
  await ChatRoom.updateMany({ members: req.user._id }, { $pull: { members: req.user._id } });
  res.json({ message: 'Account deleted successfully' });
});

module.exports = router;
