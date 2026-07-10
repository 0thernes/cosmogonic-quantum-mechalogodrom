import { afterEach, describe, expect, test } from 'bun:test';
import {
  appendCopilotHistory,
  copilotFetch,
  COPILOT_MAX_HISTORY_CHARS,
  COPILOT_MAX_HISTORY_MESSAGES,
  COPILOT_MAX_MESSAGE_CHARS,
  COPILOT_MAX_TRANSCRIPT_NODES,
  trimCopilotTranscript,
  type CopilotMessage,
  type TranscriptRoot,
} from '../src/ui/copilot';
import { readResponseTextBounded } from '../src/core/bounded-response';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('Copilot client resource bounds', () => {
  test('history bounds each message, total characters, and message count', () => {
    const history: CopilotMessage[] = [];
    appendCopilotHistory(history, { role: 'user', content: 'x'.repeat(100_000) });
    expect(history[0]?.content).toHaveLength(COPILOT_MAX_MESSAGE_CHARS);

    for (let i = 0; i < 40; i++) {
      appendCopilotHistory(history, { role: 'assistant', content: `${i}:` + 'y'.repeat(8_000) });
    }
    expect(history.length).toBeLessThanOrEqual(COPILOT_MAX_HISTORY_MESSAGES);
    expect(history.reduce((sum, item) => sum + item.content.length, 0)).toBeLessThanOrEqual(
      COPILOT_MAX_HISTORY_CHARS,
    );
  });

  test('transcript eviction removes oldest nodes down to the DOM ceiling', () => {
    let count = COPILOT_MAX_TRANSCRIPT_NODES + 7;
    const root: TranscriptRoot = {
      get childElementCount() {
        return count;
      },
      get firstElementChild() {
        return count > 0 ? { remove: () => count-- } : null;
      },
    };
    trimCopilotTranscript(root);
    expect(count).toBe(COPILOT_MAX_TRANSCRIPT_NODES);
  });

  test('request timeout rejects even when the fetch implementation ignores AbortSignal', async () => {
    globalThis.fetch = (() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    const started = performance.now();
    await expect(copilotFetch('https://example.invalid', {}, 5)).rejects.toThrow('timed out');
    expect(performance.now() - started).toBeLessThan(250);
    await expect(
      readResponseTextBounded(
        new Response('small', { headers: { 'Content-Length': '1000' } }),
        16,
        'test response',
      ),
    ).rejects.toThrow('response limit');
  });

  test('caller cancellation is forwarded to the underlying request', async () => {
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('forwarded abort')), {
          once: true,
        });
      })) as typeof fetch;
    const ctrl = new AbortController();
    const pending = copilotFetch('https://example.invalid', { signal: ctrl.signal }, 100);
    ctrl.abort();
    await expect(pending).rejects.toThrow('forwarded abort');
  });
});
