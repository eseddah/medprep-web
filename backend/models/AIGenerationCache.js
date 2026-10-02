const mongoose = require('mongoose');

const aiGenerationCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true },
  kind: { type: String, enum: ['course-topic', 'lesson', 'quiz'], required: true },
  content: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

aiGenerationCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AIGenerationCache', aiGenerationCacheSchema);