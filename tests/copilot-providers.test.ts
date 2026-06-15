/**
 * availableProviders() / providerLabel() (src/server/copilot.ts) — the env-gated free-LLM picker.
 * Untested at the function level. The load-bearing invariant is "exactly one default is marked";
 * keyed providers must appear ONLY when their key env var is present (no key → never offered, so the
 * picker can't hand the UI a provider the server can't use). Deterministic by saving/clearing/
 * restoring the provider env vars around each case. Pure (PRESETS + process.env) — no network.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { availableProviders, providerLabel } from '../src/server/copilot';

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
