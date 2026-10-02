const router = require('express').Router();
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const ReviewItem = require('../models/ReviewItem');
const TopicMastery = require('../models/TopicMastery');
const COURSES = require('../lib/coursesData');
const { recordTopicAttempt, summarizeMastery } = require('../lib/reviewStudy');
const { callAI, isConfigured } = require('../lib/gemini');

const ratings = new Set(['again', 'hard', 'good', 'easy']);
const DAY_MS = 24 * 60 * 60 * 1000;

function makeSourceKey(type, courseId, prompt) {
  return crypto.createHash('sha256')
    .update(`${type}:${courseId || ''}:${prompt.trim().toLowerCase()}`)
    .digest('hex');
}

function publicReviewItem(item) {
  return {
    id: item._id.toString(),
    type: item.type,
    courseId: item.courseId,
    topic: item.topic,
    prompt: item.prompt,
    options: item.options,
    correctIndex: item.correctIndex,
    answer: item.answer,
    explanation: item.explanation,
  };
}

router.get('/due', protect, async (req, res) => {
  const now = new Date();
  const items = await ReviewItem.find({ user: req.user._id, dueAt: { $lte: now } })
    .sort({ dueAt: 1, createdAt: 1 })
    .limit(100)
    .lean();
  const dueCount = await ReviewItem.countDocuments({ user: req.user._id, dueAt: { $lte: now } });
  res.json({ items: items.map(publicReviewItem), dueCount });
});

router.post('/attempt', protect, async (req, res) => {
  const { courseId = '', topic, prompt, options = [], correctIndex, explanation = '', isCorrect } = req.body;
  if (typeof topic !== 'string' || !topic.trim() || typeof prompt !== 'string' || !prompt.trim() || typeof isCorrect !== 'boolean') {
    return res.status(400).json({ error: 'Topic, question, and correctness are required' });
  }
  if (!Array.isArray(options) || options.length > 8 || options.some(option => typeof option !== 'string')) {
    return res.status(400).json({ error: 'Question options are invalid' });
  }

  const normalizedTopic = topic.trim().slice(0, 180);
  const normalizedPrompt = prompt.trim().slice(0, 5000);
  const safeCourseId = typeof courseId === 'string' ? courseId.slice(0, 80) : '';
  if (!isCorrect) {
    const sourceKey = makeSourceKey('question', safeCourseId, normalizedPrompt);
    await ReviewItem.findOneAndUpdate({ user: req.user._id, sourceKey }, {
      $set: {
        type: 'question',
        courseId: safeCourseId,
        topic: normalizedTopic,
        prompt: normalizedPrompt,
        options,
        correctIndex: Number.isInteger(correctIndex) ? correctIndex : -1,
        explanation: typeof explanation === 'string' ? explanation.slice(0, 5000) : '',
        dueAt: new Date(),
        repetitions: 0,
        intervalDays: 0,
      },
      $setOnInsert: { easeFactor: 2.5 },
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  await recordTopicAttempt({ userId: req.user._id, courseId: safeCourseId, topic: normalizedTopic, correct: isCorrect });
  res.json({ recorded: true, queued: !isCorrect });
});

router.post('/items', protect, async (req, res) => {
  const { courseId = '', topic, prompt, answer, explanation = '' } = req.body;
  if (typeof topic !== 'string' || !topic.trim() || typeof prompt !== 'string' || !prompt.trim() || typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ error: 'Topic, flashcard front, and flashcard back are required' });
  }
  const safeCourseId = typeof courseId === 'string' ? courseId.slice(0, 80) : '';
  const sourceKey = makeSourceKey('flashcard', safeCourseId, prompt);
  const item = await ReviewItem.findOneAndUpdate({ user: req.user._id, sourceKey }, {
    $setOnInsert: {
      type: 'flashcard',
      courseId: safeCourseId,
      topic: topic.trim().slice(0, 180),
      prompt: prompt.trim().slice(0, 5000),
      answer: answer.trim().slice(0, 5000),
      explanation: typeof explanation === 'string' ? explanation.slice(0, 5000) : '',
      dueAt: new Date(),
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
    },
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.status(201).json({ saved: true, item: publicReviewItem(item) });
});

router.post('/:id/rate', protect, async (req, res) => {
  const { rating } = req.body;
  if (!ratings.has(rating)) return res.status(400).json({ error: 'Choose Again, Hard, Good, or Easy' });
  const item = await ReviewItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) return res.status(404).json({ error: 'Review item not found' });

  const now = new Date();
  const quality = { again: 0, hard: 3, good: 4, easy: 5 }[rating];
  const priorEase = item.easeFactor || 2.5;
  item.easeFactor = Math.max(1.3, priorEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (rating === 'again') {
    item.repetitions = 0;
    item.intervalDays = 1;
  } else if (rating === 'hard') {
    item.repetitions += 1;
    item.intervalDays = item.repetitions === 1
      ? 1
      : Math.max(1, Math.round((item.intervalDays || 1) * item.easeFactor * 0.8));
  } else if (rating === 'good') {
    item.repetitions += 1;
    item.intervalDays = item.repetitions === 1 ? 1 : item.repetitions === 2 ? 6 : Math.round(item.intervalDays * item.easeFactor);
  } else {
    item.repetitions += 1;
    item.intervalDays = item.repetitions === 1 ? 2 : item.repetitions === 2 ? 6 : Math.round(item.intervalDays * item.easeFactor * 1.3);
  }
  item.dueAt = new Date(now.getTime() + item.intervalDays * DAY_MS);
  item.lastReviewedAt = now;
  await item.save();
  await recordTopicAttempt({
    userId: req.user._id,
    courseId: item.courseId,
    topic: item.topic,
    correct: rating !== 'again',
    reviewed: true,
    at: now,
  });
  res.json({ saved: true, intervalDays: item.intervalDays, dueAt: item.dueAt });
});

router.get('/mastery', protect, async (req, res) => {
  const records = await TopicMastery.find({ user: req.user._id }).lean();
  const byTopic = new Map(records.map(record => [`${record.courseId}:${record.topic}`, record]));
  const knownKeys = new Set();
  const courses = COURSES.map(course => ({
    id: course.id,
    title: course.title,
    topics: course.topics.map(topic => {
      const key = `${course.id}:${topic}`;
      knownKeys.add(key);
      return { name: topic, ...summarizeMastery(byTopic.get(key)) };
    }),
  }));
  const customTopics = records
    .filter(record => !knownKeys.has(`${record.courseId}:${record.topic}`))
    .map(record => ({ name: record.topic, ...summarizeMastery(record) }));
  if (customTopics.length) courses.push({ id: '', title: 'Other topics', topics: customTopics });
  const weakSpots = records
    .map(record => ({ courseId: record.courseId, topic: record.topic, ...summarizeMastery(record) }))
    .filter(record => record.recentMisses > 0)
    .sort((a, b) => b.recentMisses - a.recentMisses || a.accuracy - b.accuracy)
    .slice(0, 3);
  res.json({ courses, weakSpots });
});

router.post('/:id/explain', protect, async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'AI explanations are not configured. Add GEMINI_API_KEY to the backend environment.' });
  const item = await ReviewItem.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!item || item.type !== 'question') return res.status(404).json({ error: 'Question not found' });
  try {
    const explanation = await callAI({
      maxOutputTokens: 700,
      system: 'Explain medical and premedical learning questions clearly and concisely. Correct misconceptions and do not invent references. This is educational content, not personal medical advice.',
      prompt: `Topic: ${item.topic}\nQuestion: ${item.prompt}\nOptions: ${item.options.map((option, index) => `${index + 1}. ${option}`).join('\n')}\nCorrect answer: ${item.options[item.correctIndex] || item.answer}\nStored explanation: ${item.explanation || 'None'}`,
    });
    res.json({ explanation });
  } catch (error) {
    const exhausted = error.code === 'AI_UNAVAILABLE';
    res.status(exhausted ? 503 : 502).json({ error: exhausted ? error.message : 'Could not explain this question right now' });
  }
});

module.exports = router;