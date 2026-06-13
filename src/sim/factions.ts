/**
 * Faction archetypes (CONTRACTS V9 — "more things, not just Shoggoths and Puppeteers").
 *
 * Eight cosmic-horror/cosmogonic kinds, and — the point of the exercise — EACH thinks with a
 * DIFFERENT pre-2016 AI technique from {@link './ai/brains'}, so they behave recognizably unlike
 * one another even though they share the same percepts:
 *
 *   Watchers   → finite-state machine     (reactive sentry)
 *   Weavers    → behaviour-tree           (prioritised maintenance)
 *   Wardens    → utility / needs scoring  (deliberative argmax)
 *   Heralds    → GOAP-flavoured planning  (means-end: gather then commune)
 *   Leviathans → rule/expert system       (apex predator priorities)
 *   SwarmMinds → boids/flocking heuristics (cohesion-seeking)
 *   Oracles    → Markov chain             (seeded, oblique, prophetic)
 *   Devourers  → tiny fixed-weight MLP    (learned-shaped hunger)
 *
 * `decideFaction` is a PURE function of (faction, percept, rng) → an {@link Intent}; the seeded
 * Markov/fixed-MLP weights are built ONCE at module load from a fixed seed (no per-call alloc, no
 * clock). Leaf module (depends only on Rng + the leaf brains.ts), so it stays acyclic + testable.
 * The composition root assigns a faction per entity (e.g. from its genome) and translates the
 * returned intent into steering — but that wiring is the integrator's, kept out of this leaf.
 */
import type { Rng } from '../math/rng';
import { mulberry32 } from '../math/rng';
import { utilityPick, fsmStep, TinyMLP, MarkovChain, type FsmEdge } from './ai/brains';

/** What an organism wants to do this tick — the common output vocabulary across all factions. */
export const INTENTS = [
  'wander',
  'seek',
  'flee',
  'gather',
  'socialize',
  'hunt',
  'guard',
  'rest',
] as const;
export type Intent = (typeof INTENTS)[number];

/** The classical-AI technique a faction's mind is built on. */
export type FactionTechnique =
  | 'fsm'
  | 'behaviortree'
  | 'utility'
  | 'goap'
  | 'rule'
  | 'boids'
  | 'markov'
  | 'mlp';

/** A faction's economy posture in the social web (extends the titan {energy,matter,entropy}). */
export type EconomyRole = 'producer' | 'consumer' | 'predator' | 'broker' | 'catalyst';

/** Normalized [0,1] world readings an organism's mind reacts to. */
export interface FactionPercept {
  /** Nearby danger. */
  threat: number;
  /** Local crowding. */
  crowd: number;
  /** Own energy reserve. */
  energy: number;
  /** Fraction of nearby kin. */
  kin: number;
  /** Nearby exploitable resource. */
  resource: number;
  /** Unexpectedness of the surroundings. */
  novelty: number;
}

export interface FactionArchetype {
  id: number;
  name: string;
  technique: FactionTechnique;
  /** Identity hue [0,1). */
  hue: number;
  /** Base aggression / sociality [0,1] — colour the techniques' thresholds. */
  aggression: number;
  sociality: number;
  economyRole: EconomyRole;
  blurb: string;
}

/** The eight archetypes. Order is the contract — `id` indexes this array. */
export const FACTIONS: readonly FactionArchetype[] = [
  {
    id: 0,
    name: 'Watchers',
    technique: 'fsm',
    hue: 0.58,
    aggression: 0.3,
    sociality: 0.2,
    economyRole: 'broker',
    blurb: 'Sentinels that snap between watch, pursue, and guard.',
  },
  {
    id: 1,
    name: 'Weavers',
    technique: 'behaviortree',
    hue: 0.83,
    aggression: 0.25,
    sociality: 0.7,
    economyRole: 'producer',
    blurb: 'Tend the web: feed first, then bind kin together.',
  },
  {
    id: 2,
    name: 'Wardens',
    technique: 'utility',
    hue: 0.12,
    aggression: 0.5,
    sociality: 0.4,
    economyRole: 'broker',
    blurb: 'Weigh every need and do the most valuable thing.',
  },
  {
    id: 3,
    name: 'Heralds',
    technique: 'goap',
    hue: 0.45,
    aggression: 0.35,
    sociality: 0.6,
    economyRole: 'catalyst',
    blurb: 'Plan means to ends — gather power, then commune.',
  },
  {
    id: 4,
    name: 'Leviathans',
    technique: 'rule',
    hue: 0.0,
    aggression: 0.9,
    sociality: 0.1,
    economyRole: 'predator',
    blurb: 'Apex rules: when prey is near, the rest is noise.',
  },
  {
    id: 5,
    name: 'SwarmMinds',
    technique: 'boids',
    hue: 0.66,
    aggression: 0.2,
    sociality: 0.95,
    economyRole: 'consumer',
    blurb: 'No leader — cohere, align, and move as one.',
  },
  {
    id: 6,
    name: 'Oracles',
    technique: 'markov',
    hue: 0.75,
    aggression: 0.3,
    sociality: 0.5,
    economyRole: 'catalyst',
    blurb: 'Walk a chain only they can read; act obliquely.',
  },
  {
    id: 7,
    name: 'Devourers',
    technique: 'mlp',
    hue: 0.02,
    aggression: 0.8,
    sociality: 0.3,
    economyRole: 'predator',
    blurb: 'A small wired hunger that maps the world to appetite.',
  },
];

/** Faction count. */
export const FACTION_COUNT = FACTIONS.length;

const intentIndex = (i: number): Intent =>
  INTENTS[((i % INTENTS.length) + INTENTS.length) % INTENTS.length] ?? 'wander';

// ── Fixed, deterministic weights built ONCE at module load (no per-call alloc) ──

/** Devourers' tiny predatory net: 6 percepts → 6 hidden → 4 appetite outputs. Fixed seed. */
const DEVOURER_NET = (() => {
  const rng = mulberry32(0xde7011); // fixed → identical every run
  const w = new Float32Array(TinyMLP.weightCount(6, 6, 4));
  for (let i = 0; i < w.length; i++) w[i] = rng() * 2 - 1;
  return new TinyMLP(6, 6, 4, w);
})();
const DEVOURER_HIDDEN = new Float32Array(6);
const DEVOURER_OUT = new Float32Array(4);
/** Devourer output index → intent. */
const DEVOURER_INTENTS: readonly Intent[] = ['hunt', 'seek', 'gather', 'flee'];

/** Oracles' Markov chain over the 8 intents, with a fixed seeded transition matrix. */
const ORACLE_CHAIN = (() => {
  const rng = mulberry32(0x0deac1e);
  const n = INTENTS.length;
  const w = new Float32Array(n * n);
  for (let i = 0; i < w.length; i++) w[i] = rng();
  return new MarkovChain(n, w);
})();

/** Watchers' FSM edges over a coarse signal derived from the percept. */
interface WatchSignal {
  threat: number;
  novelty: number;
  energy: number;
}
const WATCHER_EDGES: readonly FsmEdge<WatchSignal>[] = [
  { from: 0, to: 2, guard: (s) => s.threat > 0.55 }, // watch → guard
  { from: 0, to: 1, guard: (s) => s.novelty > 0.6 }, // watch → seek
  { from: 0, to: 3, guard: (s) => s.energy < 0.3 }, // watch → rest
  { from: 2, to: 0, guard: (s) => s.threat <= 0.4 }, // guard → watch
  { from: 1, to: 0, guard: (s) => s.novelty <= 0.4 }, // seek → watch
];
/** Watcher FSM state → intent. */
const WATCH_STATE_INTENT: readonly Intent[] = ['guard', 'seek', 'guard', 'rest'];

/**
 * Decide a faction member's intent from its percept. Pure + deterministic given `rng` state.
 * `fsmState` is an optional persistent FSM state (Watchers) the caller threads across frames; pass
 * 0 for stateless use. Allocation-free (module-level scratch for the MLP). O(small).
 */
export function decideFaction(
  factionId: number,
  p: FactionPercept,
  rng: Rng,
  fsmState = 0,
): { intent: Intent; nextState: number } {
  const f = FACTIONS[((factionId % FACTION_COUNT) + FACTION_COUNT) % FACTION_COUNT];
  if (!f) return { intent: 'wander', nextState: 0 };

  switch (f.technique) {
    case 'fsm': {
      const next = fsmStep(fsmState, WATCHER_EDGES, {
        threat: p.threat,
        novelty: p.novelty,
        energy: p.energy,
      });
      return { intent: WATCH_STATE_INTENT[next] ?? 'guard', nextState: next };
    }
    case 'behaviortree': {
      // Selector: survive → tend kin → explore (Weavers maintain the web).
      if (p.energy < 0.4) return { intent: 'gather', nextState: fsmState };
      if (p.crowd > 0.5 || p.kin > 0.4) return { intent: 'socialize', nextState: fsmState };
      return { intent: 'seek', nextState: fsmState };
    }
    case 'utility': {
      // Score every intent from the percept + faction disposition; argmax (Wardens deliberate).
      const scores = [
        0.15 + p.novelty * 0.2, // wander
        p.novelty * 0.6 + p.resource * 0.2, // seek
        p.threat * (1 - f.aggression), // flee
        (1 - p.energy) * 0.9 + p.resource * 0.3, // gather
        p.crowd * f.sociality, // socialize
        p.resource * f.aggression * 0.5, // hunt (driven by prey/resource × aggression)
        p.threat * (0.4 + f.aggression * 0.4), // guard
        (1 - p.energy) * 0.2 + (p.threat < 0.2 ? 0.2 : 0), // rest
      ];
      return { intent: intentIndex(utilityPick(scores)), nextState: fsmState };
    }
    case 'goap': {
      // Means-end (Heralds): goal = commune; precondition = enough energy. Plan one step.
      if (p.threat > 0.7) return { intent: 'flee', nextState: fsmState };
      if (p.energy < 0.5) return { intent: 'gather', nextState: fsmState }; // satisfy precondition
      return { intent: 'socialize', nextState: fsmState }; // goal reached → commune
    }
    case 'rule': {
      // Apex predator priorities (Leviathans): prey > resource > territory; never flee.
      if (p.resource > 0.4 || p.crowd > 0.5) return { intent: 'hunt', nextState: fsmState };
      if (p.energy < 0.35) return { intent: 'gather', nextState: fsmState };
      if (p.novelty > 0.6) return { intent: 'seek', nextState: fsmState };
      return { intent: 'guard', nextState: fsmState };
    }
    case 'boids': {
      // Flock (SwarmMinds): cohere toward kin/crowd unless real danger scatters them.
      if (p.threat > 0.75) return { intent: 'flee', nextState: fsmState };
      if (p.crowd > 0.35 || p.kin > 0.3) return { intent: 'socialize', nextState: fsmState };
      return { intent: 'seek', nextState: fsmState }; // cohere toward distant others
    }
    case 'markov': {
      // Oracles walk a seeded chain; current state biased by novelty so they read the "omens".
      const start = Math.min(INTENTS.length - 1, Math.floor(p.novelty * INTENTS.length));
      const next = ORACLE_CHAIN.next(start, rng);
      return { intent: intentIndex(next), nextState: fsmState };
    }
    case 'mlp': {
      // Devourers: a fixed wired hunger maps percepts → appetite; argmax output → intent.
      DEVOURER_NET.forward(
        [p.threat, p.crowd, p.energy, p.kin, p.resource, p.novelty],
        DEVOURER_HIDDEN,
        DEVOURER_OUT,
      );
      const k = utilityPick(DEVOURER_OUT);
      return { intent: DEVOURER_INTENTS[k] ?? 'hunt', nextState: fsmState };
    }
    default:
      return { intent: 'wander', nextState: fsmState };
  }
}
