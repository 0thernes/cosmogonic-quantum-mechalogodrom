/**
 * RENDER & COMPUTE-CADENCE FRAME GOVERNOR (`src/core/frame-governor.ts`).
 *
 * Preserves 100% visual fidelity (`Level.FULL`: full DPR, post-FX, and shadows are
 * never dumbed down) while computing an adaptive per-subsystem compute-cadence plan
 * (`ComputeCadencePlan`) from the rolling frame-time EMA so greedy CPU subsystems
 * stagger their heavy passes to maintain 30-60 FPS in the browser.
 */
import type { Engine } from './engine';

export enum Level {
  FULL = 0,
  DPR_85 = 1,
  DPR_65 = 2,
  FX_OFF = 3,
  SHADOWS_OFF = 4,
}

export interface GovernorConfig {
  readonly alpha: number;
  readonly shedMs: number;
  readonly restoreMs: number;
  readonly panicMs: number;
  readonly tabGapMs: number;
  readonly outlierMs: number;
  readonly shedDwellFrames: number;
  readonly restoreDwellFrames: number;
  readonly dprScale: readonly number[];
}

export const DEFAULT_CONFIG: GovernorConfig = {
  alpha: 0.1,
  shedMs: 33,
  restoreMs: 20,
  panicMs: 320,
  tabGapMs: 1000,
  outlierMs: 500,
  shedDwellFrames: 18,
  restoreDwellFrames: 180,
  dprScale: [1.0, 1.0, 1.0, 1.0, 1.0],
};

export interface GovernorState {
  readonly level: Level;
  readonly ema: number;
  readonly dwell: number;
  readonly initialized: boolean;
}

export interface ComputeCadencePlan {
  /** Frame stride for 256x256 Gray-Scott reaction-diffusion PDE + texture upload. */
  readonly reactionDiffusionStride: number;
  /** Frame stride for O(N^2) Connectome spatial link rebuilding (GPU shader uTime still updates every frame). */
  readonly connectomeRebuildStride: number;
  /** Cohort divisor for the 100 pantheon glyph brains (e.g. 4 => 25 full 25k-param brains/frame). */
  readonly glyphCohortStride: number;
  /** Frame stride for heavy SuperMind / emergence / Tsotchke wave sub-phases. */
  readonly superMindHeavyStride: number;
  /** Frame stride for Tsotchke October 2026 Flagship + Wave-2 Zig WASM substrates. */
  readonly tsotchkeWaveStride: number;
  /** Current FPS band classification. */
  readonly targetFpsBand: '60fps' | '30-60fps' | '30fps-guarded';
}

export function deriveComputeCadence(emaMs: number): ComputeCadencePlan {
  if (!Number.isFinite(emaMs) || emaMs <= 16.67) {
    return {
      reactionDiffusionStride: 2,
      connectomeRebuildStride: 2,
      glyphCohortStride: 2,
      superMindHeavyStride: 2,
      tsotchkeWaveStride: 12,
      targetFpsBand: '60fps',
    };
  }
  if (emaMs <= 28.0) {
    return {
      reactionDiffusionStride: 2,
      connectomeRebuildStride: 3,
      glyphCohortStride: 4,
      superMindHeavyStride: 3,
      tsotchkeWaveStride: 16,
      targetFpsBand: '30-60fps',
    };
  }
  return {
    reactionDiffusionStride: 3,
    connectomeRebuildStride: 4,
    glyphCohortStride: 5,
    superMindHeavyStride: 4,
    tsotchkeWaveStride: 20,
    targetFpsBand: '30fps-guarded',
  };
}

export function initialState(level: Level = Level.FULL): GovernorState {
  return { level, ema: 0, dwell: 0, initialized: false };
}

export function deriveMaxLevel(_bootShadows: boolean): Level {
  return Level.FULL;
}

export interface LevelPlan {
  readonly dprScale: number;
  readonly fxOn: boolean;
  readonly shadowsOn: boolean;
}

export function planForLevel(
  _level: Level,
  bootShadows: boolean,
  _cfg: GovernorConfig = DEFAULT_CONFIG,
): LevelPlan {
  return {
    dprScale: 1.0,
    fxOn: true,
    shadowsOn: bootShadows,
  };
}

export function decideLevel(
  state: GovernorState,
  dtMs: number,
  cfg: GovernorConfig = DEFAULT_CONFIG,
  _maxLevel: Level = Level.SHADOWS_OFF,
): GovernorState {
  if (!Number.isFinite(dtMs) || dtMs < 0) {
    return { ...state, level: Level.FULL, dwell: 0 };
  }
  if (dtMs >= cfg.tabGapMs) {
    return { ...state, level: Level.FULL, dwell: 0 };
  }
  if (!state.initialized) {
    const seed = Math.min(dtMs, cfg.outlierMs);
    return { level: Level.FULL, ema: seed, dwell: 0, initialized: true };
  }
  const clamped = Math.min(dtMs, cfg.outlierMs);
  const ema = state.ema + cfg.alpha * (clamped - state.ema);
  return { level: Level.FULL, ema, dwell: 0, initialized: true };
}

export class RenderGovernor {
  private state: GovernorState;
  private applied: Level = -1 as Level;
  private readonly cfg: GovernorConfig;
  private readonly bootShadows: boolean;
  private readonly maxLevel: Level;

  constructor(bootShadows: boolean, cfg: GovernorConfig = DEFAULT_CONFIG) {
    this.cfg = cfg;
    this.bootShadows = bootShadows;
    this.maxLevel = deriveMaxLevel(bootShadows);
    this.state = initialState(Level.FULL);
  }

  observe(dtSeconds: number): Level {
    this.state = decideLevel(this.state, dtSeconds * 1000, this.cfg, this.maxLevel);
    return this.state.level;
  }

  /** Returns the adaptive compute-cadence schedule for the current rolling frame-time EMA. */
  computeCadence(): ComputeCadencePlan {
    return deriveComputeCadence(this.state.ema);
  }

  reset(): void {
    this.state = initialState(this.state.level);
  }

  apply(engine: Engine): void {
    if (this.state.level === this.applied) return;
    this.push(engine);
  }

  reassert(engine: Engine): void {
    this.applied = -1 as Level;
    this.push(engine);
  }

  private push(engine: Engine): void {
    const plan = planForLevel(this.state.level, this.bootShadows, this.cfg);
    engine.setPixelRatioScale(plan.dprScale);
    engine.setPostFxSuspended(!plan.fxOn);
    engine.setShadowsEnabled(plan.shadowsOn);
    this.applied = this.state.level;
  }

  get level(): Level {
    return this.state.level;
  }

  get emaMs(): number {
    return this.state.ema;
  }
}
