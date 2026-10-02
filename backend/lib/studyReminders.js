const crypto = require('crypto');
const User = require('../models/User');
const { sendDailyStudyReminder } = require('./email');

const REMINDER_HOUR = 9;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const LOCK_DURATION_MS = 10 * 60 * 1000;
let sweepRunning = false;

function getLocalReminderTime(date, timezone) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Africa/Accra',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Accra',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
  }
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour) };
}

async function sweepStudyReminders(now = new Date()) {
  if (sweepRunning) return;
  sweepRunning = true;
  try {
    const users = await User.find({
      isDeleted: { $ne: true },
      'preferences.emailNotifications': true,
      'preferences.studyReminders': true,
      email: { $exists: true, $ne: '' },
    }).select('_id email name timezone currentStreak studyReminderSentDate studyReminderLockUntil');

    for (const user of users) {
      const local = getLocalReminderTime(now, user.timezone);
      if (local.hour < REMINDER_HOUR || user.studyReminderSentDate === local.date) continue;

      const lockToken = crypto.randomUUID();
      const claimed = await User.findOneAndUpdate({
        _id: user._id,
        isDeleted: { $ne: true },
        'preferences.emailNotifications': true,
        'preferences.studyReminders': true,
        studyReminderSentDate: { $ne: local.date },
        $or: [
          { studyReminderLockUntil: { $lte: now } },
          { studyReminderLockUntil: { $exists: false } },
          { studyReminderLockUntil: null },
        ],
      }, {
        $set: {
          studyReminderLockUntil: new Date(now.getTime() + LOCK_DURATION_MS),
          studyReminderLockToken: lockToken,
        },
      }, { new: true }).select('_id email name currentStreak');
      if (!claimed) continue;

      try {
        await sendDailyStudyReminder(claimed);
        await User.updateOne({ _id: claimed._id, studyReminderLockToken: lockToken }, {
          $set: { studyReminderSentDate: local.date },
          $unset: { studyReminderLockUntil: 1, studyReminderLockToken: 1 },
        });
      } catch (error) {
        await User.updateOne({ _id: claimed._id, studyReminderLockToken: lockToken }, {
          $unset: { studyReminderLockUntil: 1, studyReminderLockToken: 1 },
        });
        console.error('Study reminder delivery failed:', error.message);
      }
    }
  } finally {
    sweepRunning = false;
  }
}

function startStudyReminderScheduler() {
  void sweepStudyReminders().catch(error => console.error('Study reminder scheduler failed:', error.message));
  const timer = setInterval(() => {
    void sweepStudyReminders().catch(error => console.error('Study reminder scheduler failed:', error.message));
  }, SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}

module.exports = { getLocalReminderTime, startStudyReminderScheduler, sweepStudyReminders };