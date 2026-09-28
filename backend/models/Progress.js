const mongoose = require('mongoose');
const progressSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:   { type: String, required: true },
  topic:      { type: String, required: true },
  type:       { type: String, enum: ['quiz', 'flashcard', 'lesson'], required: true },
  score:      Number,
  total:      Number,
  completed:  { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Progress', progressSchema);
