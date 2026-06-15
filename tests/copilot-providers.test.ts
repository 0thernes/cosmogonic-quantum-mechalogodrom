/**
 * availableProviders() / providerLabel() (src/server/copilot.ts) — the env-gated free-LLM picker.
 * Untested at the function level. The load-bearing invariant is "exactly one default is marked";
 * keyed providers must appear ONLY when their key env var is present (no key → never offered, so the
 * picker can't hand the UI a provider the server can't use). Deterministic by saving/clearing/
 * restoring the provider env vars around each case. Pure (PRESETS + process.env) — no network.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { availableProviders, providerLabel, resolveProvider } from '../src/server/copilot';

const KEY_ENVS = [
  'GROQ_API_KEY',
  'CEREBRAS_API_KEY',
  'OPENROUTER_API_KEY',
  'GITHUB_MODELS_TOKEN',
  'MISTRAL_API_KEY',
  'GEMINI_API_KEY',
  'NVIDIA_API_KEY',
  'DEEPSEEK_API_KEY',
  'CQM_LLM_ENDPOINT',
  'CQM_LLM_MODEL',
  'CQM_LLM_KEY',
];
const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const k of KEY_ENVS) {
    saved.set(k, process.env[k]);
    delete process.env[k];
  }
});
afterEach(() => {
  for (const [k, v] of saved) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  saved.clear();
});

describe('availableProviders — env-gated free-LLM list', () => {
  test('with no keys set: a non-empty list, every entry well-formed, exactly one default', () => {
    const list = availableProviders();
    expect(list.length).toBeGreaterThan(0);
    // The load-bearing invariant the function explicitly guarantees.
    expect(list.filter((p) => p.def).length).toBe(1);
    for (const p of list) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
    }
    // A keyed provider must NOT be offered when its key is absent.
    expect(list.some((p) => p.id === 'groq')).toBe(false);
  });

  test('setting a provider key surfaces exactly that provider (still one default)', () => {
    expect(availableProviders().some((p) => p.id === 'groq')).toBe(false);
    process.env['GROQ_API_KEY'] = 'test-key-value';
    const list = availableProviders();
    expect(list.some((p) => p.id === 'groq')).toBe(true);
    expect(list.filter((p) => p.def).length).toBe(1); // invariant survives the new entry
  });

  test('every offered id is unique (no duplicate picker rows)', () => {
    process.env['MISTRAL_API_KEY'] = 'k';
    const ids = availableProviders().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('providerLabel — default-provider summary', () => {
  test('returns a non-empty "model @ host (keyed|no-key)" string', () => {
    const label = providerLabel();
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
    expect(label).toContain('@');
    expect(label.endsWith('(keyed)') || label.endsWith('(no-key)')).toBe(true);
  });

  test('with no keys present the default is a key-less provider', () => {
    expect(providerLabel().endsWith('(no-key)')).toBe(true);
  });
});

describe('customProvider env override (CQM_LLM_ENDPOINT)', () => {
  test('a configured custom endpoint becomes the offered default', () => {
    expect(availableProviders().some((p) => p.id === 'custom')).toBe(false);
    process.env['CQM_LLM_ENDPOINT'] = 'https://my-llm.example.com/v1/chat/completions';
    const list = availableProviders();
    const custom = list.find((p) => p.id === 'custom');
    expect(custom).toBeDefined();
    expect(custom!.def).toBe(true); // the env override wins as the default
    expect(list.filter((p) => p.def).length).toBe(1); // still exactly one default
    // The label leaks only the host, never the full endpoint or the key.
    expect(custom!.label).toContain('my-llm.example.com');
    expect(custom!.label).not.toContain('/chat/completions');
  });
});

describe('resolveProvider — default-deny resolution (security)', () => {
  test('no id, or the primary id, resolves to FreeLLMAPI (the default chain head)', () => {
    expect(resolveProvider(undefined).id).toBe('freellmapi');
    expect(resolveProvider('freellmapi').id).toBe('freellmapi');
  });

  test('an UNKNOWN provider id falls back to the default (never honored)', () => {
    expect(resolveProvider('totally-made-up-provider').id).toBe('freellmapi');
    expect(resolveProvider('').id).toBe('freellmapi');
  });

  test('a keyed preset is denied without its key, and resolves once the key is present', () => {
    expect(resolveProvider('groq').id).toBe('freellmapi'); // no GROQ_API_KEY → default-deny
    process.env['GROQ_API_KEY'] = 'a-key';
    const got = resolveProvider('groq');
    expect(got.id).toBe('groq');
    expect(got.endpoint).toContain('groq');
  });

  test('the custom id resolves only when its endpoint env is set, else the default', () => {
    expect(resolveProvider('custom').id).toBe('freellmapi'); // no CQM_LLM_ENDPOINT → default
    process.env['CQM_LLM_ENDPOINT'] = 'https://c.example/v1/chat/completions';
    expect(resolveProvider('custom').id).toBe('custom');
  });
});
