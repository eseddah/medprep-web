const router = require('express').Router();
const { protect } = require('../middleware/auth');

// Courses are defined in frontend but served here for SSR/API consumers
const COURSES = require('../lib/coursesData');

router.get('/', protect, (req, res) => {
  const isPro = ['pro', 'annual'].includes(req.user.plan);
  const courses = COURSES.map(c => ({
    ...c,
    locked: !c.free && !isPro,
  }));
  res.json({ courses, plan: req.user.plan });
});

router.get('/:id', protect, (req, res) => {
  const course = COURSES.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const isPro = ['pro', 'annual'].includes(req.user.plan);
  if (!course.free && !isPro) return res.status(403).json({ error: 'Pro plan required', upgrade: true });
  res.json({ course });
});

module.exports = router;
