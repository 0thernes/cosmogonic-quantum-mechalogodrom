import { describe, expect, test } from 'bun:test';
import {
  CREATURE_EXTERIOR_PHENOMENA,
  CREATURE_EXTERIOR_PHENOMENA_COUNT,
  CREATURE_EXTERIOR_TIME_SCALE,
  activeExteriorPhenomena,
  buildCreatureExteriorPhenomena,
} from '../src/sim/creature-exterior-phenomena';

describe('creature-exterior-phenomena', () => {
  test('catalog has exactly 1000 deterministic phenomena', () => {
    const built = buildCreatureExteriorPhenomena();
    expect(built.length).toBe(1000);
    expect(CREATURE_EXTERIOR_PHENOMENA_COUNT).toBe(1000);
    expect(CREATURE_EXTERIOR_PHENOMENA.length).toBe(1000);
    expect(CREATURE_EXTERIOR_PHENOMENA[0]!.id).toBe(0);
    expect(CREATURE_EXTERIOR_PHENOMENA[999]!.id).toBe(999);
  });

  test('activeExteriorPhenomena is deterministic and in range', () => {
    const a = activeExteriorPhenomena(42, 0.5, 4);
    const b = activeExteriorPhenomena(42, 0.5, 4);
    expect(a).toEqual(b);
    for (const idx of a) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(1000);
    }
  });

  test('exterior time scale is calibrated to the slow owner baseline (V116)', () => {
    expect(CREATURE_EXTERIOR_TIME_SCALE).toBe(1.75);
  });
});
