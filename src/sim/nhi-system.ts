/**
 * NHI action orchestrator (CONTRACTS V10) — the layer that makes the {@link NhiMind} ACT on the
 * world, ending the "NHI float and do nothing" complaint.
 *
 * It owns one mind per launched NHI, and each beat: drops any NHI that has died, builds a percept
 * from the world, runs the apex decision, and applies the resulting {@link NhiIntent} as a real
 * effect — spawn ordinary minions, dominate/manipulate the local field, hunt or mimic the exact
 * perceived organism, or broadcast an utterance. The world is reached ONLY through the injected
 * {@link NhiWorld} facade, so this whole orchestrator is DOM-free and unit-testable with a mock; the
 * world.ts adapter (which touches the
 * EntityManager, factions, HUD and audio) is the only piece that knows three.js. Deterministic: a
 * single injected seeded {@link Rng} drives every mind, in a fixed id order.
 */
import type { Rng } from '../math/rng';
import { NhiMind, type NhiIntent, type NhiPercept, type NhiSnapshot } from './nhi';

/** Alien voice alphabet (one syllable per Markov glyph state, 0..11) — the "unknown bizarre noises". */
const VOICE = [
  'xa',
  'thuu',
  'rrl',
  'ngk',
  'vox',
  'sss',
  'oom',
  'kth',
  'iir',
  'wub',
  'zha',
  'qq',
] as const;

/** Render a Markov glyph walk into a pronounceable alien utterance (for the toast + SFX mapping). */
export function renderUtterance(glyphs: readonly number[]): string {
  let out = '';
  for (let i = 0; i < glyphs.length; i++) out += VOICE[glyphs[i] ?? 0] ?? 'xx';
  return out.toUpperCase();
}

/**
 * The world surface an NHI can sense and disturb — injected so the orchestrator stays pure/testable.
 * The world.ts adapter implements it against the real EntityManager / factions / HUD / audio.
 */
export interface NhiWorld {
  /** Ids of NHIs still alive this beat; the orchestrator forgets every id NOT returned here. */
  liveIds(): readonly number[];
  /** The percept for NHI `id` (everything except `beat`, which the orchestrator stamps). */
  percept(id: number): Omit<NhiPercept, 'beat'>;
  /**
   * Execute `intent` for NHI `id`; return whether its corresponding GOAP fact materially occurred.
   * `utterance` is the already-rendered alien string.
   */
  apply(id: number, intent: NhiIntent, utterance: string): boolean;
}

/** Owns the launched NHIs' minds and drives their decisions against an injected world. */
export class NhiSystem {
  private readonly minds = new Map<number, NhiMind>();
  private readonly liveScratch = new Set<number>();
  private readonly deadScratch: number[] = [];
  private readonly orderScratch: number[] = [];
  private beat = 0;

  /** Birth a mind for a newly-launched NHI `id` from the seeded rng. Idempotent per id. */
  register(id: number, rng: Rng): void {
    if (!this.minds.has(id)) this.minds.set(id, new NhiMind(rng));
  }

  /** Number of NHIs currently driven (telemetry). */
  get count(): number {
    return this.minds.size;
  }

  /** Ascending ids of the minds currently driven — the Observatory cycles focus through these. */
  ids(): number[] {
    return [...this.minds.keys()].sort((a, b) => a - b);
  }

  /** Live cognitive snapshot for NHI `id` (the 3×3 grid's data), or null if it isn't driven. */
  snapshot(id: number): NhiSnapshot | null {
    return this.minds.get(id)?.snapshot() ?? null;
  }

  /** Allocation-free affect read used by live NHI social sensing. */
  moodOf(id: number): number | null {
    return this.minds.get(id)?.moodValue() ?? null;
  }

  /** Forget the entire launched population synchronously (Genesis/reset lifecycle boundary). */
  clear(): void {
    this.minds.clear();
    this.liveScratch.clear();
    this.deadScratch.length = 0;
    this.orderScratch.length = 0;
    this.beat = 0;
  }

  /**
   * One decision beat for every live NHI: forget the dead, then percept → think → apply, in ascending
   * id order (deterministic). The single `rng` is shared across minds this beat. Internal lifecycle
   * traversal is O(M), ordering is O(M log M), and injected percept/apply callback costs are external.
   * Scratch collections are reused across beats.
   */
  tick(rng: Rng, world: NhiWorld): void {
    this.liveScratch.clear();
    for (const id of world.liveIds()) this.liveScratch.add(id);
    // Snapshot dead ids first (don't delete from the Map mid-iteration), then forget them.
    this.deadScratch.length = 0;
    for (const id of this.minds.keys()) {
      if (!this.liveScratch.has(id)) this.deadScratch.push(id);
    }
    for (const id of this.deadScratch) this.minds.delete(id);
    this.orderScratch.length = 0;
    for (const id of this.minds.keys()) this.orderScratch.push(id);
    this.orderScratch.sort((a, b) => a - b);
    for (const id of this.orderScratch) {
      const mind = this.minds.get(id);
      if (!mind) continue;
      const percept: NhiPercept = { ...world.percept(id), beat: this.beat };
      const intent = mind.think(percept, rng);
      const factAchieved = world.apply(id, intent, renderUtterance(intent.utterance));
      mind.acknowledge(intent.action, factAchieved);
    }
    this.beat++;
  }
}
