const TopicMastery = require('../models/TopicMastery');

async function recordTopicAttempt({ userId, courseId = '', topic, correct, reviewed = false, at = new Date() }) {
  await TopicMastery.findOneAndUpdate({ user: userId, courseId, topic }, {
    $push: { attempts: { $each: [{ correct, reviewed, at }], $slice: -30 } },
    $inc: { totalAttempts: 1, ...(reviewed ? { reviewCount: 1 } : {}) },
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

function masteryLevel({ attempts, reviewCount }) {
  if (!attempts.length) return 'Not started';
  const accuracy = attempts.filter(attempt => attempt.correct).length / attempts.length;
  if (attempts.length >= 10 && accuracy >= 0.9 && reviewCount >= 5) return 'Mastered';
  if (attempts.length >= 5 && accuracy >= 0.8 && reviewCount >= 2) return 'Proficient';
  if (attempts.length >= 3 && accuracy >= 0.6) return 'Familiar';
  return 'Attempted';
}

function summarizeMastery(record) {
  const attempts = record?.attempts || [];
  const recent = attempts.slice(-20);
  const accuracy = recent.length
    ? Math.round((recent.filter(attempt => attempt.correct).length / recent.length) * 100)
    : 0;
  const summary = { attempts, reviewCount: record?.reviewCount || 0 };
  return {
    level: masteryLevel(summary),
    accuracy,
    attemptCount: record?.totalAttempts || 0,
    reviewCount: record?.reviewCount || 0,
    recentMisses: recent.filter(attempt => !attempt.correct).length,
  };
}

module.exports = { masteryLevel, recordTopicAttempt, summarizeMastery };