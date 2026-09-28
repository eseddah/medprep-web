require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./lib/db');
const User = require('./models/User');
const ChatMessage = require('./models/ChatMessage');
const ChatRoom = require('./models/ChatRoom');

const app = express();
connectDB();

app.use(helmet());
const localDevOrigins = process.env.NODE_ENV === 'production' ? [] : [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];
const clientOrigins = new Set([
  process.env.CLIENT_URL || 'http://localhost:3000',
  ...(process.env.CLIENT_URLS || '').split(','),
  ...localDevOrigins,
].map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: [...clientOrigins], credentials: true } });

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select('_id name avatar isDeleted');
    if (!user || user.isDeleted) return next(new Error('Account is not available'));
    socket.data.member = { id: user._id.toString(), name: user.name, avatar: user.avatar || '' };
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  socket.join('study-lounge');

  socket.on('chat:join', async (payload, acknowledge) => {
    if (typeof acknowledge !== 'function') return;
    const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
    let roomName = 'Study Lounge';

    if (roomId !== 'study-lounge') {
      let room;
      try { room = await ChatRoom.findOne({ _id: roomId, members: socket.data.member.id }).select('name members'); } catch {}
      if (!room) return acknowledge({ ok: false, error: 'Join this group before opening its messages' });
      roomName = room.name;
      const channel = `chat-room:${roomId}`;
      socket.join(channel);
      io.to(channel).emit('chat:members', { roomId, memberCount: room.members.length });
    }

    try {
      const records = await ChatMessage.find({ room: roomId })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('sender', 'name avatar')
        .lean();
      acknowledge({ ok: true, room: { id: roomId, name: roomName }, messages: records.reverse().map(toPublicMessage) });
    } catch {
      acknowledge({ ok: false, error: 'Could not load chat history' });
    }
  });

  socket.on('chat:leave', (payload) => {
    const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
    if (roomId === 'study-lounge') socket.leave('study-lounge');
    else if (roomId) socket.leave(`chat-room:${roomId}`);
  });

  socket.on('chat:history', async (acknowledge) => {
    if (typeof acknowledge !== 'function') return;
    try {
      const records = await ChatMessage.find({ room: 'study-lounge' })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('sender', 'name avatar')
        .lean();
      acknowledge({ ok: true, messages: records.reverse().map(toPublicMessage) });
    } catch {
      acknowledge({ ok: false, error: 'Could not load chat history' });
    }
  });

  socket.on('chat:send', async (payload, acknowledge) => {
    const respond = typeof acknowledge === 'function' ? acknowledge : () => {};
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    const roomId = typeof payload?.roomId === 'string' ? payload.roomId : 'study-lounge';
    if (!text) return respond({ ok: false, error: 'Write a message before sending' });
    if (text.length > 2000) return respond({ ok: false, error: 'Messages must be 2,000 characters or fewer' });
    if (Date.now() - (socket.data.lastMessageAt || 0) < 750) return respond({ ok: false, error: 'Please wait a moment before sending again' });
    const channel = roomId === 'study-lounge' ? 'study-lounge' : `chat-room:${roomId}`;
    if (!socket.rooms.has(channel)) return respond({ ok: false, error: 'Join this group before sending messages' });
    if (roomId !== 'study-lounge') {
      let membership;
      try { membership = await ChatRoom.exists({ _id: roomId, members: socket.data.member.id }); } catch {}
      if (!membership) return respond({ ok: false, error: 'You are no longer a member of this group' });
    }
    socket.data.lastMessageAt = Date.now();

    try {
      const record = await ChatMessage.create({ room: roomId, sender: socket.data.member.id, text });
      const message = await ChatMessage.findById(record._id).populate('sender', 'name avatar').lean();
      const publicMessage = toPublicMessage(message);
      io.to(channel).emit('chat:new', publicMessage);
      respond({ ok: true, id: publicMessage.id });
    } catch {
      respond({ ok: false, error: 'Message could not be sent' });
    }
  });
});

function toPublicMessage(message) {
  return {
    id: message._id.toString(),
    roomId: message.room,
    text: message.text,
    createdAt: message.createdAt,
    sender: {
      id: message.sender?._id?.toString() || '',
      name: message.sender?.name || 'Student',
      avatar: message.sender?.avatar || '',
    },
  };
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || clientOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));

const apiLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const aiLimit  = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Too many AI requests, please wait.' } });
app.use('/api/', apiLimit);
app.use('/api/ai/', aiLimit);

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/chat',     require('./routes/chat'));
app.use('/api/courses',  require('./routes/courses'));
app.use('/api/ai',       require('./routes/ai'));
app.use('/api/billing',  require('./routes/billing'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 MedPrep API → http://localhost:${PORT}`));
