const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const AI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const DEFAULT_MODEL = AI_MODELS[0];
const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];
const FRIENDLY_ERROR = 'AI generation is temporarily unavailable. Please try again in a moment.';

function isConfigured() {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
  return Boolean(key && !/your_|placeholder|\.\.\.|<.*>/i.test(key));
}

function getApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
}

function getModel() {
  return DEFAULT_MODEL;
}

function getGeminiModels() {
  return [...new Set(AI_MODELS.filter(Boolean))];
}

function shouldRetryAiError(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return error?.status === 429
    || error?.status === 503
    || /(429|503|overloaded|high demand|timeout|timed out|etimedout|deadline exceeded)/i.test(text);
}

function isModelNotFound(error) {
  return error?.status === 404
    || /not[_\s-]?found/i.test(error?.code || '')
    || /model[^\n]*not found|not found[^\n]*model/i.test(error?.message || '');
}

function logGeminiFailure(error, model, attempt) {
  console.error(`[Gemini] request failed status=${error?.status ?? 'unknown'} model=${model} attempt=${attempt}/${MAX_ATTEMPTS}: ${error?.message || 'Unknown error'}`);
}

function finalAiError(cause) {
  const error = new Error(FRIENDLY_ERROR);
  error.code = 'AI_UNAVAILABLE';
  error.status = 503;
  error.cause = cause;
  return error;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function responseText(interaction) {
  const payload = interaction?.interaction || interaction || {};

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const result = [];
  const candidates = payload.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || candidate?.parts || [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        result.push(part.text.trim());
      }
    }
  }
  if (result.length) return result.join('\n');

  return (payload.steps || [])
    .filter(step => step?.type === 'model_output')
    .flatMap(step => step.content || [])
    .filter(part => part?.type === 'text' && typeof part.text === 'string' && part.text.trim())
    .map(part => part.text.trim())
    .join('\n');
}

function requestBody({ system, prompt, maxOutputTokens, stream, model }) {
  return {
    model: model || getModel(),
    input: prompt,
    system_instruction: system,
    store: false,
    ...(stream ? { stream: true } : {}),
    ...(maxOutputTokens ? { generation_config: { max_output_tokens: maxOutputTokens } } : {}),
  };
}

async function requestGemini(options, { stream = false, signal, model } = {}) {
  if (!isConfigured()) {
    const error = new Error('Gemini is not configured. Add GEMINI_API_KEY to the backend environment and restart the API.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  let response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}${stream ? '?alt=sse' : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': getApiKey(),
      },
      body: JSON.stringify(requestBody({ ...options, stream, model })),
      signal: signal || AbortSignal.timeout(120000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    const timedOut = error?.name === 'TimeoutError' || error?.code === 'ETIMEDOUT' || /timed out|timeout/i.test(error?.message || '');
    const unavailable = new Error(error?.message || 'Gemini could not be reached.');
    unavailable.code = timedOut ? 'GEMINI_TIMEOUT' : 'GEMINI_UNAVAILABLE';
    unavailable.status = error?.status;
    unavailable.cause = error;
    throw unavailable;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error?.message || `Gemini request failed (HTTP ${response.status})`;
    const error = new Error(message);
    error.code = 'GEMINI_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  return response;
}

async function generateText(options = {}) {
  const response = await requestGemini(options, { model: options.model || getModel() });
  const interaction = await response.json();
  const text = responseText(interaction);
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  return text;
}

async function callAI(options = {}) {
  const models = getGeminiModels();
  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await generateText({ ...options, model });
      } catch (error) {
        lastError = error;
        logGeminiFailure(error, model, attempt);
        if (error?.code === 'GEMINI_NOT_CONFIGURED') throw error;
        if (isModelNotFound(error) || !shouldRetryAiError(error) || attempt === MAX_ATTEMPTS) break;
        const delay = RETRY_DELAYS_MS[attempt - 1] + Math.floor(Math.random() * 251);
        await sleep(delay);
      }
    }
  }

  throw finalAiError(lastError);
}

async function* callAIStream(options = {}, { signal, onComplete } = {}) {
  const models = getGeminiModels();
  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        let generated = '';
        for await (const chunk of streamText({ ...options, model }, { signal, onComplete })) {
          generated += chunk;
        }
        if (!generated.trim()) throw new Error('Gemini returned an empty response.');
        yield generated;
        return;
      } catch (error) {
        lastError = error;
        if (signal?.aborted) throw error;
        logGeminiFailure(error, model, attempt);
        if (error?.code === 'GEMINI_NOT_CONFIGURED') throw error;
        if (isModelNotFound(error) || !shouldRetryAiError(error) || attempt === MAX_ATTEMPTS) break;
        const delay = RETRY_DELAYS_MS[attempt - 1] + Math.floor(Math.random() * 251);
        await sleep(delay);
      }
    }
  }

  throw finalAiError(lastError);
}

async function* streamText(options, { signal, onComplete } = {}) {
  const response = await requestGemini(options, { stream: true, signal });
  if (!response.body) throw new Error('Gemini returned an empty stream. Please try again.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consumeEvent = function* (eventBlock) {
    const data = eventBlock.split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data || data === '[DONE]') return;
    const event = JSON.parse(data);
    if (event.event_type === 'error') {
      const error = new Error(event.error?.message || 'Gemini generation failed.');
      error.status = event.error?.status || event.error?.code;
      error.code = event.error?.code;
      throw error;
    }
    if (event.event_type === 'step.delta' && event.delta?.type === 'text' && event.delta.text) {
      yield event.delta.text;
    }
    if (event.event_type === 'interaction.completed') onComplete?.(event.interaction || {});
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      for (const eventBlock of events) {
        yield* consumeEvent(eventBlock);
      }
      if (done) {
        if (buffer.trim()) yield* consumeEvent(buffer);
        break;
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function parseJsonText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }

  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!unfenced) {
    throw new Error('Gemini returned an empty JSON response. Please try again.');
  }

  const start = Math.min(...['[', '{'].map(character => {
    const index = unfenced.indexOf(character);
    return index < 0 ? Number.POSITIVE_INFINITY : index;
  }));
  const end = Math.max(unfenced.lastIndexOf(']'), unfenced.lastIndexOf('}'));
  if (!Number.isFinite(start) || end < start) {
    throw new Error('Gemini returned invalid JSON. Please try again.');
  }

  try {
    return JSON.parse(unfenced.slice(start, end + 1));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON parse failed';
    throw new Error(`Gemini returned invalid JSON: ${message}. Please try again.`);
  }
}

module.exports = {
  AI_MODELS,
  DEFAULT_MODEL,
  callAI,
  callAIStream,
  generateText,
  getGeminiModels,
  getModel,
  isConfigured,
  parseJsonText,
  streamText,
};