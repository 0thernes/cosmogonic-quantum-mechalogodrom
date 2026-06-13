/**
 * Copilot LLM bridge (CONTRACTS V9 — the non-deterministic shell organ).
 *
 * Powers the side-chat where a user can "ask, learn, and talk about this world" with a free AI
 * that can READ the repo and RUN read-only commands but can never change code. This module lives
 * entirely OUTSIDE the deterministic sim (it makes network calls and reads the wall clock); it
 * never imports or touches sim state, so the seeded golden is unaffected (see PHILOSOPHY / ADR
 * 0004 and docs/research/PRE-TRANSFORMER-GAME-AI.md Part II).
 *
 * Provider is PLUGGABLE and OpenAI-compatible, configured by env (keys stay server-side, never in
 * the browser):
 *  - `CQM_LLM_ENDPOINT` — full chat-completions URL. Default: Pollinations.ai (no key required).
 *  - `CQM_LLM_MODEL`    — model id. Default: `openai`.
 *  - `CQM_LLM_KEY`      — optional bearer token (set this to point at freellmapi's ~1.7B-token
 *                         16-provider pool, OpenRouter `:free`, Groq, etc.).
 *
 * The agent loop ({@link runAgent}) gives the model the read-only tools from ai-sandbox.ts and
 * executes any tool calls it makes, up to a bounded number of steps, then returns the final answer
 * plus a transcript of what it read/ran. If the provider is unreachable the call degrades to a
 * clear error so the chat panel can still run the user's manual read-only commands locally.
 */
import { SANDBOX_TOOLS, dispatchTool } from './ai-sandbox';

const ENDPOINT = process.env['CQM_LLM_ENDPOINT'] ?? 'https://text.pollinations.ai/openai';
const MODEL = process.env['CQM_LLM_MODEL'] ?? 'openai';
const KEY = process.env['CQM_LLM_KEY'] ?? '';

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

/** POST one chat-completions request; returns the assistant message or throws. */
async function chatCompletion(messages: ChatMessage[]): Promise<ChatMessage> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (KEY) headers['Authorization'] = `Bearer ${KEY}`;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: MODEL, messages, tools: SANDBOX_TOOLS, tool_choice: 'auto' }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`provider ${res.status}: ${detail}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: ChatMessage }[];
    };
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

/**
 * Run one user turn: prepend the system prompt, then loop the model with read-only tools until it
 * answers or {@link MAX_STEPS} is reached. Every tool call is executed through the ai-sandbox gate.
 * Returns the final reply + a transcript. Network/parse failures resolve to `ok:false` with a
 * human-readable reply (never throws to the route).
 */
export async function runAgent(history: ChatMessage[]): Promise<AgentResult> {
  const provider = `${MODEL} @ ${new URL(ENDPOINT).host}`;
  const steps: ToolStep[] = [];
  // Trim to the most recent turns, then prepend the system prompt.
  const trimmed = history.slice(-MAX_MESSAGES).filter((m) => m.role !== 'system');
  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmed];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const msg = await chatCompletion(messages);
      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        return { ok: true, reply: msg.content || '(no answer)', steps, provider };
      }
      // Record the assistant's tool-request turn, then execute each call and feed results back.
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
    // Ran out of tool budget — ask once more for a final, tool-free answer.
    const fin = await chatCompletion([
      ...messages,
      {
        role: 'user',
        content: 'Now give your final answer using what you gathered. Do not call more tools.',
      },
    ]);
    return { ok: true, reply: fin.content || '(no answer)', steps, provider };
  } catch (e) {
    return {
      ok: false,
      reply: `The AI provider could not be reached (${e instanceof Error ? e.message : String(e)}). You can still run read-only commands manually in the chat (e.g. \`/run git log --oneline -5\`, \`/read src/world.ts\`).`,
      steps,
      provider,
    };
  }
}

/** The active provider label, for the UI to show on boot. */
export function providerLabel(): string {
  return `${MODEL} @ ${new URL(ENDPOINT).host}${KEY ? ' (keyed)' : ' (no-key)'}`;
}
