const envFile = require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }).parsed || {};

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODELS = require('../lib/gemini').getGeminiModels();
const apiKey = envFile.GEMINI_API_KEY?.trim()
  || envFile.GOOGLE_API_KEY?.trim()
  || process.env.GEMINI_API_KEY?.trim()
  || process.env.GOOGLE_API_KEY?.trim();

function safeMessage(message) {
  return String(message || 'No provider message returned')
    .replace(/\s+/g, ' ')
    .replaceAll(apiKey || '\0', '[REDACTED]');
}

async function testModel(model) {
  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        input: 'Reply with the single word OK.',
        system_instruction: 'You are a connectivity test. Do not provide additional text.',
        store: false,
        generation_config: { max_output_tokens: 8 },
      }),
      signal: AbortSignal.timeout(60000),
    });

    const payload = await response.json().catch(() => ({}));
    const status = response.status;
    const message = response.ok
      ? 'Gemini request succeeded'
      : safeMessage(payload.error?.message || `Gemini request failed (HTTP ${status})`);
    console.log(`model=${model} status=${status} message=${message}`);
    return response.ok;
  } catch (error) {
    const status = error.status || error.cause?.status || 'no HTTP response';
    console.log(`model=${model} status=${status} message=${safeMessage(error.message)}`);
    return false;
  }
}

async function main() {
  if (!apiKey || /your_|placeholder|\.\.\.|<.*>/i.test(apiKey)) {
    console.error('Gemini key is missing or still a placeholder in backend/.env. No key value was printed.');
    process.exitCode = 1;
    return;
  }

  if (typeof fetch !== 'function') {
    console.error('This script requires Node.js 18 or newer for built-in fetch.');
    process.exitCode = 1;
    return;
  }

  let working = 0;
  for (const model of MODELS) {
    if (await testModel(model)) working += 1;
  }

  console.log(`Gemini model probe complete: ${working}/${MODELS.length} models succeeded.`);
  if (working === 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(`Gemini model probe failed: ${safeMessage(error.message)}`);
  process.exitCode = 1;
});
