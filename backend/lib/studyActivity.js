const User = require('../models/User');

const UTC_DAY = 24 * 60 * 60 * 1000;
const FREE_DAILY_CONCEPT_LIMIT = 3;

function dayStart(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

async function markStudyDay(userId) {
  const now = new Date();
  const today = dayStart(now);
  const user = await User.findById(userId).select('stats.streak stats.lastStudied');
  if (!user) return;

  const lastStudied = user.stats?.lastStudied;
  if (lastStudied && dayStart(lastStudied) === today) return;

  const lastDay = lastStudied ? dayStart(lastStudied) : 0;
  const streak = lastDay === today - UTC_DAY ? (user.stats?.streak || 0) + 1 : 1;
  const expectedLastStudied = lastStudied
    ? { 'stats.lastStudied': lastStudied }
    : { 'stats.lastStudied': { $exists: false } };

  await User.updateOne(
    { _id: userId, ...expectedLastStudied },
    { $set: { 'stats.streak': streak, 'stats.lastStudied': now } },
  );
}

async function reserveDailyConcept(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const user = await User.findById(userId).select('plan stats.dailyConceptsUsed stats.dailyConceptsDate');
  if (!user) return { allowed: false, remaining: 0, limit: FREE_DAILY_CONCEPT_LIMIT };
  if (['pro', 'annual'].includes(user.plan)) return { allowed: true, remaining: null, limit: null };

  const updated = await User.findOneAndUpdate({
    _id: userId,
    $or: [
      { 'stats.dailyConceptsDate': { $ne: today } },
      { 'stats.dailyConceptsDate': today, 'stats.dailyConceptsUsed': { $lt: FREE_DAILY_CONCEPT_LIMIT } },
    ],
  }, [{
    $set: {
      'stats.dailyConceptsUsed': {
        $cond: [
          { $eq: ['$stats.dailyConceptsDate', today] },
          { $add: [{ $ifNull: ['$stats.dailyConceptsUsed', 0] }, 1] },
          1,
        ],
      },
      'stats.dailyConceptsDate': today,
    },
  }], { new: true }).select('stats.dailyConceptsUsed');

  if (!updated) return { allowed: false, remaining: 0, limit: FREE_DAILY_CONCEPT_LIMIT };
  const used = updated.stats?.dailyConceptsUsed || 0;
  return { allowed: true, remaining: Math.max(0, FREE_DAILY_CONCEPT_LIMIT - used), limit: FREE_DAILY_CONCEPT_LIMIT };
}

async function releaseDailyConcept(userId) {
  const today = new Date().toISOString().slice(0, 10);
  await User.updateOne({
    _id: userId,
    'stats.dailyConceptsDate': today,
    'stats.dailyConceptsUsed': { $gt: 0 },
  }, { $inc: { 'stats.dailyConceptsUsed': -1 } });
}

module.exports = { markStudyDay, reserveDailyConcept, releaseDailyConcept, FREE_DAILY_CONCEPT_LIMIT };
