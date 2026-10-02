const mongoose = require('mongoose');

const studyPointEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['quiz', 'lesson'], required: true },
  points: { type: Number, required: true, min: 1 },
}, { timestamps: true });

studyPointEventSchema.index({ createdAt: 1, user: 1 });

module.exports = mongoose.model('StudyPointEvent', studyPointEventSchema);