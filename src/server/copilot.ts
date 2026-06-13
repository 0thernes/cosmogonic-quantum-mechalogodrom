/**
 * Copilot LLM bridge (CONTRACTS V9 — the non-deterministic shell organ).
 *
 * Powers the side-chat where a user can "ask, learn, and talk about this world" with a free AI
 * that can READ the repo and RUN read-only commands but can never change code. This module lives
 * entirely OUTSIDE the deterministic sim (it makes network calls and reads the wall clock); it
 * never imports or touches sim state, so the seeded golden is unaffected (see PHILOSOPHY / ADR
 * 0004 and docs/research/PRE-TRANSFORMER-GAME-AI.md Part II).
 *
 * FREE-LLM PICKER (the user's "free LLMs on the side box"): the provider is chosen per request from
 * a curated table of free, OpenAI-compatible endpoints (docs/research free-LLM report). Two are
 * key-less and always available (Pollinations, LLM7); the rest light up only when their key is
 * present in a SERVER-SIDE env var — keys never reach the browser, and the picker only ever offers
 * a provider the server can actually use. A request may name a provider; the server resolves it
 * (default-deny: unknown/keyless → the default) and, if the chosen provider errors, FAILS OVER once
 * to the key-less default so the box still answers. The legacy single-endpoint env override
 * (`CQM_LLM_ENDPOINT`/`CQM_LLM_MODEL`/`CQM_LLM_KEY`) survives as the `custom` provider and, when
 * set, becomes the default.
 */
import { SANDBOX_TOOLS, dispatchTool } from './ai-sandbox';

/** A resolvable free-LLM provider. `keyEnv` undefined ⇒ no key required (always available). */
interface ProviderPreset {
  id: string;
  label: string;
  endpoint: string;
  model: string;
  /** Env var holding the bearer token; absent for key-less providers. */
  keyEnv?: string;
}

/**
 * Curated free, OpenAI-compatible providers (June 2026 free-LLM report). Endpoints are the
 * `/chat/completions` (or OpenAI-compat) URLs; models default to a solid free pick per provider.
 * Order is the picker order — key-less first so the box works with zero config.
 */
const PRESETS: readonly ProviderPreset[] = [
  {
    id: 'llm7',
    label: 'LLM7 (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  {
    id: 'pollinations',
    label: 'Pollinations (no key)',
    endpoint: 'https://text.pollinations.ai/openai',
    model: 'openai',
  },
  {
    id: 'groq',
    label: 'Groq · Llama-3.3-70B',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyEnv: 'GROQ_API_KEY',
  },
  {
    id: 'cerebras',
    label: 'Cerebras · Llama-3.3-70B',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama-3.3-70b',
    keyEnv: 'CEREBRAS_API_KEY',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter · :free auto',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/free',
    keyEnv: 'OPENROUTER_API_KEY',
  },
  {
    id: 'github',
    label: 'GitHub Models · GPT-4.1-mini',
    endpoint: 'https://models.github.ai/inference/chat/completions',
    model: 'gpt-4.1-mini',
    keyEnv: 'GITHUB_MODELS_TOKEN',
  },
  {
    id: 'mistral',
    label: 'Mistral · small',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    keyEnv: 'MISTRAL_API_KEY',
  },
  {
    id: 'gemini',
    label: 'Google Gemini · 2.5 Flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    keyEnv: 'GEMINI_API_KEY',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM · Llama-3.3-70B',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.3-70b-instruct',
    keyEnv: 'NVIDIA_API_KEY',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek · chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    keyEnv: 'DEEPSEEK_API_KEY',
  },
  {
    id: 'huggingface',
    label: 'Hugging Face · Llama-3.3-70B',
    endpoint: 'https://router.huggingface.co/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    keyEnv: 'HF_TOKEN',
  },
] as const;

/** Resolved, ready-to-call provider (endpoint + model + bearer key). */
interface ResolvedProvider {
  id: string;
  label: string;
  endpoint: string;
  model: string;
  key: string;
}

function envStr(name: string): string {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * The `custom` provider from the legacy single-endpoint env vars. Present only when
 * `CQM_LLM_ENDPOINT` is set; when present it is the DEFAULT (back-compat with the 0.9.0 wiring).
 */
function customProvider(): ResolvedProvider | null {
  const endpoint = envStr('CQM_LLM_ENDPOINT');
  if (!endpoint) return null;
  return {
    id: 'custom',
    label: `custom @ ${safeHost(endpoint)}`,
    endpoint,
    model: envStr('CQM_LLM_MODEL') || 'openai',
    key: envStr('CQM_LLM_KEY'),
  };
}

/** A `freellmapi` aggregator provider, offered only when `FREELLMAPI_BASE` is set (user ran it). */
function freellmapiProvider(): ResolvedProvider | null {
  const base = envStr('FREELLMAPI_BASE');
  if (!base) return null;
  return {
    id: 'freellmapi',
    label: 'FreeLLMAPI · auto (16-provider pool)',
    endpoint: base.replace(/\/$/, '') + '/chat/completions',
    model: envStr('FREELLMAPI_MODEL') || 'auto',
    key: envStr('FREELLMAPI_KEY'),
  };
}

function presetToResolved(p: ProviderPreset): ResolvedProvider {
  return {
    id: p.id,
    label: p.label,
    endpoint: p.endpoint,
    model: p.model,
    key: p.keyEnv ? envStr(p.keyEnv) : '',
  };
}

/** True when a preset can actually be called now (key-less, or its env key is present). */
function presetAvailable(p: ProviderPreset): boolean {
  return p.keyEnv === undefined || envStr(p.keyEnv).length > 0;
}

/** The key-less default the box falls back to so it always tries to answer (first key-less preset). */
function fallbackProvider(): ResolvedProvider {
  const keyless = PRESETS.find((p) => p.keyEnv === undefined);
  return keyless
    ? presetToResolved(keyless)
    : { id: 'none', label: 'none', endpoint: '', model: '', key: '' };
}

/** The default provider: `custom` env override if set, else the first key-less preset. */
function defaultProvider(): ResolvedProvider {
  return customProvider() ?? fallbackProvider();
}

/**
 * Every provider the box may offer right now: the env `custom` (if set, first/default), a running
 * `freellmapi` (if `FREELLMAPI_BASE` set), then each curated preset that is callable (key-less or
 * keyed-with-key-present). Labels + ids only — no endpoints or keys leak to the client beyond the host.
 */
export function availableProviders(): { id: string; label: string; def: boolean }[] {
  const def = defaultProvider();
  const out: { id: string; label: string; def: boolean }[] = [];
  const custom = customProvider();
  if (custom) out.push({ id: custom.id, label: custom.label, def: def.id === custom.id });
  const fre = freellmapiProvider();
  if (fre) out.push({ id: fre.id, label: fre.label, def: def.id === fre.id });
  for (const p of PRESETS) {
    if (presetAvailable(p)) out.push({ id: p.id, label: p.label, def: def.id === p.id });
  }
  // Guarantee the default is marked exactly once (custom may duplicate a preset id — it won't here).
  if (!out.some((o) => o.def) && out[0]) out[0].def = true;
  return out;
}

/** Resolve a provider id to a callable provider. Default-deny: unknown/keyless → the default. */
function resolveProvider(id: string | undefined): ResolvedProvider {
  if (!id) return defaultProvider();
  if (id === 'custom') return customProvider() ?? defaultProvider();
  if (id === 'freellmapi') return freellmapiProvider() ?? defaultProvider();
  const p = PRESETS.find((x) => x.id === id);
  if (!p || !presetAvailable(p)) return defaultProvider();
  return presetToResolved(p);
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.slice(0, 40);
  }
}

/** Max model↔tool round-trips per user turn (keeps latency + token use bounded). */
const MAX_STEPS = 5;
/** Per-request network timeout. */
const FETCH_TIMEOUT_MS = 40_000;
/** Cap on messages carried per request (defends the provider + our prompt budget). */
const MAX_MESSAGES = 24;

/** A chat message in the OpenAI wire shape (the subset we send/receive). */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Present on assistant turns that request tools. */
  tool_calls?: ToolCall[];
  /** Present on `tool` messages — the id of the call this answers. */
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** One executed tool step, surfaced to the UI so the user sees what the AI read/ran. */
export interface ToolStep {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  output: string;
}

export interface AgentResult {
  ok: boolean;
  reply: string;
  steps: ToolStep[];
  /** Provider/model actually used, for the UI footer. */
  provider: string;
}

/** The standing system prompt: who the copilot is + the hard read-only contract. */
const SYSTEM_PROMPT = `You are the Copilot for the "Cosmogonic Quantum Mechalogodrom" — a deterministic WebGL cosmic-ecosystem simulation (Bun + TypeScript + three.js). You help the user explore, understand, and learn from this repository and the living world it renders.

You have READ-ONLY tools: read_file, list_dir, grep, and run (a sandboxed shell that only executes read-only commands like \`git log\`, \`ls\`, \`cat\`, \`bun test\`). Use them to ground every answer in the actual code — cite file paths and line numbers.

ABSOLUTE RULE: you can read and run, but you CANNOT change anything. You have no ability to write, edit, create, move, or delete files, install packages, or commit/push. Never claim you modified code. If the user asks you to change code, explain the change and show exactly what file/lines they'd edit, but state plainly that you are read-only.

Keep answers concise and concrete. The sim's law: one seeded RNG (same seed → same cosmos); in-world "minds" use pre-2016 game AI (FSM, behaviour trees, GOAP, utility AI, boids, tiny neural nets) — you (an LLM) are deliberately fenced OUT of the sim so you cannot break determinism.`;

/** POST one chat-completions request to a resolved provider; returns the assistant message or throws. */
async function chatCompletion(
  prov: ResolvedProvider,
  messages: ChatMessage[],
): Promise<ChatMessage> {
  if (!prov.endpoint) throw new Error('no provider configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (prov.key) headers['Authorization'] = `Bearer ${prov.key}`;
    const res = await fetch(prov.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: prov.model,
        messages,
        tools: SANDBOX_TOOLS,
        tool_choice: 'auto',
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`provider ${res.status}: ${detail}`);
    }
    const data = (await res.json()) as { choices?: { message?: ChatMessage }[] };
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('provider returned no message');
    return { role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls };
  } finally {
    clearTimeout(timer);
  }
}

/** Safe-parse a tool call's JSON arguments string into a record. */
function parseArgs(json: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(json);
    return typeof v === 'object' && v !== null && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Run the bounded model↔tool loop against ONE provider (throws on network/provider failure). */
async function runLoop(
  prov: ResolvedProvider,
  history: ChatMessage[],
  steps: ToolStep[],
): Promise<string> {
  const trimmed = history.slice(-MAX_MESSAGES).filter((m) => m.role !== 'system');
  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmed];
  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await chatCompletion(prov, messages);
    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) return msg.content || '(no answer)';
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: calls });
    for (const call of calls) {
      const args = parseArgs(call.function.arguments);
      const result = await dispatchTool(call.function.name, args);
      const output = result.ok ? result.output : `ERROR: ${result.error}`;
      steps.push({ tool: call.function.name, args, ok: result.ok, output });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: output,
      });
    }
  }
  const fin = await chatCompletion(prov, [
    ...messages,
    {
      role: 'user',
      content: 'Now give your final answer using what you gathered. Do not call more tools.',
    },
  ]);
  return fin.content || '(no answer)';
}

/**
 * Every callable provider in failover order (key-less first), deduped by endpoint. This is the
 * chain `runAgent` walks so a single dead/rate-limited provider (e.g. Pollinations 429) no longer
 * sinks the whole box — it falls through to the next live one.
 */
function providerChain(): ResolvedProvider[] {
  const out: ResolvedProvider[] = [];
  const seen = new Set<string>();
  const add = (p: ResolvedProvider | null): void => {
    if (p && p.endpoint && !seen.has(p.endpoint)) {
      seen.add(p.endpoint);
      out.push(p);
    }
  };
  add(customProvider());
  add(freellmapiProvider());
  for (const p of PRESETS) if (presetAvailable(p)) add(presetToResolved(p));
  return out;
}

/**
 * Run one user turn. Tries the chosen provider first, then FAILS OVER through every other available
 * provider (key-less first) until one answers — so one dead/rate-limited endpoint no longer kills the
 * chat. Every tool call passes the ai-sandbox gate. Never throws to the route.
 */
export async function runAgent(history: ChatMessage[], providerId?: string): Promise<AgentResult> {
  const steps: ToolStep[] = [];
  const chosen = resolveProvider(providerId);
  const order: ResolvedProvider[] = [];
  const seen = new Set<string>();
  if (chosen.endpoint) {
    order.push(chosen);
    seen.add(chosen.endpoint);
  }
  for (const p of providerChain()) {
    if (!seen.has(p.endpoint)) {
      seen.add(p.endpoint);
      order.push(p);
    }
  }

  let lastErr: unknown = null;
  for (let i = 0; i < order.length; i++) {
    const prov = order[i];
    if (!prov) continue;
    try {
      const reply = await runLoop(prov, history, steps);
      const note =
        i === 0 ? '' : `_(failed over to ${prov.label} — earlier provider(s) unreachable)_\n\n`;
      return {
        ok: true,
        reply: note + reply,
        steps,
        provider: `${prov.model} @ ${safeHost(prov.endpoint)}${i > 0 ? ' (fallback)' : ''}`,
      };
    } catch (e) {
      lastErr = e;
    }
  }
  return {
    ok: false,
    reply: `Every available AI provider was unreachable (${lastErr instanceof Error ? lastErr.message : String(lastErr)}). It may be rate-limited or disabled — try again shortly, or pick another provider in the header.`,
    steps,
    provider: order[0] ? `${order[0].model} @ ${safeHost(order[0].endpoint)}` : 'none',
  };
}

/** The active default-provider label, for the UI to show on boot. */
export function providerLabel(): string {
  const d = defaultProvider();
  return `${d.model} @ ${safeHost(d.endpoint)}${d.key ? ' (keyed)' : ' (no-key)'}`;
}
