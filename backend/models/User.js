const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 6 },
  plan:      { type: String, enum: ['free', 'pro', 'annual'], default: 'free' },
  role:      { type: String, enum: ['student', 'admin'], default: 'student' },
  avatar:    { type: String, default: '' },
  bio:       { type: String, default: '' },
  school:    { type: String, default: '' },
  year:      { type: String, default: '' },
  // Billing
  paystackCustomerId:   String,
  planExpiresAt:        Date,
  // Preferences
  preferences: {
    theme:           { type: String, default: 'dark' },
    emailNotifications: { type: Boolean, default: true },
    studyReminders:     { type: Boolean, default: false },
    defaultQuizCount:   { type: Number, default: 20 },
    defaultFlashCount:  { type: Number, default: 20 },
  },
  // Stats
  stats: {
    quizzesCompleted:   { type: Number, default: 0 },
    flashcardsStudied:  { type: Number, default: 0 },
    lessonsGenerated:   { type: Number, default: 0 },
    dailyConceptsUsed:  { type: Number, default: 0 },
    dailyConceptsDate:  { type: String, default: '' },
    totalScore:         { type: Number, default: 0 },
    streak:             { type: Number, default: 0 },
    lastStudied:        Date,
  },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function(pw) {
  return bcrypt.compare(pw, this.password);
};

userSchema.methods.toPublic = function() {
  const o = this.toObject();
  delete o.password;
  return o;
};

module.exports = mongoose.model('User', userSchema);
