/**
 * RENDER-SIDE FRAME-TIME GOVERNOR (render layer — NOT src/sim, NOT src/math).
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
  dprScale: [1.0, 0.85, 0.65, 0.65, 0.65],
};

export interface GovernorState {
  readonly level: Level;
  readonly ema: number;
  readonly dwell: number;
  readonly initialized: boolean;
}

export function initialState(level: Level = Level.FULL): GovernorState {
  return { level, ema: 0, dwell: 0, initialized: false };
}

export function deriveMaxLevel(bootShadows: boolean): Level {
  return bootShadows ? Level.SHADOWS_OFF : Level.FX_OFF;
}

export interface LevelPlan {
  readonly dprScale: number;
  readonly fxOn: boolean;
  readonly shadowsOn: boolean;
}

export function planForLevel(
  level: Level,
  bootShadows: boolean,
  cfg: GovernorConfig = DEFAULT_CONFIG,
): LevelPlan {
  return {
    dprScale: cfg.dprScale[level] ?? 1.0,
    fxOn: level < Level.FX_OFF,
    shadowsOn: bootShadows && level < Level.SHADOWS_OFF,
  };
}

export function decideLevel(
  state: GovernorState,
  dtMs: number,
  cfg: GovernorConfig = DEFAULT_CONFIG,
  maxLevel: Level = Level.SHADOWS_OFF,
): GovernorState {
  if (!Number.isFinite(dtMs) || dtMs < 0) {
    return { ...state, dwell: 0 };
  }
  if (dtMs >= cfg.tabGapMs) {
    return { ...state, dwell: 0 };
  }
  if (!state.initialized) {
    const seed = Math.min(dtMs, cfg.outlierMs);
    return { level: state.level, ema: seed, dwell: 0, initialized: true };
  }
  const clamped = Math.min(dtMs, cfg.outlierMs);
  const ema = state.ema + cfg.alpha * (clamped - state.ema);
  if (dtMs >= cfg.panicMs && state.level < maxLevel) {
    return { level: (state.level + 1) as Level, ema, dwell: 0, initialized: true };
  }
  if (ema > cfg.shedMs && state.level < maxLevel) {
    const dwell = state.dwell + 1;
    if (dwell >= cfg.shedDwellFrames) {
      return { level: (state.level + 1) as Level, ema, dwell: 0, initialized: true };
    }
    return { level: state.level, ema, dwell, initialized: true };
  }
  if (ema < cfg.restoreMs && state.level > Level.FULL) {
    const dwell = state.dwell + 1;
    if (dwell >= cfg.restoreDwellFrames) {
      return { level: (state.level - 1) as Level, ema, dwell: 0, initialized: true };
    }
    return { level: state.level, ema, dwell, initialized: true };
  }
  return { level: state.level, ema, dwell: 0, initialized: true };
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
