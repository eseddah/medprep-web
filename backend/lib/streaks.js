const User = require('../models/User');

const DEFAULT_TIMEZONE = 'Africa/Accra';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKeyInTimezone(date, timezone) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
  }
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function makeDay(date, activityDates, today) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return { date, day: DAY_NAMES[weekday], active: activityDates.has(date), today: date === today };
}

function getStreakSnapshot(user, now = new Date()) {
  const today = dateKeyInTimezone(now, user.timezone);
  const yesterday = shiftDateKey(today, -1);
  const lastActivityDate = user.lastActivityDate || '';
  const activityDates = new Set(user.activityDates || []);
  const todayDone = lastActivityDate === today || activityDates.has(today);
  const currentStreak = lastActivityDate === today || lastActivityDate === yesterday
    ? user.currentStreak || 0
    : 0;
  const last7Days = Array.from({ length: 7 }, (_, index) =>
    makeDay(shiftDateKey(today, index - 6), activityDates, today));
  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = shiftDateKey(today, -mondayOffset);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    makeDay(shiftDateKey(monday, index), activityDates, today));

  return {
    currentStreak,
    longestStreak: user.longestStreak || 0,
    todayDone,
    last7Days,
    weekDays,
  };
}

async function recordStreakActivity(userId, now = new Date()) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const user = await User.findById(userId)
      .select('timezone currentStreak longestStreak lastActivityDate activityDates stats.totalStudyDays');
    if (!user) throw new Error('User not found');

    const today = dateKeyInTimezone(now, user.timezone);
    const lastActivityDate = user.lastActivityDate || '';
    if (lastActivityDate === today) return getStreakSnapshot(user, now);

    const currentStreak = lastActivityDate === shiftDateKey(today, -1)
      ? (user.currentStreak || 0) + 1
      : 1;
    const activityDates = [...new Set([...(user.activityDates || []), today])]
      .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort()
      .slice(-90);
    const filter = { _id: user._id };
    if (lastActivityDate) filter.lastActivityDate = lastActivityDate;
    else filter.$or = [
      { lastActivityDate: '' },
      { lastActivityDate: null },
      { lastActivityDate: { $exists: false } },
    ];

    const updated = await User.findOneAndUpdate(filter, {
      $set: {
        lastActivityDate: today,
        currentStreak,
        longestStreak: Math.max(user.longestStreak || 0, currentStreak),
        activityDates,
        'stats.totalStudyDays': (user.stats?.totalStudyDays || user.activityDates?.length || 0) + 1,
      },
    }, { new: true }).select('timezone currentStreak longestStreak lastActivityDate activityDates stats.totalStudyDays');
    if (updated) return getStreakSnapshot(updated, now);
  }

  throw new Error('Could not update streak after concurrent activity');
}

module.exports = { DEFAULT_TIMEZONE, dateKeyInTimezone, getStreakSnapshot, recordStreakActivity, shiftDateKey };