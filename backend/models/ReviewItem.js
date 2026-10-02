const mongoose = require('mongoose');

const reviewItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceKey: { type: String, required: true },
  type: { type: String, enum: ['question', 'flashcard'], required: true },
  courseId: { type: String, default: '' },
  topic: { type: String, required: true },
  prompt: { type: String, required: true, maxlength: 5000 },
  options: { type: [String], default: [] },
  correctIndex: { type: Number, default: -1 },
  answer: { type: String, default: '', maxlength: 5000 },
  explanation: { type: String, default: '', maxlength: 5000 },
  easeFactor: { type: Number, default: 2.5, min: 1.3 },
  intervalDays: { type: Number, default: 0, min: 0 },
  repetitions: { type: Number, default: 0, min: 0 },
  dueAt: { type: Date, default: Date.now, index: true },
  lastReviewedAt: { type: Date, default: null },
}, { timestamps: true });

reviewItemSchema.index({ user: 1, sourceKey: 1 }, { unique: true });
reviewItemSchema.index({ user: 1, dueAt: 1 });

module.exports = mongoose.model('ReviewItem', reviewItemSchema);