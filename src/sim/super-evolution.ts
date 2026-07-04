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
/**
 * First ascension summit (V63). Level 100 unlocks LEGENDARY + the MONOLITH TEMPLE, but research
 * growth continues beyond it; this is no longer a hard cap.
 */
export const MAX_LEVEL = 100;
/** Level at which each stage unlocks — re-tiered (V63) so LEGENDARY is the level-100 summit. */
const STAGE_LEVELS = [1, 10, 25, 50, 100];
/** Power multiplier per stage — each transformation is a leap, not a step. */
const STAGE_MULT = [1, 2, 4, 10, 50];
/**
 * The TEN godlike powers (V63) — one is granted **automatically every 10 levels** (L10…L100), so
 * the apex wears `floor(level/10)` of them. The last, GODHEAD HALO, lands at the level-100 ascension.
 */
export const GODLIKE_POWERS = [
  'KAIO AURA',
  'PHASE STEP',
  'GRAVITY WELL',
  'TIME DILATION',
  'MIND DOMINION',
  'MATTER FORGE',
  'STARFIRE BURST',
  'VOID ANCHOR',
  'COSMIC RECALL',
  'GODHEAD HALO',
] as const;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Appearance deltas the body reads — the creature visibly grows + shifts as it evolves. */
export interface EvoAppearance {
  sizeMul: number; // overall scale (grows with level + stage + milestone tier)
  hueShift: number; // 0..1 colour rotation (shifts each ascension + milestone)
  glowMul: number; // emissive multiplier
  spikeBoost: number; // extra spike intensity (= stage, +2 at the apex)
  /** V63: 0..1 ascension aura — ramps over the milestones, hits 1 at LV100 (the SS3/Neo blaze). */
  aura: number;
  /** V63+: milestone tier crossed = floor(level/10); keeps growing beyond the LV100 summit. */
  tier: number;
  /** V63: true from the level-100 summit onward (the body should fully blaze + shimmer). */
  ascended: boolean;
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
  /** V63: the godlike powers unlocked so far (one per 10 levels). */
  powers: readonly string[];
  /** V63: the first ascension summit level (100), not a growth cap. */
  maxLevel: number;
  /** V63: true once the LV100 ascension end-state is reached. */
  ascended: boolean;
}

export class SuperEvolution {
  level = 1;
  xp = 0;
  stage = 0; // index into EVO_STAGES
  mutations = 0;
  day = 0;
  private readonly hist: EvoEvent[] = [];
  private lastEvent = 'a new monster stirs';
  /** V63: highest 10-level milestone already announced (derived from level; never re-fires). */
  private lastMilestone = 0;
  /** V63: the milestone level the world has yet to react to (sound/light), 0 when none pending. */
  private pendingMilestone = 0;

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
  /** V63: true at the LV100 summit — the SS3/Neo ascension end-state (the world raises the temple). */
  get ascended(): boolean {
    return this.level >= MAX_LEVEL;
  }
  /** V63: the godlike powers unlocked so far — one automatically every 10 levels (LV10…LV100). */
  powers(): readonly string[] {
    const n = Math.min(GODLIKE_POWERS.length, Math.floor(this.level / 10));
    return GODLIKE_POWERS.slice(0, n);
  }
  /**
   * V63: drain the pending milestone (the 10-level threshold just crossed: 10…100, or 0 when none).
   * The world reacts ONCE per crossing — a sound + a light flash, and at 100 the ascension end-state.
   */
  takeMilestone(): number {
    const m = this.pendingMilestone;
    this.pendingMilestone = 0;
    return m;
  }

  /** Accumulate XP, rolling over level-ups (each may trigger an ascension). Uncapped beyond LV100. */
  gainXp(amount: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    let guard = 0;
    while (guard++ < 100000) {
      const need = this.xpForNext();
      if (!Number.isFinite(need) || need <= 0 || this.xp < need) break;
      this.xp -= need;
      this.level++;
      this.checkAscension();
    }
    this.detectMilestone();
  }

  /** V63: arm the world's reaction when the level crosses a new 10-level milestone (incl. the LV100 apex). */
  private detectMilestone(): void {
    const m = Math.floor(this.level / 10) * 10;
    if (m < 10 || m <= this.lastMilestone) return;
    this.lastMilestone = m;
    this.pendingMilestone = m;
    const last = this.powers()[this.powers().length - 1] ?? 'a godlike power';
    this.log(
      m === MAX_LEVEL
        ? '⚡ ASCENSION — LEGENDARY apex; the MONOLITH TEMPLE rises (Stage 2 portal opens)'
        : m > MAX_LEVEL
          ? `post-ascension LV ${m} — research scale expands beyond the first summit`
          : `evolved to LV ${m} — granted ${last}`,
    );
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

  /**
   * One beat of passive growth: existing as a dominant, dreaming apex earns XP. `vitality` 0..1.
   *
   * XP is granted as a FRACTION of the current {@link xpForNext}, not a fixed absolute amount. The
   * power curve is geometric (×1.35 per level), so a fixed XP trickle is swamped past ~LV5 and the
   * level visibly STALLS (the bug the owner reported: "experience is stagnant, never reaches 100").
   * Scaling the grant to the level keeps the climb STEADY — a fully-dominant apex advances roughly
   * one level every few seconds of play and can actually reach the LV100 summit, while a dormant one
   * still creeps forward (the 0.02 floor) so it is never frozen. The power/visual leap stays exponential.
   */
  tick(dt: number, vitality: number): void {
    const v = clamp01(vitality);
    this.gainXp(this.xpForNext() * dt * (0.02 + 0.1 * v));
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

  /**
   * The appearance the body should render at this evolution (V63: morphs harder at every 10-level
   * milestone — bigger, more spikes, a shifting hue, and an `aura` that reaches 1 at the LV100
   * ascension, then the body keeps scaling through post-summit research tiers.
   */
  appearance(): EvoAppearance {
    const tier = Math.floor(this.level / 10);
    const asc = this.level >= MAX_LEVEL;
    return {
      sizeMul: 1 + 0.04 * (this.level - 1) + 0.2 * this.stage + 0.1 * tier,
      hueShift: (this.stage * 0.13 + tier * 0.07 + (this.level - 1) * 0.004) % 1,
      glowMul: 1 + 0.3 * this.stage + 0.12 * tier,
      spikeBoost: this.stage + (asc ? 2 : 0),
      aura: clamp01(tier / 10),
      tier,
      ascended: asc,
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
      powers: this.powers(),
      maxLevel: MAX_LEVEL,
      ascended: this.ascended,
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
      // Number.isFinite guards reject NaN AND ±Infinity: `Infinity >= 0` is true, so a tampered/
      // corrupt localStorage blob with `xp: Infinity` would otherwise slip past `>= 0` and poison the
      // catch-up loop / progress readout (audit 2026-06-15). `level` is additionally clamped below.
      if (Number.isFinite(o.level) && (o.level as number) >= 1)
        evo.level = Math.floor(o.level as number);
      if (Number.isFinite(o.xp) && (o.xp as number) >= 0) evo.xp = o.xp as number;
      if (Number.isFinite(o.stage))
        evo.stage = Math.max(0, Math.min(EVO_STAGES.length - 1, Math.floor(o.stage as number)));
      if (Number.isFinite(o.mutations) && (o.mutations as number) >= 0)
        evo.mutations = Math.floor(o.mutations as number);
      if (Number.isFinite(o.day) && (o.day as number) >= 0) evo.day = Math.floor(o.day as number);
    } catch {
      /* malformed — keep the fresh BASE creature */
    }
    // V63: seed the milestone tracker from the restored level so it never re-announces past tiers.
    evo.lastMilestone = Math.floor(evo.level / 10) * 10;
    return evo;
  }
}
