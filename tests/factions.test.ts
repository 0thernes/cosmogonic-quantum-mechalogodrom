import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../src/math/rng';
import {
  FACTIONS,
  FACTION_COUNT,
  INTENTS,
  decideFaction,
  type Intent,
  type FactionPercept,
} from '../src/sim/factions';

const P = (o: Partial<FactionPercept>): FactionPercept => ({
  threat: 0,
  crowd: 0,
  energy: 0.5,
  kin: 0,
  resource: 0,
  novelty: 0,
  ...o,
});

describe('faction registry', () => {
  test('there are 8 archetypes with sequential ids and 8 distinct techniques', () => {
    expect(FACTION_COUNT).toBe(8);
    FACTIONS.forEach((f, i) => expect(f.id).toBe(i));
    expect(new Set(FACTIONS.map((f) => f.technique)).size).toBe(8);
  });
});

describe('decideFaction validity', () => {
  test('returns a valid intent for every faction across varied percepts', () => {
    const percepts = [
      P({ threat: 0.9 }),
      P({ resource: 0.9, crowd: 0.7 }),
      P({ energy: 0.1 }),
      P({ novelty: 0.9 }),
      P({ kin: 0.8, crowd: 0.6 }),
    ];
    for (let id = 0; id < FACTION_COUNT; id++) {
      for (const p of percepts) {
        const { intent } = decideFaction(id, p, mulberry32(id * 7 + 1));
        expect(INTENTS.includes(intent)).toBe(true);
      }
    }
  });
  test('out-of-range faction id wraps (never throws)', () => {
    const r = decideFaction(99, P({}), mulberry32(1));
    expect(INTENTS.includes(r.intent)).toBe(true);
  });
});

describe('decideFaction determinism', () => {
  test('same faction + percept + seed ⇒ same intent', () => {
    const p = P({ threat: 0.3, novelty: 0.7, resource: 0.4 });
    for (let id = 0; id < FACTION_COUNT; id++) {
      const a = decideFaction(id, p, mulberry32(42));
      const b = decideFaction(id, p, mulberry32(42));
      expect(a.intent).toBe(b.intent);
      expect(a.nextState).toBe(b.nextState);
    }
  });
});

describe('factions are genuinely different minds', () => {
  test('the same percept does NOT yield one uniform intent across factions', () => {
    const p = P({ threat: 0.9, crowd: 0.6, energy: 0.5, resource: 0.7, novelty: 0.5 });
    const intents = new Set<Intent>();
    for (let id = 0; id < FACTION_COUNT; id++)
      intents.add(decideFaction(id, p, mulberry32(3)).intent);
    expect(intents.size).toBeGreaterThan(1);
  });
  test('apex Leviathans hunt where peaceful SwarmMinds flee under heavy threat + prey', () => {
    const p = P({ threat: 0.9, crowd: 0.6, resource: 0.7 });
    const lev = FACTIONS.findIndex((f) => f.name === 'Leviathans');
    const swarm = FACTIONS.findIndex((f) => f.name === 'SwarmMinds');
    expect(decideFaction(lev, p, mulberry32(1)).intent).toBe('hunt');
    expect(decideFaction(swarm, p, mulberry32(1)).intent).toBe('flee');
  });
});

describe('Watchers FSM threads state', () => {
  test('high threat drives the watch state to guard', () => {
    const watcher = FACTIONS.findIndex((f) => f.technique === 'fsm');
    const r = decideFaction(watcher, P({ threat: 0.9 }), mulberry32(1), 0);
    expect(r.nextState).toBe(2); // guard state
    expect(r.intent).toBe('guard');
  });
});

describe('Oracles Markov is seeded', () => {
  test('same seed reproduces the oracle walk; different seeds may diverge', () => {
    const oracle = FACTIONS.findIndex((f) => f.technique === 'markov');
    const p = P({ novelty: 0.5 });
    const a = decideFaction(oracle, p, mulberry32(7)).intent;
    const b = decideFaction(oracle, p, mulberry32(7)).intent;
    expect(a).toBe(b);
  });
});
