const crypto = require('crypto');
const AIGenerationCache = require('../models/AIGenerationCache');
const { getGeminiModels } = require('./gemini');

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function makeCacheKey(kind, options) {
  const identity = JSON.stringify({
    kind,
    models: getGeminiModels(),
    system: options.system || '',
    prompt: options.prompt || '',
    maxOutputTokens: options.maxOutputTokens || 0,
  });
  return crypto.createHash('sha256').update(identity).digest('hex');
}

async function getCachedGeneration(kind, options) {
  try {
    const record = await AIGenerationCache.findOne({ cacheKey: makeCacheKey(kind, options), expiresAt: { $gt: new Date() } }).lean();
    return record?.content || null;
  } catch (error) {
    console.warn(`[AI cache] read failed kind=${kind}: ${error.message}`);
    return null;
  }
}

async function cacheGeneration(kind, options, content) {
  try {
    await AIGenerationCache.updateOne(
      { cacheKey: makeCacheKey(kind, options) },
      {
        $set: { kind, content, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
        $setOnInsert: { cacheKey: makeCacheKey(kind, options) },
      },
      { upsert: true },
    );
  } catch (error) {
    console.warn(`[AI cache] write failed kind=${kind}: ${error.message}`);
  }
}

module.exports = { cacheGeneration, getCachedGeneration };