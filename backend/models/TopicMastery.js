const mongoose = require('mongoose');

const topicMasterySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, default: '' },
  topic: { type: String, required: true },
  attempts: [{
    correct: { type: Boolean, required: true },
    reviewed: { type: Boolean, default: false },
    at: { type: Date, required: true },
  }],
  totalAttempts: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

topicMasterySchema.index({ user: 1, courseId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('TopicMastery', topicMasterySchema);