/**
 * SUPER-CREATURE EVOLUTION (V48) — the self-evolving power/appearance arc the directive demands:
 * "they grow like VEGETA and GOKU in POWER and ABILITY … self-evolving evolutionary tale and history …
 * updates every 24 hours … they also change in appearance and evolve like super monsters."
 *
 * A pure, deterministic progression model: the creature accrues XP from living as a dominant, dreaming
 * apex (and from the wingman ASSIST), LEVELS up on a geometric curve, and ASCENDS through **5
 * transformation stages** (BASE → ASCENDED → SUPER → ULTRA → LEGENDARY) — each a power multiplier and a
 * mutation that changes its APPEARANCE (size, hue, glow, spike count). Every milestone is written into an
 * **evolutionary history** (the "tale"). {@link applyDays} is the daemon-cron effect — one call per
 * elapsed day surges its power; the world drives it both on a sim-day cadence AND (in its impure shell)
 * from real wall-clock days persisted across sessions, so the monster grows even while you are away.
 *
 * No clock/`Math.random` in here — leveling is pure, and the only stochastic step ({@link applyDays})
 * takes an injected {@link Rng}; so the whole arc replays from a seed and is unit-tested. It is a
 * META-layer (the super creature's power/look), entirely outside the deterministic population golden.
 */
import type { Rng } from '../math/rng';

/** The five transformation stages (Dragon-Ball-style ascensions). */
export const EVO_STAGES = ['BASE', 'ASCENDED', 'SUPER', 'ULTRA', 'LEGENDARY'] as const;
export type EvoStage = (typeof EVO_STAGES)[number];
/** Level at which each stage unlocks. */
const STAGE_LEVELS = [1, 12, 30, 60, 120];
/** Power multiplier per stage — each transformation is a leap, not a step. */
const STAGE_MULT = [1, 2, 4, 10, 50];

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Appearance deltas the body reads — the creature visibly grows + shifts as it evolves. */
export interface EvoAppearance {
  sizeMul: number; // overall scale (grows with level + stage)
  hueShift: number; // 0..1 colour rotation (shifts each ascension)
  glowMul: number; // emissive multiplier
  spikeBoost: number; // extra spike intensity (= stage)
}

/** One entry in the evolutionary tale. */
export interface EvoEvent {
  day: number;
  level: number;
  stage: EvoStage;
  text: string;
}

/** Telemetry view. */
export interface EvoView {
  level: number;
  stage: number;
  stageName: EvoStage;
  power: number;
  xp: number;
  xpForNext: number;
  mutations: number;
  day: number;
  appearance: EvoAppearance;
  lastEvent: string;
}

export class SuperEvolution {
  level = 1;
  xp = 0;
  stage = 0; // index into EVO_STAGES
  mutations = 0;
  day = 0;
  private readonly hist: EvoEvent[] = [];
  private lastEvent = 'a new monster stirs';

  constructor() {
    this.log('born — BASE form, power 100');
  }

  /** Power level (Goku/Vegeta exponential × the transformation multiplier). "It's over 9000" energy. */
  power(): number {
    return Math.round(100 * Math.pow(1.18, this.level - 1) * (STAGE_MULT[this.stage] ?? 1));
  }
  /** XP to clear the current level (geometric growth). */
  xpForNext(): number {
    return Math.round(60 * Math.pow(1.35, this.level - 1));
  }
  stageName(): EvoStage {
    return EVO_STAGES[this.stage] ?? 'BASE';
  }

  /** Accumulate XP, rolling over level-ups (each may trigger an ascension). */
  gainXp(amount: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    let guard = 0;
    while (this.xp >= this.xpForNext() && guard++ < 100000) {
      this.xp -= this.xpForNext();
      this.level++;
      this.checkAscension();
    }
  }

  /** Advance through any stage thresholds the new level crossed (logs + mutates appearance). */
  private checkAscension(): void {
    while (
      this.stage < EVO_STAGES.length - 1 &&
      this.level >= (STAGE_LEVELS[this.stage + 1] ?? Infinity)
    ) {
      this.stage++;
      this.mutations++;
      this.log(`ASCENDED → ${this.stageName()} at level ${this.level} (power ${this.power()})`);
    }
  }

  /** One beat of passive growth: existing as a dominant, dreaming apex earns XP. `vitality` 0..1. */
  tick(dt: number, vitality: number): void {
    this.gainXp(dt * (3 + 12 * clamp01(vitality)));
  }

  /**
   * The daemon-cron effect: apply `days` elapsed days. Each day is a training surge (≈ a level, varied)
   * + a mutation + a history entry. Bounded catch-up. Deterministic given `rng`.
   */
  applyDays(days: number, rng: Rng): void {
    const n = Math.floor(Math.max(0, Math.min(days, 3650))); // cap a decade of catch-up
    for (let i = 0; i < n; i++) {
      this.day++;
      this.gainXp(this.xpForNext() * (0.6 + 0.8 * rng())); // ~1 level/day, varied
      this.mutations++;
      this.log(`day ${this.day}: trained in the hyperbolic field — power ${this.power()}`);
    }
  }

  /** The appearance the body should render at this evolution. */
  appearance(): EvoAppearance {
    return {
      sizeMul: 1 + 0.03 * (this.level - 1) + 0.15 * this.stage,
      hueShift: (this.stage * 0.13 + (this.level - 1) * 0.004) % 1,
      glowMul: 1 + 0.3 * this.stage,
      spikeBoost: this.stage,
    };
  }

  private log(text: string): void {
    this.hist.push({ day: this.day, level: this.level, stage: this.stageName(), text });
    if (this.hist.length > 250) this.hist.shift();
    this.lastEvent = text;
  }

  /** The evolutionary tale (oldest → newest). */
  history(): readonly EvoEvent[] {
    return this.hist;
  }

  view(): EvoView {
    return {
      level: this.level,
      stage: this.stage,
      stageName: this.stageName(),
      power: this.power(),
      xp: Math.round(this.xp),
      xpForNext: this.xpForNext(),
      mutations: this.mutations,
      day: this.day,
      appearance: this.appearance(),
      lastEvent: this.lastEvent,
    };
  }

  /** Serialize the evolution state (for cross-session persistence — the world owns the storage). */
  serialize(): string {
    return JSON.stringify({
      level: this.level,
      xp: this.xp,
      stage: this.stage,
      mutations: this.mutations,
      day: this.day,
    });
  }

  /** Restore from a serialized blob (best-effort; ignores malformed input). */
  static fromJSON(s: string): SuperEvolution {
    const evo = new SuperEvolution();
    try {
      const o = JSON.parse(s) as Partial<
        Record<'level' | 'xp' | 'stage' | 'mutations' | 'day', number>
      >;
      if (typeof o.level === 'number' && o.level >= 1) evo.level = Math.floor(o.level);
      if (typeof o.xp === 'number' && o.xp >= 0) evo.xp = o.xp;
      if (typeof o.stage === 'number')
        evo.stage = Math.max(0, Math.min(EVO_STAGES.length - 1, Math.floor(o.stage)));
      if (typeof o.mutations === 'number' && o.mutations >= 0)
        evo.mutations = Math.floor(o.mutations);
      if (typeof o.day === 'number' && o.day >= 0) evo.day = Math.floor(o.day);
    } catch {
      /* malformed — keep the fresh BASE creature */
    }
    return evo;
  }
}
