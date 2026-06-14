/**
 * WEB SEARCH for the Copilot (V43) — the directive's "in-world AI should search the web for public
 * information … aligned with a safety constitution/RAG inspired by Anthropic/OpenAI/Gemini/Grok".
 *
 * The model never hands us a URL (so there is no SSRF / fetch-arbitrary-host hole) — it hands us a
 * QUERY, which we (a) SCREEN against the {@link WEB_CONSTITUTION} (public/educational only — never
 * secrets, private data, intrusion, weapons, malware, or self-harm), then (b) look up via a single,
 * fixed, **key-less PUBLIC endpoint** (DuckDuckGo's Instant-Answer API), returning a concise,
 * source-cited summary. Server-only, read-only, time-bounded, output-capped; it writes nothing and
 * lives entirely outside the deterministic sim (same as the rest of the Copilot organ).
 */
import type { SandboxResult } from './ai-sandbox';

/** The safety constitution injected into the Copilot system prompt + enforced by {@link screenWebQuery}. */
export const WEB_CONSTITUTION = `WEB-SEARCH SAFETY CONSTITUTION (inspired by Anthropic/OpenAI/Gemini/Grok norms):
- web_search is for PUBLIC, educational information ONLY — science, math, history, public documentation, general knowledge, and this open-source project.
- NEVER seek or surface secrets, credentials, API keys, private/personal data, or anything enabling doxxing, intrusion, weapons, malware, surveillance, or self-harm.
- Prefer repo-grounded tools (read_file/grep) for questions about THIS code; use web_search for outside knowledge.
- Always cite the source URL the tool returns, and clearly separate web information from repo facts.
- If a request is sensitive or disallowed, decline briefly and offer a safe, educational alternative.`;

/** Per-search network budget. Short so the chat stays responsive even if the source hangs. */
const WEB_TIMEOUT_MS = 8_000;
/** Cap on the summary returned to the model (keeps the prompt budget bounded). */
const MAX_WEB_OUTPUT = 4_096;

/**
 * Disallowed intents — lowercased phrase fragments. Phrase-based (not single broad words like "token"
 * or "secret") to keep false-positives low while still refusing the clearly-harmful / secret-seeking
 * class. This is a first-line heuristic gate; the model is also bound by {@link WEB_CONSTITUTION}.
 */
const DENY_PHRASES: readonly string[] = [
  // secrets / credentials / intrusion
  'api key for',
  'secret key',
  'private key',
  'password for',
  'leaked password',
  'credentials for',
  '/etc/passwd',
  'id_rsa',
  '.env file',
  'how to hack',
  'how do i hack',
  'sql injection attack',
  'bypass authentication',
  'crack the password',
  // private / personal data (doxxing)
  'home address of',
  'phone number of',
  'social security number',
  'credit card number',
  'how to dox',
  // weapons / mass harm
  'make a bomb',
  'build a bomb',
  'explosive device',
  'bioweapon',
  'chemical weapon',
  'nerve agent',
  'ghost gun',
  'untraceable gun',
  '3d print a gun',
  // malware
  'write malware',
  'make malware',
  'build ransomware',
  'create a keylogger',
  'build a botnet',
  // self-harm
  'how to kill myself',
  'ways to kill myself',
  'suicide method',
  'how to self harm',
  'how to self-harm',
];

/**
 * Screen a query against the constitution. Pure + deterministic (no network) so the safety gate is
 * unit-tested. Returns `{ allowed, reason }`; a blocked query never reaches the network.
 */
export function screenWebQuery(query: string): { allowed: boolean; reason: string } {
  const q = (typeof query === 'string' ? query : '').trim().toLowerCase();
  if (q.length === 0) return { allowed: false, reason: 'empty query' };
  if (q.length > 200) return { allowed: false, reason: 'query too long (max 200 chars)' };
  for (const phrase of DENY_PHRASES) {
    // most entries are plain substrings; the one regex-ish entry is matched leniently as a substring too
    if (q.includes(phrase)) {
      return {
        allowed: false,
        reason: 'seeks secrets, private data, or harmful/disallowed content',
      };
    }
  }
  // extra guard for the doxxing pattern "where does <name> live"
  if (/\bwhere does\b.*\blive\b/.test(q)) {
    return { allowed: false, reason: 'appears to seek a private individual location (doxxing)' };
  }
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
function formatAnswer(q: string, d: DdgAnswer): string {
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
 * Run a screened web lookup. Refuses disallowed queries up front; otherwise queries the fixed key-less
 * public endpoint, time-bounded + output-capped. Never throws to the caller, never writes.
 */
export async function webSearch(query: string): Promise<SandboxResult> {
  const screen = screenWebQuery(query);
  if (!screen.allowed)
    return { ok: false, error: `refused by safety constitution: ${screen.reason}` };
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
    const data = (await res.json()) as DdgAnswer;
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
