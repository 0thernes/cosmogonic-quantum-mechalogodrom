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
import {
  NhiAction,
  NhiMind,
  type NhiIntent,
  type NhiMindStateSnapshot,
  type NhiPercept,
  type NhiSnapshot,
} from './nhi';

const NHI_SYSTEM_STATE_VERSION = 1 as const;
/** Matches the composition-root live NHI cap and bounds checkpoint validation/allocation.
 *  OWNER 2026-07-15: raised 32 → 1000 ("NHI CAP should be 1000 maximum"). The cap is a CEILING on
 *  the launched population, not an allocation — minds are Map entries created per launch, and the
 *  body system's pairwise social scan is stagger-budgeted so cost stays bounded at full cap. */
export const NHI_SYSTEM_MIND_CAP = 1000;

/** Exact JSON-safe orchestration checkpoint. The shared decision RNG remains caller-owned. */
export interface NhiSystemStateSnapshot {
  readonly version: typeof NHI_SYSTEM_STATE_VERSION;
  readonly beat: number;
  /** Canonical ascending-id order; each mind carries its complete identity and cognition state. */
  readonly minds: readonly {
    readonly id: number;
    readonly state: NhiMindStateSnapshot;
  }[];
}

export type NhiTickPhase = 'lifecycle' | 'percept' | 'think' | 'apply' | 'acknowledge';

/** Structured exceptional path; allocated only when one mind boundary actually fails. */
export interface NhiTickFailure {
  /** Null identifies a population-lifecycle failure before any one mind is selected. */
  readonly id: number | null;
  readonly beat: number;
  readonly phase: NhiTickPhase;
  readonly error: unknown;
  /** A diagnostic callback failure is retained here; it never escapes or starves another mind. */
  readonly reportingError?: unknown;
}

export type NhiTickFailureHandler = (failure: NhiTickFailure) => void;
const NO_TICK_FAILURES: readonly NhiTickFailure[] = Object.freeze([]);

/** Separates any material effect from evidence that may support a narrower GOAP fact. */
export interface NhiActionOutcome {
  readonly effectApplied: boolean;
  /** World evidence for acknowledgement; the mind may reject repeats or unmet preconditions. */
  readonly factSupported: boolean;
  /** Exact number of organism bodies whose material state changed; BROADCAST is always zero. */
  readonly affected: number;
  readonly energyTransferred: number;
}

export function validateNhiActionOutcome(
  action: NhiIntent['action'],
  value: unknown,
): NhiActionOutcome {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('NHI world action outcome must be an object');
  }
  const outcome = value as Partial<NhiActionOutcome>;
  if (typeof outcome.effectApplied !== 'boolean' || typeof outcome.factSupported !== 'boolean') {
    throw new TypeError('NHI world action outcome flags must be boolean');
  }
  if (!Number.isSafeInteger(outcome.affected) || (outcome.affected ?? -1) < 0) {
    throw new RangeError('NHI world action outcome affected count must be a non-negative integer');
  }
  if (
    typeof outcome.energyTransferred !== 'number' ||
    !Number.isFinite(outcome.energyTransferred) ||
    outcome.energyTransferred < 0
  ) {
    throw new RangeError(
      'NHI world action outcome energy transfer must be finite and non-negative',
    );
  }
  if (outcome.factSupported && !outcome.effectApplied) {
    throw new Error('NHI world action cannot support a fact without a material effect');
  }
  if (!outcome.effectApplied && outcome.affected !== 0) {
    throw new Error('NHI world action cannot affect bodies when no effect was applied');
  }
  if (action === NhiAction.BROADCAST && outcome.affected !== 0) {
    throw new Error('NHI BROADCAST cannot report affected bodies');
  }
  if (action !== NhiAction.BROADCAST && outcome.effectApplied && outcome.affected === 0) {
    throw new Error('NHI material body action must report at least one affected body');
  }
  if (outcome.factSupported && outcome.affected === 0) {
    throw new Error('NHI world action cannot support a GOAP fact without an affected body');
  }
  const actionCanSupportFact =
    action === NhiAction.SPAWN_SWARM ||
    action === NhiAction.MANIPULATE ||
    action === NhiAction.DOMINATE ||
    action === NhiAction.HUNT;
  if (outcome.factSupported && !actionCanSupportFact) {
    throw new Error('NHI world action cannot support a GOAP fact for this action');
  }
  if (outcome.energyTransferred > 0 && action !== NhiAction.HUNT) {
    throw new Error('NHI world action energy transfer is valid only for HUNT');
  }
  if (action === NhiAction.SPAWN_SWARM && outcome.factSupported !== outcome.effectApplied) {
    throw new Error('NHI SPAWN fact support must match material child creation');
  }
  if (action === NhiAction.HUNT && outcome.factSupported !== (outcome.energyTransferred ?? 0) > 0) {
    throw new Error('NHI HUNT fact support must match positive energy transfer');
  }
  if (action === NhiAction.HUNT && outcome.energyTransferred > 0 && outcome.affected !== 2) {
    throw new Error('NHI HUNT energy transfer must report both changed bodies');
  }
  if ((action === NhiAction.MIMIC || action === NhiAction.RETREAT) && (outcome.affected ?? 0) > 1) {
    throw new Error('NHI single-body action cannot report more than one affected body');
  }
  if (action === NhiAction.SPAWN_SWARM && (outcome.affected ?? 0) > 6) {
    throw new Error('NHI SPAWN cannot report more than six affected children');
  }
  if (action === NhiAction.HUNT && (outcome.affected ?? 0) > 2) {
    throw new Error('NHI HUNT cannot report more than two affected bodies');
  }
  return outcome as NhiActionOutcome;
}

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
   * Execute `intent` for NHI `id`; distinguish any effect from world evidence that can support a
   * narrower GOAP fact. `utterance` is the already-rendered alien string.
   */
  apply(id: number, intent: NhiIntent, utterance: string): NhiActionOutcome;
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
    if (!Number.isSafeInteger(id) || id < 0) {
      throw new RangeError('NHI system id must be a non-negative safe integer');
    }
    if (this.minds.has(id)) return;
    if (this.minds.size >= NHI_SYSTEM_MIND_CAP) {
      throw new RangeError(`NHI system mind cap ${NHI_SYSTEM_MIND_CAP} exceeded`);
    }
    this.minds.set(id, new NhiMind(rng));
  }

  /** Forget one mind immediately; used by the composition root's transactional retire/rollback path. */
  unregister(id: number): boolean {
    if (!Number.isSafeInteger(id) || id < 0) {
      throw new RangeError('NHI system id must be a non-negative safe integer');
    }
    return this.minds.delete(id);
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

  /** Capture the orchestration beat, stable id order, and every exact mind checkpoint. */
  stateSnapshot(): NhiSystemStateSnapshot {
    return {
      version: NHI_SYSTEM_STATE_VERSION,
      beat: this.beat,
      minds: this.ids().map((id) => ({ id, state: this.minds.get(id)!.stateSnapshot() })),
    };
  }

  /** Build a system clone without consuming any birth or decision RNG. */
  static fromState(snapshot: NhiSystemStateSnapshot): NhiSystem {
    const system = new NhiSystem();
    system.restoreState(snapshot);
    return system;
  }

  /** Validate the full population before atomically replacing the live orchestration state. */
  restoreState(snapshot: NhiSystemStateSnapshot): void {
    if (typeof snapshot !== 'object' || snapshot === null) {
      throw new TypeError('NHI system state must be an object');
    }
    if (snapshot.version !== NHI_SYSTEM_STATE_VERSION) {
      throw new Error('unsupported NHI system state version');
    }
    if (!Number.isSafeInteger(snapshot.beat) || snapshot.beat < 0) {
      throw new RangeError('NHI system state beat must be a non-negative safe integer');
    }
    if (!Array.isArray(snapshot.minds)) {
      throw new TypeError('NHI system state minds must be an array');
    }
    if (snapshot.minds.length > NHI_SYSTEM_MIND_CAP) {
      throw new RangeError(`NHI system state exceeds mind cap ${NHI_SYSTEM_MIND_CAP}`);
    }
    const next = new Map<number, NhiMind>();
    let previousId = -1;
    for (let i = 0; i < snapshot.minds.length; i++) {
      const entry = snapshot.minds[i];
      if (!entry || typeof entry !== 'object') {
        throw new TypeError(`NHI system state minds[${i}] must be an object`);
      }
      if (!Number.isSafeInteger(entry.id) || entry.id < 0) {
        throw new RangeError(`NHI system state minds[${i}].id must be a non-negative safe integer`);
      }
      if (entry.id <= previousId) {
        throw new RangeError('NHI system state minds must be uniquely sorted by ascending id');
      }
      previousId = entry.id;
      next.set(entry.id, NhiMind.fromState(entry.state));
    }
    this.minds.clear();
    for (const [id, mind] of next) this.minds.set(id, mind);
    this.liveScratch.clear();
    this.deadScratch.length = 0;
    this.orderScratch.length = 0;
    this.beat = snapshot.beat;
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
   * Scratch collections are reused across beats. With an error handler, failures are retained in the
   * returned exceptional report while later minds and the single population beat continue. If live-id
   * discovery fails, the registered population is conservatively retained for this beat and each mind
   * still runs behind its own boundary; no possibly-live mind is silently starved.
   */
  tick(rng: Rng, world: NhiWorld, onFailure?: NhiTickFailureHandler): readonly NhiTickFailure[] {
    let failures: NhiTickFailure[] | undefined;
    const report = (failure: NhiTickFailure): void => {
      let reportingError: unknown;
      try {
        onFailure?.(failure);
      } catch (callbackError) {
        reportingError = callbackError;
      }
      (failures ??= []).push(
        reportingError === undefined ? failure : { ...failure, reportingError },
      );
    };

    this.liveScratch.clear();
    try {
      for (const id of world.liveIds()) this.liveScratch.add(id);
    } catch (error) {
      if (onFailure === undefined) throw error;
      report({ id: null, beat: this.beat, phase: 'lifecycle', error });
      // Discovery is untrusted this beat: retain every registered mind. Percept/apply can then fail
      // independently, but one lifecycle adapter fault cannot suppress the whole population.
      this.liveScratch.clear();
      for (const id of this.minds.keys()) this.liveScratch.add(id);
    }
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
      let phase: NhiTickPhase = 'percept';
      try {
        const percept: NhiPercept = { ...world.percept(id), beat: this.beat };
        phase = 'think';
        const intent = mind.think(percept, rng);
        phase = 'apply';
        const outcome = validateNhiActionOutcome(
          intent.action,
          world.apply(id, intent, renderUtterance(intent.utterance)),
        );
        phase = 'acknowledge';
        mind.acknowledge(intent.action, outcome.factSupported);
      } catch (error) {
        if (onFailure === undefined) throw error;
        report({ id, beat: this.beat, phase, error });
      }
    }
    this.beat++;
    return failures ?? NO_TICK_FAILURES;
  }
}
