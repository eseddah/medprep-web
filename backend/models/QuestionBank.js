const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  courseId: { type: String, default: '', trim: true, maxlength: 80 },
  topic: { type: String, required: true, trim: true, maxlength: 180 },
  question: { type: String, required: true, trim: true, maxlength: 5000 },
  options: { type: [String], required: true, validate: value => value.length >= 2 && value.length <= 8 },
  correctIndex: { type: Number, required: true, min: 0 },
  explanation: { type: String, default: '', trim: true, maxlength: 5000 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

questionBankSchema.index({ courseId: 1, topic: 1, isActive: 1 });

module.exports = mongoose.model('QuestionBank', questionBankSchema);