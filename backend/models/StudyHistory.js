const mongoose = require('mongoose');

const studyHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  section: { type: String, enum: ['quiz', 'flashcards', 'lesson', 'course-lesson', 'case', 'tutor', 'review'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  prompt: { type: String, required: true, trim: true, maxlength: 2000 },
  response: { type: String, required: true, maxlength: 1000000 },
}, { timestamps: true });

studyHistorySchema.index({ user: 1, section: 1, createdAt: -1 });

module.exports = mongoose.model('StudyHistory', studyHistorySchema);
