const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/settings
router.get('/', protect, (req, res) => {
  res.json({
    profile: { name: req.user.name, email: req.user.email, bio: req.user.bio, school: req.user.school, year: req.user.year, avatar: req.user.avatar },
    preferences: req.user.preferences,
    plan: req.user.plan,
    stats: req.user.stats,
    createdAt: req.user.createdAt,
  });
});

// All mutations handled in /api/users routes
module.exports = router;
