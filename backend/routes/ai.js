const router = require('express').Router();
const { protect, requirePro } = require('../middleware/auth');
const User = require('../models/User');
const Progress = require('../models/Progress');
const StudyPointEvent = require('../models/StudyPointEvent');
const COURSES = require('../lib/coursesData');
const { reserveDailyConcept, releaseDailyConcept, FREE_DAILY_CONCEPT_LIMIT } = require('../lib/studyActivity');
const { callAI, callAIStream, isConfigured, parseJsonText } = require('../lib/gemini');
const { cacheGeneration, getCachedGeneration } = require('../lib/aiCache');

const AI_SETUP_ERROR = 'AI generation is not configured. Add GEMINI_API_KEY to the backend environment and restart the API.';
const CLEAN_DIAGRAM_FORMAT = 'Never use ASCII art, Unicode box-drawing trees, code blocks, pipe-character flowcharts, or arrow symbols to illustrate a process. Explain processes as a numbered Markdown list or a simple Markdown table.';

// Question limits by plan
const QUIZ_LIMITS = { free: 10, pro: 150, annual: 250 };
const FLASH_LIMITS = { free: 15, pro: 100, annual: 150 };

// POST /api/ai/quiz  — generate quiz questions
router.post('/quiz', protect, async (req, res) => {
  const { topic, courseId, material, count, difficulty, type } = req.body;
  const plan = req.user.plan || 'free';
  const maxQ = QUIZ_LIMITS[plan];
  const requested = Math.min(parseInt(count) || 20, maxQ);

  if (!topic && !material) return res.status(400).json({ error: 'Topic or material required' });
  if (!isConfigured()) return res.status(503).json({ error: AI_SETUP_ERROR });

  const system = `You are an expert medical educator. Generate exactly ${requested} ${type || 'Multiple Choice'} quiz questions at ${difficulty || 'Medium'} difficulty.
${courseId ? `Course context: ${courseId}` : ''}
Return ONLY a valid JSON array, no markdown, no extra text:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","difficulty":"medium","topic":"..."}]
"correct" is 0-based index. For True/False use options ["True","False"].
Make questions clinically accurate, high-yield, and exam-relevant.`;

  const userMsg = material
    ? `Study material:\n${material.slice(0, 8000)}`
    : `Generate questions about: ${topic}. Use standard medical curriculum content.`;
  const generationOptions = { system, prompt: userMsg, maxOutputTokens: 24000 };

  try {
    let raw = await getCachedGeneration('quiz', generationOptions);
    if (!raw) raw = await callAI(generationOptions);
    const questions = parseJsonText(raw);
    if (!Array.isArray(questions) || !questions.length) throw new Error('Gemini returned no quiz questions. Please try again.');
    await cacheGeneration('quiz', generationOptions, raw);

    // Track stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.quizzesCompleted': 1 } });
    await StudyPointEvent.create({ user: req.user._id, type: 'quiz', points: 10 });

    res.json({ questions, count: questions.length, plan, maxAllowed: maxQ });
  } catch (e) {
    const exhausted = e.code === 'AI_UNAVAILABLE';
    res.status(exhausted ? 503 : e.status || 500).json({ error: exhausted ? e.message : 'Failed to generate quiz: ' + e.message });
  }
});

// POST /api/ai/flashcards
router.post('/flashcards', protect, async (req, res) => {
  const { topic, courseId, material, count } = req.body;
  const plan = req.user.plan || 'free';
  const maxF = FLASH_LIMITS[plan];
  const requested = Math.min(parseInt(count) || 20, maxF);

  if (!topic && !material) return res.status(400).json({ error: 'Topic or material required' });
  if (!isConfigured()) return res.status(503).json({ error: AI_SETUP_ERROR });

  const system = `You are a medical education expert. Create exactly ${requested} high-yield flashcards.
Focus on key definitions, mechanisms, clinical pearls, mnemonics, and exam-relevant facts.
Return ONLY valid JSON array:
[{"front":"concept or question","back":"concise answer","category":"...","difficulty":"easy|medium|hard"}]`;

  const userMsg = material
    ? `Study material:\n${material.slice(0, 8000)}`
    : `Create flashcards about: ${topic}. Use standard medical/premed curriculum.`;

  try {
    const raw = await callAI({ system, prompt: userMsg, maxOutputTokens: 8000 });
    const cards = parseJsonText(raw);
    if (!Array.isArray(cards) || !cards.length) throw new Error('Gemini returned no flashcards. Please try again.');

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.flashcardsStudied': cards.length } });
    res.json({ cards, count: cards.length, plan, maxAllowed: maxF });
  } catch (e) {
    const exhausted = e.code === 'AI_UNAVAILABLE';
    res.status(exhausted ? 503 : e.status || 500).json({ error: exhausted ? e.message : 'Failed to generate flashcards: ' + e.message });
  }
});

// POST /api/ai/lesson  — streaming
router.post('/lesson', protect, async (req, res) => {
  const { topic, courseId, material, depth } = req.body;
  const previousContent = typeof req.body.previousContent === 'string' ? req.body.previousContent.slice(-12000) : '';
  if (!topic && !material) return res.status(400).json({ error: 'Topic or material required' });
  if (!isConfigured()) return res.status(503).json({ error: AI_SETUP_ERROR });
  const quota = await reserveDailyConcept(req.user._id);
  if (!quota.allowed) {
    return res.status(429).json({
      error: `The Free plan includes ${FREE_DAILY_CONCEPT_LIMIT} concept generations per day. Upgrade to Pro for unlimited lessons.`,
      remaining: 0,
      limit: FREE_DAILY_CONCEPT_LIMIT,
      upgrade: true,
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort();
  });

  const system = `You are a careful medical, science, and mathematics educator. Create a comprehensive ${depth || 'deep-dive'} lesson${topic ? ` on "${topic}"` : ''}.
Teach for durable understanding, not a short summary. Assume the learner needs a self-contained chapter: establish prerequisites, define technical vocabulary, explain the normal model before exceptions, connect each mechanism step by step to its outcomes, and distinguish established facts from useful simplifications. Be detailed and specific to the requested topic; do not pad with unrelated facts or invent sources.
${previousContent ? 'The learner paused an earlier generation. Continue from the supplied partial lesson without repeating it. Finish the interrupted section, then continue the remaining material.' : ''}
Format:
# Section Title
## Subsection
> Clinical pearl / high-yield point
- Bullet points
Regular explanatory paragraphs.
Use clean Markdown headings, paragraphs, bold text, numbered lists, bullet lists, and simple tables. ${CLEAN_DIAGRAM_FORMAT} Include learning objectives, prerequisites, foundational concepts, detailed mechanisms, pathophysiology or derivations, a fully worked example, clinical or real-world relevance, common misconceptions, retrieval questions with answers, and exam tips. For calculations, show every step and units. For clinical topics, label scenarios as educational and never present them as personal medical advice.`;

  const userMsg = previousContent
    ? `Continue this partially generated lesson without repeating its existing sections. Continue the interrupted thought and complete the remaining lesson:\n\n${previousContent}`
    : material
      ? `Study material:\n${material.slice(0, 8000)}`
      : `Teach me about: ${topic}. Use standard medical/premed curriculum.`;
  const generationOptions = { system, prompt: userMsg, maxOutputTokens: 8000 };
  const shouldCacheLesson = Boolean(topic && !material && !previousContent);

  try {
    let reachedTokenLimit = false;
    let lessonText = shouldCacheLesson ? await getCachedGeneration('lesson', generationOptions) : null;
    if (lessonText) {
      res.write(`data: ${JSON.stringify({ text: lessonText })}\n\n`);
    } else {
      lessonText = '';
      for await (const text of callAIStream(generationOptions, {
        signal: abortController.signal,
        onComplete: interaction => {
          reachedTokenLimit = (interaction.usage?.total_output_tokens || 0) >= 7900;
        },
      })) {
        if (abortController.signal.aborted) break;
        lessonText += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    if (abortController.signal.aborted) {
      await releaseDailyConcept(req.user._id);
      return;
    }

    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.lessonsGenerated': 1 } });
    await StudyPointEvent.create({ user: req.user._id, type: 'lesson', points: 5 });
    if (shouldCacheLesson && lessonText && !reachedTokenLimit) {
      await cacheGeneration('lesson', generationOptions, lessonText);
    }
    if (reachedTokenLimit) {
      res.write(`data: ${JSON.stringify({ incomplete: true })}\n\n`);
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (e) {
    await releaseDailyConcept(req.user._id).catch(() => {});
    if (abortController.signal.aborted) return;
    console.error('Lesson generation failed:', e.message);
    if (!res.writableEnded) {
      const message = e.code === 'AI_UNAVAILABLE' ? e.message : 'Lesson generation failed. Please retry in a moment.';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// POST /api/ai/tutor — Pro-only conversational teaching
router.post('/tutor', protect, requirePro, async (req, res) => {
  const messages = Array.isArray(req.body.messages)
    ? req.body.messages
      .filter(message => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
      .slice(-16)
      .map(message => ({ role: message.role, content: message.content.trim().slice(0, 4000) }))
    : [];
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Send a question to start a tutoring turn' });
  }
  if (!isConfigured()) return res.status(503).json({ error: AI_SETUP_ERROR });
  const context = typeof req.body.context === 'string' ? req.body.context.trim().slice(0, 180) : '';

  try {
    const prompt = messages.map(message => `${message.role === 'assistant' ? 'MedPrep Tutor' : 'Student'}: ${message.content}`).join('\n\n');
    const message = await callAI({
      maxOutputTokens: 3000,
      system: `You are MedPrep Tutor, a patient Socratic tutor for medical, premed, and mathematics learners. ${context ? `Current course context: ${context}.` : ''} Answer accurately and clearly, first diagnose the learner’s confusion, then explain concepts in ordered steps with a small worked example or a simple table when useful. ${CLEAN_DIAGRAM_FORMAT} Ask one focused follow-up question at the end. When a learner provides course notes, ground the explanation in those notes. Do not claim that your answer is externally source-verified and never invent citations or URLs. For clinical topics, use educational framing and do not diagnose real people.`,
      prompt,
    });
    res.json({ message });
  } catch (error) {
    const exhausted = error.code === 'AI_UNAVAILABLE';
    res.status(exhausted ? 503 : 502).json({ error: exhausted ? error.message : 'The tutor is temporarily unavailable. Please try again.' });
  }
});

// POST /api/ai/case — educational, synthetic case rounds for both tracks
router.post('/case', protect, async (req, res) => {
  const track = req.body.track === 'premed' ? 'Premed' : req.body.track === 'medical' ? 'Medical' : '';
  const course = COURSES.find(item => item.id === req.body.courseId);
  const topic = typeof req.body.topic === 'string' ? req.body.topic.trim().slice(0, 160) : '';
  if (!track || !course || course.cat !== track || !topic) {
    return res.status(400).json({ error: 'Choose a course and topic in the selected study track' });
  }
  if (!isConfigured()) return res.status(503).json({ error: AI_SETUP_ERROR });

  try {
    const raw = await callAI({
      maxOutputTokens: 5000,
      system: `Create a synthetic educational ${track.toLowerCase()} case round for a student studying ${course.title}, focused on ${topic}. This is coursework, not guidance for a real patient. Use a short, plausible vignette and 3 progressive decision steps. For premed courses, use a clinical or laboratory context to teach foundational biology, chemistry, physics, psychology, or mathematics. Make explanations rigorous, teach the underlying concepts, and do not invent citations. ${CLEAN_DIAGRAM_FORMAT} Return only valid JSON with this shape: {"title":"...","caseStem":"...","learningObjectives":["..."],"illustration":"A short numbered Markdown list describing a process, or an empty string","steps":[{"prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}],"debrief":"..."}. Include exactly 3 steps, each with 4 options and detailed rationales.`,
      prompt: `Track: ${track}\nCourse: ${course.title}\nTopic: ${topic}\nCreate the case now.`,
    });
    const caseStudy = parseJsonText(raw);
    if (!Array.isArray(caseStudy.steps) || caseStudy.steps.length !== 3 || caseStudy.steps.some(step => !Array.isArray(step.options) || step.options.length !== 4 || !Number.isInteger(step.correctIndex) || !step.explanation)) {
      return res.status(502).json({ error: 'The case did not meet the expected format. Please generate another.' });
    }
    res.json({ caseStudy, course: course.title, topic, track: track.toLowerCase() });
  } catch (error) {
    const exhausted = error.code === 'AI_UNAVAILABLE';
    res.status(exhausted ? 503 : 502).json({ error: exhausted ? error.message : 'Could not generate this case. Please try again.' });
  }
});

// POST /api/ai/save-progress
router.post('/save-progress', protect, async (req, res) => {
  const { courseId, topic, type, score, total } = req.body;
  await Progress.create({ user: req.user._id, courseId, topic, type, score, total, completed: true });
  res.json({ saved: true });
});

module.exports = router;
