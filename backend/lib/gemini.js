const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_MODEL = 'gemini-3.8-flash';

function isConfigured() {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
  return Boolean(key && !/your_|placeholder|\.\.\.|<.*>/i.test(key));
}

function getApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
}

function getModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function responseText(interaction) {
  interaction = interaction.interaction || interaction;
  if (typeof interaction.output_text === 'string') return interaction.output_text;
  return (interaction.steps || [])
    .filter(step => step.type === 'model_output')
    .flatMap(step => step.content || [])
    .filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n');
}

function requestBody({ system, prompt, maxOutputTokens, stream }) {
  return {
    model: getModel(),
    input: prompt,
    system_instruction: system,
    store: false,
    ...(stream ? { stream: true } : {}),
    ...(maxOutputTokens ? { generation_config: { max_output_tokens: maxOutputTokens } } : {}),
  };
}

async function requestGemini(options, { stream = false, signal } = {}) {
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
      body: JSON.stringify(requestBody({ ...options, stream })),
      signal: signal || AbortSignal.timeout(120000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    const unavailable = new Error('Gemini could not be reached. Check the API connection and try again.');
    unavailable.code = 'GEMINI_UNAVAILABLE';
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

async function generateText(options) {
  const response = await requestGemini(options);
  const interaction = await response.json();
  const text = responseText(interaction);
  if (!text) throw new Error('Gemini returned no text. Please try again.');
  return text;
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
      throw new Error(event.error?.message || 'Gemini generation failed. Please retry.');
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
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = Math.min(...['[', '{'].map(character => {
    const index = unfenced.indexOf(character);
    return index < 0 ? Number.POSITIVE_INFINITY : index;
  }));
  const end = Math.max(unfenced.lastIndexOf(']'), unfenced.lastIndexOf('}'));
  if (!Number.isFinite(start) || end < start) throw new Error('Gemini returned invalid JSON. Please try again.');
  return JSON.parse(unfenced.slice(start, end + 1));
}

module.exports = { DEFAULT_MODEL, generateText, getModel, isConfigured, parseJsonText, streamText };