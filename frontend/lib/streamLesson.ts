export async function consumeLessonStream(response: Response, onText: (text: string) => void) {
  if (!response.ok) {
    let message = 'Lesson request failed';
    try {
      const body = await response.json();
      if (typeof body.error === 'string') message = body.error;
    } catch {}
    throw new Error(message);
  }
  if (!response.body) throw new Error('The lesson stream was empty. Please try again.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  const consumeEvent = (eventBlock: string) => {
    const data = eventBlock.split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data) return;
    if (data === '[DONE]') {
      finished = true;
      return;
    }

    let payload: { text?: string; error?: string };
    try { payload = JSON.parse(data); }
    catch { throw new Error('The lesson stream was incomplete. Please retry.'); }
    if (payload.error) throw new Error(payload.error);
    if (payload.text) onText(payload.text);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      for (const event of events) {
        consumeEvent(event);
        if (finished) break;
      }
      if (finished || done) {
        if (!finished && buffer.trim()) consumeEvent(buffer);
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
