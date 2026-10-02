const router = require('express').Router();
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const StudyPointEvent = require('../models/StudyPointEvent');

const PUBLIC_LOUNGE = {
  id: 'study-lounge',
  name: 'Study Lounge',
  description: 'Open to all signed-in MedPrep students',
  memberCount: null,
  joined: true,
  isDiscoverable: true,
  isSystem: true,
};

function presentRoom(room, userId) {
  const joined = room.members.some(member => member.toString() === userId.toString());
  return {
    id: room._id.toString(),
    name: room.name,
    description: room.description,
    memberCount: room.members.length,
    joined,
    isDiscoverable: room.isDiscoverable,
    inviteCode: joined ? room.joinCode : undefined,
    isSystem: false,
  };
}

router.get('/leaderboard', protect, async (req, res) => {
  const period = req.query.period === 'weekly' ? 'weekly' : 'all-time';
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (period === 'all-time') {
    const users = await User.find({ isDeleted: false })
      .select('name avatar activityDates stats.quizzesCompleted stats.lessonsGenerated stats.totalStudyDays')
      .lean();
    const entries = users.map(user => ({
      name: user.name || 'Student',
      avatar: user.avatar || '',
      points: (user.stats?.quizzesCompleted || 0) * 10
        + (user.stats?.lessonsGenerated || 0) * 5
        + (user.stats?.totalStudyDays ?? user.activityDates?.length ?? 0) * 2,
    })).filter(entry => entry.points > 0)
      .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
      .slice(0, 50)
      .map((entry, index) => ({ rank: index + 1, ...entry }));
    return res.json({ period, entries });
  }

  const weekday = (now.getUTCDay() + 6) % 7;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - weekday));
  const weekStartKey = weekStart.toISOString().slice(0, 10);
  const weeklyEvents = await StudyPointEvent.aggregate([
    { $match: { createdAt: { $gte: weekStart } } },
    { $group: { _id: '$user', points: { $sum: '$points' } } },
  ]);
  const eventPoints = new Map(weeklyEvents.map(event => [event._id.toString(), event.points]));
  const users = await User.find({
    isDeleted: false,
    $or: [
      { _id: { $in: weeklyEvents.map(event => event._id) } },
      { activityDates: { $elemMatch: { $gte: weekStartKey, $lte: today } } },
    ],
  }).select('name avatar activityDates').lean();
  const entries = users.map(user => {
    const activeDays = (user.activityDates || []).filter(date => date >= weekStartKey && date <= today).length;
    return {
      name: user.name || 'Student',
      avatar: user.avatar || '',
      points: (eventPoints.get(user._id.toString()) || 0) + activeDays * 2,
    };
  }).filter(entry => entry.points > 0)
    .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
    .slice(0, 50)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
  res.json({ period, entries });
});

router.get('/rooms', protect, async (req, res) => {
  const memberships = await ChatRoom.find({ members: req.user._id }).sort({ updatedAt: -1 }).limit(100);
  const memberIds = memberships.map(room => room._id);
  const discoverable = await ChatRoom.find({
    isDiscoverable: true,
    _id: { $nin: memberIds },
  }).sort({ updatedAt: -1 }).limit(100);

  res.json({ rooms: [PUBLIC_LOUNGE, ...memberships.map(room => presentRoom(room, req.user._id)), ...discoverable.map(room => presentRoom(room, req.user._id))] });
});

router.post('/rooms', protect, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Group name must be 2–60 characters' });
  if (description.length > 240) return res.status(400).json({ error: 'Description must be 240 characters or fewer' });

  const room = await ChatRoom.create({
    name,
    description,
    createdBy: req.user._id,
    members: [req.user._id],
    isDiscoverable: req.body.isDiscoverable !== false,
    joinCode: crypto.randomBytes(5).toString('hex').toUpperCase(),
  });

  res.status(201).json({ room: presentRoom(room, req.user._id) });
});

router.post('/rooms/join', protect, async (req, res) => {
  const joinCode = typeof req.body.joinCode === 'string' ? req.body.joinCode.trim().toUpperCase() : '';
  const roomId = typeof req.body.roomId === 'string' ? req.body.roomId.trim() : '';
  let room;

  if (joinCode) {
    room = await ChatRoom.findOne({ joinCode });
  } else if (roomId) {
    try { room = await ChatRoom.findById(roomId); } catch { room = null; }
    if (room && !room.isDiscoverable && !room.members.some(member => member.toString() === req.user._id.toString())) {
      return res.status(404).json({ error: 'Private group requires an invite code' });
    }
  }

  if (!room) return res.status(404).json({ error: 'Group not found or invite code is invalid' });
  await ChatRoom.updateOne({ _id: room._id }, { $addToSet: { members: req.user._id } });
  room = await ChatRoom.findById(room._id);
  res.json({ room: presentRoom(room, req.user._id) });
});

module.exports = router;
