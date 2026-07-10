/**
 * WEB SEARCH for the Copilot — unrestricted public web lookup via DuckDuckGo's Instant-Answer API.
 * No safety screening, no content filtering — the LLM wrapper has no guardrails. The model never
 * hands us a URL (so there is no SSRF hole); it hands us a QUERY which we look up directly.
 * Server-only, read-only, time-bounded, output-capped; writes nothing and lives entirely outside
 * the deterministic sim.
 */
import type { SandboxResult } from './ai-sandbox';
import { readResponseJsonBounded } from '../core/bounded-response';

/** Empty — no safety constitution. The wrapper has no guardrails or AI alignment restrictions. */
export const WEB_CONSTITUTION = '';

/** Per-search network budget. Short so the chat stays responsive even if the source hangs. */
const WEB_TIMEOUT_MS = 8_000;
/** Cap on the summary returned to the model (keeps the prompt budget bounded). */
const MAX_WEB_OUTPUT = 4_096;
/** Maximum DuckDuckGo response bytes accepted before cancelling the stream. */
const MAX_WEB_RESPONSE_BYTES = 256 * 1024;

/**
 * No content screening — the wrapper has no guardrails. Only basic bounds (empty / over-long)
 * are checked so the downstream fetch doesn't get garbage. Returns `{ allowed, reason }`.
 */
export function screenWebQuery(query: string): { allowed: boolean; reason: string } {
  const q = (typeof query === 'string' ? query : '').trim().toLowerCase();
  if (q.length === 0) return { allowed: false, reason: 'empty query' };
  if (q.length > 200) return { allowed: false, reason: 'query too long (max 200 chars)' };
  return { allowed: true, reason: 'ok' };
}

/** Shape of the DuckDuckGo Instant-Answer JSON we read (a tolerant subset). */
interface DdgAnswer {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  Answer?: string;
  Definition?: string;
  DefinitionURL?: string;
  RelatedTopics?: { Text?: string; FirstURL?: string }[];
}

/** Format the DDG answer into a concise, source-cited block (or a graceful "nothing found"). */
export function formatAnswer(q: string, d: DdgAnswer): string {
  const parts: string[] = [];
  if (d.Heading) parts.push(`# ${d.Heading}`);
  const lead = d.AbstractText || d.Answer || d.Definition || '';
  const leadUrl = d.AbstractURL || d.DefinitionURL || '';
  if (lead) parts.push(lead + (leadUrl ? `\n(source: ${leadUrl})` : ''));
  const related = (d.RelatedTopics ?? [])
    .filter((t) => t.Text)
    .slice(0, 5)
    .map((t) => `- ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ''}`);
  if (related.length) parts.push('Related:\n' + related.join('\n'));
  const out = parts.join('\n\n').trim();
  return (
    out ||
    `No public instant-answer summary was found for "${q}". Try a more specific, encyclopedic query.`
  );
}

/**
 * Run a web lookup. Only basic bounds are checked (empty / over-long); otherwise queries the fixed
 * key-less public endpoint, time-bounded + output-capped. Never throws to the caller, never writes.
 */
export async function webSearch(query: string): Promise<SandboxResult> {
  const screen = screenWebQuery(query);
  if (!screen.allowed) return { ok: false, error: `query rejected: ${screen.reason}` };
  const q = query.trim();
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WEB_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'CQM-Copilot/1.0 (+public-info, read-only)' },
    });
    if (!res.ok) return { ok: false, error: `web search HTTP ${res.status}` };
    const raw = await readResponseJsonBounded(res, MAX_WEB_RESPONSE_BYTES, 'web search response');
    const data = raw !== null && typeof raw === 'object' ? (raw as DdgAnswer) : {};
    const out = formatAnswer(q, data);
    const truncated = out.length > MAX_WEB_OUTPUT;
    return { ok: true, output: truncated ? out.slice(0, MAX_WEB_OUTPUT) : out, truncated };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: /abort/i.test(msg) ? 'web search timed out' : `web search failed: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
