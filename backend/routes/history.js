const router = require('express').Router();
const { protect } = require('../middleware/auth');
const StudyHistory = require('../models/StudyHistory');

const SECTIONS = new Set(['quiz', 'flashcards', 'lesson', 'course-lesson', 'case', 'tutor', 'review']);
router.use(protect);

router.get('/', async (req, res) => {
  const section = typeof req.query.section === 'string' ? req.query.section : '';
  if (!SECTIONS.has(section)) return res.status(400).json({ error: 'Choose a valid history section' });
  const entries = await StudyHistory.find({ user: req.user._id, section })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('section title prompt response createdAt')
    .lean();
  res.json({ entries });
});

router.post('/', async (req, res) => {
  const { section, title, prompt, response } = req.body;
  if (!SECTIONS.has(section)) return res.status(400).json({ error: 'Choose a valid history section' });
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 180) {
    return res.status(400).json({ error: 'History title is required and must be 180 characters or fewer' });
  }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.trim().length > 2000) {
    return res.status(400).json({ error: 'History prompt is required and must be 2,000 characters or fewer' });
  }
  if (typeof response !== 'string' || !response.trim() || response.length > 1000000) {
    return res.status(400).json({ error: 'History response is empty or too large' });
  }

  const entry = await StudyHistory.create({
    user: req.user._id,
    section,
    title: title.trim(),
    prompt: prompt.trim(),
    response,
  });
  res.status(201).json({ entry });
});

router.delete('/:id', async (req, res) => {
  const deleted = await StudyHistory.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) return res.status(404).json({ error: 'History entry not found' });
  res.json({ deleted: true });
});

module.exports = router;
