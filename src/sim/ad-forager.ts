/**
 * AD-GRADIENT FORAGER — a standalone reference kernel that senses a food field by exact reverse-mode automatic
 * differentiation (Eshkol Wengert tape, {@link ../math/eshkol-ad}) and climbs its gradient, instead of
 * wandering. It consumes the exact AD engine outside the coupling-critical apex (`super-mind.ts`) and
 * provides a reproducible controller baseline. It is not wired into the live EntityManager population;
 * live ordinary-entity ecology goals are implemented separately in `entity-brain.ts`.
 *
 * The point (and the honest claim it licenses): gradient-ascent on a differentiable food potential is
 * a REAL adaptive behaviour that provably beats an unbiased random walk — measured over many seeds,
 * with a mandatory ablation arm (zero the sensed gradient → the forager regresses to the random-walk
 * mean, proving the gradient is load-bearing, not decorative). See tests/ad-forager-baseline.test.ts.
 *
 * Determinism: the food potential + its gradient are PURE (exact AD, no rng). The random-walk control
 * and the ‖∇f‖≈0 fallback draw from a seeded {@link Rng}; there is no Math.random / Date.now anywhere.
 */

import type { Rng } from '../math/rng';
import { TAU } from '../math/scalar';
import {
  adTapeNew,
  adTapeReset,
  adConst,
  adVar,
  adAdd,
  adSub,
  adMul,
  adExp,
  adBackward,
  adGradient,
  adValue,
  type AdTape,
} from '../math/eshkol-ad';

/** A Gaussian food source: amplitude `amp` centred at (x, z) with spread `sigma` (shared per field). */
export interface FoodSource {
  x: number;
  z: number;
  amp: number;
}

export interface ForagerConfig {
  /** Gaussian spread of every source (world-units²). Larger = smoother, longer-range gradient. */
  sigma: number;
  /** Step length per tick (world-units). */
  step: number;
  /** Reached when within this distance of ANY source centre. */
  reachRadius: number;
  /** Hard cap on ticks; a forager that never reaches returns steps = maxSteps, reached = false. */
  maxSteps: number;
  /** Arena half-extent; position is clamped to [-bound, bound]² so a walker can't escape to infinity. */
  bound: number;
}

export interface ForagerResult {
  /** Ticks taken to reach a source (or maxSteps if never reached). */
  steps: number;
  reached: boolean;
  /** Food potential at the final position — higher = closer to the smell of food. */
  finalPotential: number;
}

export type ForagerMode = 'gradient' | 'random';

/**
 * Differentiable food potential f(p) = Σ ampᵢ · exp(−‖p − cᵢ‖² / σ) and its EXACT gradient ∇f, via
 * reverse-mode AD (not finite differences). Records the whole Gaussian-sum on the reused tape, runs a
 * single backward pass, and reads ∂f/∂x, ∂f/∂z off the two variable leaves. Allocation-free after the
 * tape exists (tape is reset each call). Pure — identical inputs → identical bytes out.
 */
export function foodPotentialGradient(
  tape: AdTape,
  x: number,
  z: number,
  sources: readonly FoodSource[],
  sigma: number,
): { value: number; gx: number; gz: number } {
  adTapeReset(tape);
  const xv = adVar(tape, x);
  const zv = adVar(tape, z);
  const negInvSigma = adConst(tape, -1 / sigma);
  let acc = adConst(tape, 0);
  for (const s of sources) {
    const dx = adSub(tape, xv, adConst(tape, s.x));
    const dz = adSub(tape, zv, adConst(tape, s.z));
    const r2 = adAdd(tape, adMul(tape, dx, dx), adMul(tape, dz, dz));
    // ampᵢ · exp(−r²/σ)
    const term = adMul(tape, adConst(tape, s.amp), adExp(tape, adMul(tape, r2, negInvSigma)));
    acc = adAdd(tape, acc, term);
  }
  adBackward(tape, acc);
  return { value: adValue(tape, acc), gx: adGradient(tape, xv), gz: adGradient(tape, zv) };
}

/** Nearest-source distance — the reach test + a cheap final-potential-free progress probe. */
function nearestDist(x: number, z: number, sources: readonly FoodSource[]): number {
  let best = Infinity;
  for (const s of sources) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Run one forager to food and return its step count.
 *
 * - `mode === 'gradient'` (and `!ablate`): step η·∇f/‖∇f‖ — climb the exact AD gradient of the food
 *   potential toward the nearest/strongest source. Falls back to a seeded random step only where the
 *   field is genuinely flat (‖∇f‖ ≈ 0), which a Gaussian sum almost never is.
 * - `mode === 'random'` OR `ablate`: step η in a seeded-random direction — the baseline / ablation arm.
 *   `ablate` runs the gradient code path but discards the sensed gradient (signal removed, same cost),
 *   so a passing gate proves the gradient — not the scaffolding — is what beats the walk.
 *
 * Deterministic: all stochasticity is the injected seeded `rng`; the AD arm is otherwise pure.
 */
export function runForager(
  sources: readonly FoodSource[],
  startX: number,
  startZ: number,
  cfg: ForagerConfig,
  rng: Rng,
  mode: ForagerMode,
  ablate = false,
  tape: AdTape = adTapeNew(64),
): ForagerResult {
  let x = startX;
  let z = startZ;
  const senseGradient = mode === 'gradient' && !ablate;
  let steps = 0;
  for (; steps < cfg.maxSteps; steps++) {
    if (nearestDist(x, z, sources) <= cfg.reachRadius) {
      // Report the potential at the ACTUAL final (x,z) for every mode — the mid-loop `g.value` was only
      // computed in the gradient branch (0 for random/ablate) and lagged one step. foodPotentialGradient
      // is pure (no rng) and resets the shared tape internally, so this extra AD pass is determinism-safe.
      return {
        steps,
        reached: true,
        finalPotential: foodPotentialGradient(tape, x, z, sources, cfg.sigma).value,
      };
    }
    let dirX: number;
    let dirZ: number;
    if (senseGradient) {
      const g = foodPotentialGradient(tape, x, z, sources, cfg.sigma);
      const norm = Math.hypot(g.gx, g.gz);
      if (norm > 1e-9) {
        dirX = g.gx / norm;
        dirZ = g.gz / norm;
      } else {
        const theta = rng() * TAU;
        dirX = Math.cos(theta);
        dirZ = Math.sin(theta);
      }
    } else {
      const theta = rng() * TAU;
      dirX = Math.cos(theta);
      dirZ = Math.sin(theta);
    }
    x = Math.max(-cfg.bound, Math.min(cfg.bound, x + cfg.step * dirX));
    z = Math.max(-cfg.bound, Math.min(cfg.bound, z + cfg.step * dirZ));
  }
  return {
    steps,
    reached: nearestDist(x, z, sources) <= cfg.reachRadius,
    finalPotential: foodPotentialGradient(tape, x, z, sources, cfg.sigma).value,
  };
}
