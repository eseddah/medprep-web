const router = require('express').Router();
const { requireAdmin } = require('../lib/adminAccess');
const PromoCode = require('../models/PromoCode');
const QuestionBank = require('../models/QuestionBank');

router.use(requireAdmin);

router.get('/access', (req, res) => res.json({ authorized: true }));

router.get('/codes', async (req, res) => {
  const codes = await PromoCode.find({ type: 'discount' })
    .select('code percentOff expiresAt useLimit usedCount isActive createdAt')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ codes });
});

router.post('/codes', async (req, res) => {
  const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  const percentOff = Number(req.body.percentOff);
  const useLimit = Number(req.body.useLimit);
  const expiresAt = new Date(req.body.expiresAt);
  if (!/^[A-Z0-9_-]{4,32}$/.test(code)) return res.status(400).json({ error: 'Code must be 4–32 letters, numbers, hyphens, or underscores' });
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 99) return res.status(400).json({ error: 'Discount must be between 1% and 99%' });
  if (!Number.isInteger(useLimit) || useLimit < 1 || useLimit > 100000) return res.status(400).json({ error: 'Use limit must be between 1 and 100,000' });
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) return res.status(400).json({ error: 'Expiry must be a future date' });

  try {
    const created = await PromoCode.create({ code, percentOff, expiresAt, useLimit, createdBy: req.user._id });
    res.status(201).json({ code: created });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That code already exists' });
    throw error;
  }
});

router.patch('/codes/:id/disable', async (req, res) => {
  const code = await PromoCode.findOneAndUpdate(
    { _id: req.params.id, type: 'discount' },
    { $set: { isActive: false } },
    { new: true },
  ).select('code isActive');
  if (!code) return res.status(404).json({ error: 'Discount code not found' });
  res.json({ code });
});

function questionValues(body) {
  const options = Array.isArray(body.options) ? body.options : [];
  const correctIndex = Number(body.correctIndex);
  const question = {
    courseId: typeof body.courseId === 'string' ? body.courseId.trim().slice(0, 80) : '',
    topic: typeof body.topic === 'string' ? body.topic.trim() : '',
    question: typeof body.question === 'string' ? body.question.trim() : '',
    options: options.filter(option => typeof option === 'string').map(option => option.trim()),
    correctIndex,
    explanation: typeof body.explanation === 'string' ? body.explanation.trim() : '',
    difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium',
  };

  if (!question.topic || question.topic.length > 180) return { error: 'Topic is required and must be 180 characters or fewer' };
  if (!question.question || question.question.length > 5000) return { error: 'Question is required and must be 5,000 characters or fewer' };
  if (question.options.length < 2 || question.options.length > 8 || question.options.some(option => !option || option.length > 1000)) {
    return { error: 'Provide 2–8 non-empty options, each no longer than 1,000 characters' };
  }
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= question.options.length) {
    return { error: 'Choose a correct answer from the options' };
  }
  if (question.explanation.length > 5000) return { error: 'Explanation must be 5,000 characters or fewer' };
  return { question };
}

router.get('/questions', async (req, res) => {
  const questions = await QuestionBank.find({})
    .sort({ updatedAt: -1 })
    .limit(300)
    .lean();
  res.json({ questions });
});

router.post('/questions', async (req, res) => {
  const { question, error } = questionValues(req.body);
  if (error) return res.status(400).json({ error });
  const created = await QuestionBank.create(question);
  res.status(201).json({ question: created });
});

router.put('/questions/:id', async (req, res) => {
  const { question, error } = questionValues(req.body);
  if (error) return res.status(400).json({ error });
  const updated = await QuestionBank.findByIdAndUpdate(req.params.id, { $set: question }, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ error: 'Question not found' });
  res.json({ question: updated });
});

module.exports = router;