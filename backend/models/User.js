const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  emailVerified: { type: Boolean, default: false },
  password:  { type: String, required: true, minlength: 6 },
  plan:      { type: String, enum: ['free', 'pro', 'annual'], default: 'free' },
  avatar:    { type: String, default: '' },
  bio:       { type: String, default: '' },
  school:    { type: String, default: '' },
  year:      { type: String, default: '' },
  timezone:  { type: String, default: 'Africa/Accra' },
  currentStreak:   { type: Number, default: 0 },
  longestStreak:   { type: Number, default: 0 },
  lastActivityDate: { type: String, default: '' },
  activityDates:   { type: [String], default: [] },
  studyReminderSentDate: { type: String, default: '' },
  studyReminderLockUntil: { type: Date, default: null },
  studyReminderLockToken: { type: String, default: '' },
  // Billing
  paystackCustomerId:   String,
  planExpiresAt:        Date,
  // Preferences
  preferences: {
    theme:           { type: String, default: 'dark' },
    emailNotifications: { type: Boolean, default: false },
    studyReminders:     { type: Boolean, default: false },
    defaultQuizCount:   { type: Number, default: 20 },
    defaultFlashCount:  { type: Number, default: 20 },
  },
  // Stats
  stats: {
    quizzesCompleted:   { type: Number, default: 0 },
    flashcardsStudied:  { type: Number, default: 0 },
    lessonsGenerated:   { type: Number, default: 0 },
    totalStudyDays:     { type: Number, default: 0 },
    dailyConceptsUsed:  { type: Number, default: 0 },
    dailyConceptsDate:  { type: String, default: '' },
    totalScore:         { type: Number, default: 0 },
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
  delete o.emailVerified;
  delete o.role;
  delete o.studyReminderSentDate;
  delete o.studyReminderLockUntil;
  delete o.studyReminderLockToken;
  return o;
};

module.exports = mongoose.model('User', userSchema);
