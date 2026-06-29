import { describe, expect, test } from 'bun:test';
import {
  APEX_THOUGHT_VARIATIONS,
  activeThoughtVariation,
  thoughtVariationCounts,
} from '../src/sim/apex-thought-variations';

describe('APEX thought variations — 100 substrate catalog', () => {
  test('catalog has exactly 100 entries across 7 families', () => {
    expect(APEX_THOUGHT_VARIATIONS.length).toBe(100);
    const counts = thoughtVariationCounts();
    expect(counts.psychology).toBe(15);
    expect(counts.neuroscience).toBe(20);
    expect(counts.quantum).toBe(15);
    expect(counts.neuromorphic).toBe(15);
    expect(counts.wet).toBe(10);
    expect(counts.alife).toBe(15);
    expect(counts.empowerment).toBe(10);
  });

  test('activeThoughtVariation is deterministic', () => {
    const a = activeThoughtVariation(42, 0.5, 100);
    const b = activeThoughtVariation(42, 0.5, 100);
    expect(a.id).toBe(b.id);
    expect(a.name).toBe(b.name);
  });
});
