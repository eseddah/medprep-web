const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const { protect, requirePro } = require('../middleware/auth');
const User = require('../models/User');
const Progress = require('../models/Progress');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Question limits by plan
const QUIZ_LIMITS = { free: 10, pro: 100, annual: 150 };
const FLASH_LIMITS = { free: 15, pro: 100, annual: 150 };

// POST /api/ai/quiz  — generate quiz questions
router.post('/quiz', protect, async (req, res) => {
  const { topic, courseId, material, count, difficulty, type } = req.body;
  const plan = req.user.plan || 'free';
  const maxQ = QUIZ_LIMITS[plan];
  const requested = Math.min(parseInt(count) || 20, maxQ);

  if (!topic && !material) return res.status(400).json({ error: 'Topic or material required' });

  const system = `You are an expert medical educator. Generate exactly ${requested} ${type || 'Multiple Choice'} quiz questions at ${difficulty || 'Medium'} difficulty.
${courseId ? `Course context: ${courseId}` : ''}
Return ONLY a valid JSON array, no markdown, no extra text:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","difficulty":"medium","topic":"..."}]
"correct" is 0-based index. For True/False use options ["True","False"].
Make questions clinically accurate, high-yield, and exam-relevant.`;

  const userMsg = material
    ? `Study material:\n${material.slice(0, 8000)}`
    : `Generate questions about: ${topic}. Use standard medical curriculum content.`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });
    const raw = msg.content[0].text.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(raw);

    // Track stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.quizzesCompleted': 1 } });

    res.json({ questions, count: questions.length, plan, maxAllowed: maxQ });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate quiz: ' + e.message });
  }
});

// POST /api/ai/flashcards
router.post('/flashcards', protect, async (req, res) => {
  const { topic, courseId, material, count } = req.body;
  const plan = req.user.plan || 'free';
  const maxF = FLASH_LIMITS[plan];
  const requested = Math.min(parseInt(count) || 20, maxF);

  if (!topic && !material) return res.status(400).json({ error: 'Topic or material required' });

  const system = `You are a medical education expert. Create exactly ${requested} high-yield flashcards.
Focus on key definitions, mechanisms, clinical pearls, mnemonics, and exam-relevant facts.
Return ONLY valid JSON array:
[{"front":"concept or question","back":"concise answer","category":"...","difficulty":"easy|medium|hard"}]`;

  const userMsg = material
    ? `Study material:\n${material.slice(0, 8000)}`
    : `Create flashcards about: ${topic}. Use standard medical/premed curriculum.`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });
    const raw = msg.content[0].text.replace(/```json|```/g, '').trim();
    const cards = JSON.parse(raw);

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.flashcardsStudied': cards.length } });
    res.json({ cards, count: cards.length, plan, maxAllowed: maxF });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate flashcards: ' + e.message });
  }
});

// POST /api/ai/lesson  — streaming
router.post('/lesson', protect, async (req, res) => {
  const { topic, courseId, material, depth } = req.body;
  if (!topic && !material) return res.status(400).json({ error: 'Topic or material required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const system = `You are an expert medical educator. Create a ${depth || 'standard'} structured lesson${topic ? ` on "${topic}"` : ''}.
Format:
# Section Title
## Subsection
> Clinical pearl / high-yield point
- Bullet points
Regular paragraphs.
Include: mechanisms, pathophysiology, clinical relevance, mnemonics, exam tips. Be thorough.`;

  const userMsg = material
    ? `Study material:\n${material.slice(0, 8000)}`
    : `Teach me about: ${topic}. Use standard medical/premed curriculum.`;

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      stream: true,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.lessonsGenerated': 1 } });
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
});

// POST /api/ai/save-progress
router.post('/save-progress', protect, async (req, res) => {
  const { courseId, topic, type, score, total } = req.body;
  await Progress.create({ user: req.user._id, courseId, topic, type, score, total, completed: true });
  res.json({ saved: true });
});

module.exports = router;
