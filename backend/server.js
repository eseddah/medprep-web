require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./lib/db');

const app = express();
connectDB();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

// Raw body for Stripe webhooks BEFORE json parser
app.use('/api/billing/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));

const apiLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const aiLimit  = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Too many AI requests, please wait.' } });
app.use('/api/', apiLimit);
app.use('/api/ai/', aiLimit);

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
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
app.listen(PORT, () => console.log(`🚀 MedPrep API → http://localhost:${PORT}`));
