const ADMIN_EMAILS = ['edmondeddah999@gmail.com'];
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function isAdminAccount(user) {
  const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
  return user?.emailVerified === true && ADMIN_EMAILS.includes(email);
}

async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Admin access required' });

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select('_id email emailVerified isDeleted');
    if (!user || user.isDeleted || !isAdminAccount(user)) return res.status(403).json({ error: 'Admin access required' });
    req.user = user;
    next();
  } catch {
    res.status(403).json({ error: 'Admin access required' });
  }
}

module.exports = { ADMIN_EMAILS, isAdminAccount, requireAdmin };