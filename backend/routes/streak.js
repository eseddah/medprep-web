const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getStreakSnapshot, recordStreakActivity } = require('../lib/streaks');

router.get('/', protect, (req, res) => {
  res.json(getStreakSnapshot(req.user));
});

router.post('/activity', protect, async (req, res) => {
  res.json(await recordStreakActivity(req.user._id));
});

module.exports = router;