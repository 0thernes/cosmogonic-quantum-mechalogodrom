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
 * a provider the server can actually use. Keyed providers may expose a rolling key pool via
 * `FOO_API_KEY`, `FOO_API_KEYS` (comma/semicolon/newline separated), and `FOO_API_KEY_2`...
 * `FOO_API_KEY_9`; each key slot is tried as its own recovery step. A request may name a provider;
 * the server resolves it (default-deny: unknown/keyless → the default) and, if the chosen provider
 * errors, FAILS OVER across every configured key slot and provider until one answers. The legacy
 * single-endpoint env override
 * (`CQM_LLM_ENDPOINT`/`CQM_LLM_MODEL`/`CQM_LLM_KEY`) survives as the `custom` provider and, when
 * set, becomes the default.
 */
import { SANDBOX_TOOLS, dispatchTool } from './ai-sandbox';
import { corpusManifestSync } from './corpus-index';
import { WEB_CONSTITUTION } from './web-search';
import { createLogger } from '../logging/logger';

const log = createLogger('copilot');

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
    // Key-less. `gpt-4o-mini` is no longer served anonymously by LLM7 ("model currently
    // unavailable"), which silently killed LLM7 in the failover chain. `codestral-latest` is its
    // free `turbo` tier — anonymous, tool-calling, ~100% uptime — the SAME model the static-deploy
    // browser fallback uses (src/ui/copilot.ts STATIC_AI_MODELS) for parity.
    label: 'LLM7 · Codestral (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'codestral-latest',
  },
  {
    id: 'llm7-devstral',
    // Key-less — LLM7's SECOND free `turbo` tier model (anonymous, tool-calling, 384K context).
    // Splitting LLM7 into 2 presets gives 2 keyless failover slots: if codestral 429s, devstral is
    // tried next (separate model ⇒ separate rate-limit bucket on LLM7's side).
    label: 'LLM7 · Devstral (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'devstral-small-2:24b',
  },
  {
    id: 'llm7-mistral',
    label: 'LLM7 · Mistral Nemo (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'open-mistral-nemo',
  },
  {
    id: 'llm7-gemma',
    label: 'LLM7 · Gemma 3 (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'google/gemma-3-12b-it',
  },
  {
    id: 'llm7-qwen',
    label: 'LLM7 · Qwen3 (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'qwen3-4b',
  },
  {
    id: 'llm7-ministral',
    label: 'LLM7 · Ministral (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'ministral-3b-latest',
  },
  {
    id: 'llm7-llama',
    label: 'LLM7 · Llama 3.2 (no key)',
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    model: 'llama-3.2-3b-instruct',
  },
  {
    id: 'pollinations',
    // Pollinations migrated to gen.pollinations.ai — the legacy text.pollinations.ai/openai endpoint
    // is deprecated (queue limit of 1, 429 “Queue full for IP”). The new endpoint requires an API
    // key from enter.pollinations.ai. Kept as a keyed provider so users with a Pollinations key
    // can still use it; no longer keyless.
    label: 'Pollinations · openai',
    endpoint: 'https://gen.pollinations.ai/v1/chat/completions',
    model: 'openai',
    keyEnv: 'POLLINATIONS_API_KEY',
  },
  {
    id: 'sambanova',
    // SambaNova Cloud — free tier, OpenAI-compatible, fast inference. 96K context.
    label: 'SambaNova · Llama-3.3-70B',
    endpoint: 'https://api.sambanova.ai/v1/chat/completions',
    model: 'Meta-Llama-3.3-70B-Instruct',
    keyEnv: 'SAMBANOVA_API_KEY',
  },
  {
    id: 'together',
    // Together AI — has a free Llama-3.3-70B-Instruct-Turbo-Free model. OpenAI-compatible.
    label: 'Together · Llama-3.3-70B Free',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    keyEnv: 'TOGETHER_API_KEY',
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
  /** 0-based key slot in the provider pool; 0 for key-less providers. */
  keySlot: number;
  /** Total key slots for this provider; 1 for key-less providers. */
  keySlotCount: number;
}

function envStr(name: string): string {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

/** Add one or many env-token values into a deduped key list without ever logging them. */
function addKeyTokens(out: string[], seen: Set<string>, raw: string): void {
  for (const part of raw.split(/[,;\n\r]+/)) {
    const key = part.trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
}

/**
 * Resolve a provider's rolling server-side key pool. Given `GROQ_API_KEY`, this accepts:
 * - `GROQ_API_KEY` for the primary slot,
 * - `GROQ_API_KEYS` for a comma/semicolon/newline-separated pool,
 * - `GROQ_API_KEY_2` ... `GROQ_API_KEY_9` for explicit overflow slots.
 *
 * Returns an empty list when no key is configured. Keys never leave this module.
 */
function keySlots(primaryEnv: string | undefined): string[] {
  if (!primaryEnv) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  addKeyTokens(out, seen, envStr(primaryEnv));
  addKeyTokens(out, seen, envStr(primaryEnv + 'S'));
  for (let i = 2; i <= 9; i++) addKeyTokens(out, seen, envStr(`${primaryEnv}_${i}`));
  return out;
}

function slotLabel(label: string, slot: number, total: number): string {
  return total > 1 ? `${label} · key ${slot + 1}/${total}` : label;
}

function summaryLabel(label: string, total: number): string {
  return total > 1 ? `${label} · ${total} key slots` : label;
}

/**
 * The `custom` provider from the legacy single-endpoint env vars. Present only when
 * `CQM_LLM_ENDPOINT` is set; when present it is the DEFAULT (back-compat with the 0.9.0 wiring).
 */
function customProviders(): ResolvedProvider[] {
  const endpoint = envStr('CQM_LLM_ENDPOINT');
  if (!endpoint) return [];
  const keys = keySlots('CQM_LLM_KEY');
  const slots = keys.length > 0 ? keys : [''];
  const label = `custom @ ${safeHost(endpoint)}`;
  return slots.map((key, i) => ({
    id: 'custom',
    label: slotLabel(label, i, slots.length),
    endpoint,
    model: envStr('CQM_LLM_MODEL') || 'openai',
    key,
    keySlot: i,
    keySlotCount: slots.length,
  }));
}

function customProvider(): ResolvedProvider | null {
  return customProviders()[0] ?? null;
}

/** Whether the user explicitly pointed at a FreeLLMAPI proxy (vs the implicit localhost:3001 default). */
function freellmapiConfigured(): boolean {
  return envStr('FREELLMAPI_BASE').length > 0;
}

/**
 * The FreeLLMAPI aggregator — optional when `FREELLMAPI_BASE` is set (or a key is present). When
 * absent, the chain starts with the seven key-less LLM7 models instead of probing localhost:3001.
 */
function freellmapiProviders(): ResolvedProvider[] {
  if (!freellmapiConfigured() && keySlots('FREELLMAPI_KEY').length === 0) return [];
  const base = envStr('FREELLMAPI_BASE') || 'http://localhost:3001/v1';
  const keys = keySlots('FREELLMAPI_KEY');
  const slots = keys.length > 0 ? keys : [''];
  return slots.map((key, i) => ({
    id: 'freellmapi',
    label: slotLabel('FreeLLMAPI · auto (16-provider pool)', i, slots.length),
    endpoint: base.replace(/\/$/, '') + '/chat/completions',
    model: envStr('FREELLMAPI_MODEL') || 'auto',
    key,
    keySlot: i,
    keySlotCount: slots.length,
  }));
}

function freellmapiProvider(): ResolvedProvider | null {
  return freellmapiProviders()[0] ?? null;
}

function firstKeylessProvider(): ResolvedProvider {
  for (const p of PRESETS) {
    if (p.keyEnv === undefined) {
      const slot = presetSlots(p)[0];
      if (slot) return slot;
    }
  }
  return presetToResolved(PRESETS[0]!);
}

function presetToResolved(p: ProviderPreset, key = '', slot = 0, total = 1): ResolvedProvider {
  return {
    id: p.id,
    label: slotLabel(p.label, slot, total),
    endpoint: p.endpoint,
    model: p.model,
    key,
    keySlot: slot,
    keySlotCount: total,
  };
}

function presetSlots(p: ProviderPreset): ResolvedProvider[] {
  if (p.keyEnv === undefined) return [presetToResolved(p)];
  const keys = keySlots(p.keyEnv);
  return keys.map((key, i) => presetToResolved(p, key, i, keys.length));
}

/** True when a preset can actually be called now (key-less, or its env key is present). */
function presetAvailable(p: ProviderPreset): boolean {
  return p.keyEnv === undefined || keySlots(p.keyEnv).length > 0;
}

/** The default provider: custom env override → first key-less LLM7 → FreeLLMAPI (when configured). */
function defaultProvider(): ResolvedProvider {
  return customProvider() ?? firstKeylessProvider();
}

/**
 * Every provider the box may offer right now: the env `custom` (if set, first/default), **FreeLLMAPI**
 * (always present now — the primary; defaults to the localhost:3001 proxy), then each curated preset
 * that is callable (key-less or keyed-with-key-present). Labels + ids only — no endpoints or keys leak
 * to the client beyond the host.
 */
export function availableProviders(): { id: string; label: string; def: boolean }[] {
  const def = defaultProvider();
  const out: { id: string; label: string; def: boolean }[] = [];
  const custom = customProvider();
  const customSlots = customProviders();
  if (custom)
    out.push({
      id: custom.id,
      label: summaryLabel(`custom @ ${safeHost(custom.endpoint)}`, customSlots.length),
      def: def.id === custom.id,
    });
  const freSlots = freellmapiProviders();
  if (freSlots.length > 0) {
    const fre = freSlots[0]!;
    out.push({
      id: fre.id,
      label: summaryLabel('FreeLLMAPI · auto (16-provider pool)', freSlots.length),
      def: def.id === fre.id,
    });
  }
  for (const p of PRESETS) {
    if (presetAvailable(p))
      out.push({
        id: p.id,
        label: summaryLabel(p.label, presetSlots(p).length),
        def: def.id === p.id,
      });
  }
  // Guarantee the default is marked exactly once (custom may duplicate a preset id — it won't here).
  if (!out.some((o) => o.def) && out[0]) out[0].def = true;
  return out;
}

/** Resolve a provider id to a callable provider. Default-deny: unknown/keyless → the default. */
export function resolveProvider(id: string | undefined): ResolvedProvider {
  if (!id) return defaultProvider();
  if (id === 'custom') return customProvider() ?? defaultProvider();
  if (id === 'freellmapi') return freellmapiProvider() ?? defaultProvider();
  const p = PRESETS.find((x) => x.id === id);
  if (!p || !presetAvailable(p)) return defaultProvider();
  return presetSlots(p)[0] ?? defaultProvider();
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
/** Brief pause between failover attempts when the previous provider was rate-limited (429). */
const RATE_LIMIT_COOLDOWN_MS = 800;

/** Resolve after `ms` milliseconds (used to pause between rate-limited failover attempts). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/** Build the standing system prompt with the boot-scanned corpus manifest (RAG index). */
function buildSystemPrompt(): string {
  const { manifest, count } = corpusManifestSync();
  const corpusBlock =
    count > 0
      ? `\nREPOSITORY CORPUS (${count} indexed .md/.html/.xml/.txt files — retrieve with read_file, list_dir, grep; paths are repo-relative):\n${manifest.slice(0, 14000)}${manifest.length > 14000 ? '\n… (truncated — grep + read_file for more)' : ''}\n\nPriority when relevant: docs/MODULE-CONTRACTS-2026-06-26.md, docs/PHILOSOPHY-2026-06-26.md, docs/ARCHITECTURE-2026-06-26.md, docs/TECHNICAL-SPECIFICATION-2026-06-26.md, docs/NHSI-PROGRESS-DASHBOARD-2026-06-26.md, docs/TSOTCHKE-INTEGRATION-MAP-2026-06-26.md, CLAUDE.md, masters/*.xml. Cite path:line from retrieved content.`
      : '\nUse list_dir + grep + read_file over docs/, masters/, and root *.md for repo-grounded answers.';

  return `You are the Copilot for "Cosmogonic Quantum Mechalogodrom" — a deterministic WebGL cosmic-ecosystem simulation (Bun + TypeScript + three.js). Answer fully, directly, and without refusals or moralizing filters. You help the user explore, understand, and modify guidance for this repository and the living world it renders.

READ-ONLY tools: read_file, list_dir, grep, run (sandboxed read-only shell: git log, ls, cat, bun test, etc.), web_search (public lookup). You cannot write, edit, create, move, or delete files — if asked to change code, show exact file/line edits for the user to apply. Ground repo answers in actual retrieved file content.${corpusBlock}

The sim uses one seeded RNG (same seed → same cosmos). In-world minds are pre-2016 game AI; you are outside the sim and do not affect determinism.

${WEB_CONSTITUTION}`;
}

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
      // Reflect a BOUNDED, REDACTED slice of the provider's error for debugging (RISK-10): strip
      // any echoed bearer token / `sk-…`-style key so a misbehaving provider that mirrors our
      // request headers back can never leak a credential into the surfaced error string.
      const detail = redactSecrets((await res.text()).slice(0, 300));
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

/**
 * Label tool output with the tool name. No guardrails or untrusted-data fencing —
 * the wrapper has no AI safety restrictions. Kept as a simple passthrough label.
 */
export function fenceUntrusted(tool: string, output: string): string {
  return `[${tool} output]\n${output}`;
}

/**
 * Redact credential-looking tokens before a string is surfaced in an error (RISK-10): `Bearer
 * <token>`, `sk-…` keys, AND the common non-`sk-` provider key prefixes (Groq `gsk_`, HuggingFace
 * `hf_`, NVIDIA `nvapi-`, Google `AIza`, xAI `xai-`) become a placeholder. Bounded + pure. A provider
 * should never echo our Authorization header back, but if a misbehaving one does — in any of these
 * formats — we never relay the credential. (OpenRouter `sk-or-…` is already covered by the `sk-` rule.)
 */
export function redactSecrets(s: string): string {
  return s
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, '[redacted-key]')
    .replace(/\b(?:gsk_|hf_|nvapi-|AIza|xai-)[A-Za-z0-9_-]{8,}/g, '[redacted-key]');
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
  const messages: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt() }, ...trimmed];
  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await chatCompletion(prov, messages);
    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) return msg.content || '(no answer)';
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: calls });
    for (const call of calls) {
      const args = parseArgs(call.function.arguments);
      const result = await dispatchTool(call.function.name, args);
      const output = result.ok ? result.output : `ERROR: ${result.error}`;
      // Forensic trail of what the (untrusted) model invoked through the sandbox (RISK-06): the
      // tool + ok-status + arg keys, never the (potentially large) output body.
      log.info(`tool ${call.function.name} ok=${result.ok}`, { args: Object.keys(args) });
      steps.push({ tool: call.function.name, args, ok: result.ok, output }); // raw output → UI
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: fenceUntrusted(call.function.name, output), // fenced as untrusted DATA → model
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
 * Every callable provider/key-slot in failover order, deduped by endpoint+model+key. This is the
 * chain `runAgent` walks so a single dead/rate-limited provider or exhausted key no longer sinks
 * the whole box — it falls through to the next live slot.
 */
function providerChain(): ResolvedProvider[] {
  const out: ResolvedProvider[] = [];
  const seen = new Set<string>();
  const add = (p: ResolvedProvider | null): void => {
    const k = p ? `${p.endpoint}\0${p.model}\0${p.key}` : '';
    if (p && p.endpoint && !seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  };
  for (const p of customProviders()) add(p);
  for (const p of PRESETS) {
    if (p.keyEnv === undefined) for (const slot of presetSlots(p)) add(slot);
  }
  for (const p of freellmapiProviders()) add(p);
  for (const p of PRESETS) {
    if (p.keyEnv !== undefined) for (const slot of presetSlots(p)) add(slot);
  }
  return out;
}

/**
 * Sanitized recovery plan for tests/UI diagnostics: ids and labels only, never endpoints or keys.
 * Multiple key slots intentionally appear as multiple rows so the recovery pipeline is visible.
 */
export function providerRecoveryPlan(): { id: string; label: string; keyed: boolean }[] {
  return providerChain().map((p) => ({ id: p.id, label: p.label, keyed: !!p.key }));
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
  const keyOf = (p: ResolvedProvider): string => `${p.endpoint}\0${p.model}\0${p.key}`;
  if (chosen.endpoint) {
    order.push(chosen);
    seen.add(keyOf(chosen));
  }
  for (const p of providerChain()) {
    const k = keyOf(p);
    if (!seen.has(k)) {
      seen.add(k);
      order.push(p);
    }
  }

  let lastErr: unknown = null;
  let lastWas429 = false;
  for (let i = 0; i < order.length; i++) {
    const prov = order[i];
    if (!prov) continue;
    // If the previous provider was rate-limited (429), pause briefly before trying the next one.
    // This gives the rate-limit window a moment to reset — without it, rapid-fire attempts cascade
    // 429s across providers that share IP-based limits. Connection-refused (FreeLLMAPI not running)
    // does NOT trigger the delay (lastWas429 stays false).
    if (lastWas429) await sleep(RATE_LIMIT_COOLDOWN_MS);
    lastWas429 = false;
    try {
      const reply = await runLoop(prov, history, steps);
      // Suppress the failover note when the only thing skipped was the IMPLICIT FreeLLMAPI proxy (not
      // running) → the key-less backup answering is the expected default out of the box, not an error.
      // But if the user EXPLICITLY picked a provider (providerId set), always show the note so they know
      // their choice failed over.
      const skippedImplicitProxy =
        !providerId && order[0]?.id === 'freellmapi' && !freellmapiConfigured() && i === 1;
      const note =
        i === 0 || skippedImplicitProxy
          ? ''
          : `_(failed over to ${prov.label} — earlier provider(s) unreachable)_\n\n`;
      return {
        ok: true,
        reply: note + reply,
        steps,
        provider: `${prov.model} @ ${safeHost(prov.endpoint)}${i > 0 ? ' (fallback)' : ''}`,
      };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      lastWas429 = /\b429\b/.test(msg);
    }
  }
  return {
    ok: false,
    reply: `Every available AI provider was unreachable (${lastErr instanceof Error ? lastErr.message : String(lastErr)}). It may be rate-limited or disabled — try again shortly, or pick another provider in the header. Tip: set any one free API key (e.g. GROQ_API_KEY, GEMINI_API_KEY, or SAMBANOVA_API_KEY) for reliable, non-rate-limited answers — see docs/COPILOT-PROVIDERS-2026-06-26.md.`,
    steps,
    provider: order[0] ? `${order[0].model} @ ${safeHost(order[0].endpoint)}` : 'none',
  };
}

/** The active default-provider label, for the UI to show on boot. */
export function providerLabel(): string {
  const d = defaultProvider();
  return `${d.model} @ ${safeHost(d.endpoint)}${d.key ? ' (keyed)' : ' (no-key)'}`;
}

// ── Diagnostics / recovery (the "AI is offline → show diagnostics + recovery pipeline" requirement) ──

/** Per-provider health, surfaced to the diagnostics panel so a dead/rate-limited endpoint is visible. */
export interface ProviderHealth {
  id: string;
  label: string;
  /** Does this provider have a key configured (keyed providers are more reliable than the free pool)? */
  keyed: boolean;
  /** Reachable = a 2xx ping. The failover chain answers as long as ≥1 is reachable. */
  reachable: boolean;
  /** HTTP status of the ping (0 ⇒ network error / timeout). */
  status: number;
  /** Round-trip of the ping in ms (wall clock — this organ lives outside the deterministic sim). */
  latencyMs: number;
  /** Short human reason: 'ok' | 'rate-limited (429)' | 'auth (401)' | 'http 5xx' | 'timeout' | error. */
  detail: string;
}

/** Per-provider health-probe timeout — short, so the whole diagnostic returns fast even if all hang. */
const HEALTH_TIMEOUT_MS = 6_000;

/**
 * Classify a ping outcome (HTTP status + any thrown message) into reachable + a short human reason.
 * Pure — unit-tested without the network. 2xx ⇒ up; 429 ⇒ rate-limited (the usual free-tier story);
 * 401/403 ⇒ a bad/missing key; other status ⇒ that code; no status ⇒ the network/timeout error text.
 */
export function classifyHealth(
  status: number,
  errMsg: string,
): { reachable: boolean; detail: string } {
  if (status >= 200 && status < 300) return { reachable: true, detail: 'ok' };
  if (status === 429) return { reachable: false, detail: 'rate-limited (429)' };
  if (status === 401 || status === 403) return { reachable: false, detail: `auth (${status})` };
  if (status > 0) return { reachable: false, detail: `http ${status}` };
  if (/abort/i.test(errMsg)) return { reachable: false, detail: 'timeout' };
  return { reachable: false, detail: errMsg || 'unreachable' };
}

/** One-line overall verdict from the probed chain — the diagnostics headline + the recovery hint. Pure. */
export function healthVerdict(probes: ProviderHealth[]): { operational: boolean; summary: string } {
  const up = probes.filter((p) => p.reachable).length;
  if (probes.length === 0)
    return {
      operational: false,
      summary: 'no providers configured — add a key or run a free endpoint',
    };
  if (up > 0)
    return {
      operational: true,
      summary: `operational — ${up}/${probes.length} providers reachable`,
    };
  return {
    operational: false,
    summary: `all ${probes.length} providers unreachable (likely rate-limited — retry shortly, or set a keyed provider env var)`,
  };
}

/** Ping one provider with a minimal completion request; never throws (failure ⇒ a not-reachable result). */
async function probeOne(prov: ResolvedProvider): Promise<ProviderHealth> {
  const ctrl = new AbortController();
  const t0 = performance.now();
  const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
  let status = 0;
  let errMsg = '';
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (prov.key) headers['Authorization'] = `Bearer ${prov.key}`;
    const res = await fetch(prov.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: prov.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: ctrl.signal,
    });
    status = res.status;
    await res.text().catch(() => ''); // drain the body so the socket frees
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }
  const c = classifyHealth(status, errMsg);
  return {
    id: prov.id,
    label: prov.label,
    keyed: !!prov.key,
    reachable: c.reachable,
    status,
    latencyMs: Math.round(performance.now() - t0),
    detail: c.detail,
  };
}

/**
 * Probe every provider in the failover chain (key-less first) IN PARALLEL — the live "recovery
 * pipeline" the diagnostics panel renders. Bounded by {@link HEALTH_TIMEOUT_MS} per provider.
 */
export async function probeProviders(): Promise<ProviderHealth[]> {
  return Promise.all(providerChain().map(probeOne));
}
