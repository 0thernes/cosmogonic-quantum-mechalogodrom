/** Bounded streaming reads for untrusted HTTP responses; rejects before whole-body buffering. */

function responseTooLarge(source: string, maxBytes: number): Error {
  return new Error(`${source} exceeded the ${maxBytes}-byte response limit`);
}

export async function readResponseTextBounded(
  response: Response,
  maxBytes: number,
  source = 'remote response',
): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('response byte limit must be a positive safe integer');
  }

  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw responseTooLarge(source, maxBytes);
    }
  }

  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw responseTooLarge(source, maxBytes);
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function readResponseJsonBounded(
  response: Response,
  maxBytes: number,
  source = 'remote response',
): Promise<unknown> {
  const text = await readResponseTextBounded(response, maxBytes, source);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${source} returned invalid JSON`);
  }
}
