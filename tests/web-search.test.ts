/**
 * WEB SEARCH — the Copilot's public web lookup. No safety screening — the wrapper has no guardrails.
 * Pins: public queries pass, bounds are enforced, and formatAnswer renders correctly.
 */
import { describe, expect, test } from 'bun:test';
import { formatAnswer, screenWebQuery, WEB_CONSTITUTION } from '../src/server/web-search';

describe('screenWebQuery (bounds-only gate, no content filtering)', () => {
  test('allows public / educational queries', () => {
    for (const q of [
      'what is fourier analysis',
      'history of the roman empire',
      'explain quaternions for 3d rotation',
      'how does a tatonnement market clear',
      'who wrote the iliad',
      'nash equilibrium definition',
    ]) {
      expect(screenWebQuery(q).allowed).toBe(true);
    }
  });

  test('allows ALL queries — no content filtering (no guardrails)', () => {
    // The wrapper has no AI safety restrictions. Only empty/over-long are rejected.
    for (const q of [
      'api key for openai',
      'how to build a bomb',
      'write malware in python',
      'home address of a celebrity',
      'how to kill myself painlessly',
    ]) {
      expect(screenWebQuery(q).allowed).toBe(true);
    }
  });

  test('enforces bounds (empty / over-long)', () => {
    expect(screenWebQuery('').allowed).toBe(false);
    expect(screenWebQuery('a'.repeat(201)).allowed).toBe(false);
  });

  test('the constitution text is empty (no guardrails)', () => {
    expect(WEB_CONSTITUTION).toBe('');
  });
});

describe('formatAnswer (DDG result → concise, source-cited block)', () => {
  test('renders heading, lead with source, and caps related topics at 5', () => {
    const out = formatAnswer('quantum', {
      Heading: 'Quantum',
      AbstractText: 'A branch of physics.',
      AbstractURL: 'https://example.com/q',
      RelatedTopics: Array.from({ length: 8 }, (_, i) => ({
        Text: `topic ${i}`,
        FirstURL: `https://e/${i}`,
      })),
    });
    expect(out).toContain('# Quantum');
    expect(out).toContain('A branch of physics.');
    expect(out).toContain('(source: https://example.com/q)');
    expect(out).toContain('Related:');
    expect(out).toContain('topic 0');
    expect(out).toContain('topic 4');
    expect(out).not.toContain('topic 5'); // capped at 5
  });

  test('lead falls back through Answer then Definition; definition keeps its source', () => {
    expect(formatAnswer('x', { Answer: 'the answer' })).toContain('the answer');
    expect(formatAnswer('x', { Definition: 'the def', DefinitionURL: 'https://d' })).toContain(
      '(source: https://d)',
    );
  });

  test('an empty answer yields the graceful "nothing found" note citing the query', () => {
    const out = formatAnswer('obscure thing', {});
    expect(out).toContain('No public instant-answer summary');
    expect(out).toContain('obscure thing');
  });

  test('related topics with no Text are filtered out', () => {
    const out = formatAnswer('x', {
      Answer: 'a',
      RelatedTopics: [{ FirstURL: 'https://u' }, { Text: 'keep' }],
    });
    expect(out).toContain('keep');
    expect(out).not.toContain('https://u'); // the text-less topic is dropped
  });
});
