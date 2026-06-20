/**
 * izhikevich.ts — REAL Izhikevich spiking-neuron dynamics (leaf, exclusive owner).
 *
 * Biologically-grounded membrane dynamics: a 2-variable reduction of Hodgkin–
 * Huxley that reproduces the firing zoo of real cortical neurons (regular
 * spiking, fast spiking, chattering, intrinsically bursting) from four
 * parameters. This is "digital biology" in the literal sense — a neuron whose
 * voltage rises, fires a spike, and resets, with spike-frequency adaptation —
 * NOT an attention head. It is the spiking substrate beneath the corpus's
 * spin/neural lineage (`spin_based_neural_network`) and a building block for a
 * non-transformer cortical sheet.
 *
 *   v' = 0.04v² + 5v + 140 − u + I      (membrane potential, mV)
 *   u' = a(bv − u)                       (recovery variable)
 *   if v ≥ 30: v ← c, u ← u + d, SPIKE   (reset)
 *
 * Integrated with Izhikevich's canonical two-substep scheme for v (numerical
 * stability) per 1 ms tick. DETERMINISM (Manhattan): pure ODE integration, NO
 * `Rng`, NO `Date.now`; same parameters + input current ⇒ same spike train,
 * bit for bit. Ref: Izhikevich, *IEEE Trans. Neural Networks* 14 (2003).
 */

/** Spike threshold (mV) at which the membrane resets. */
export const IZH_THRESHOLD = 30;

/** The four parameters defining a neuron's firing regime. */
export interface IzhParams {
  readonly a: number; // recovery time scale
  readonly b: number; // recovery sensitivity to v
  readonly c: number; // post-spike reset potential
  readonly d: number; // post-spike recovery increment
}

/** Membrane state: potential v (mV) and recovery u. */
export interface IzhState {
  readonly v: number;
  readonly u: number;
}

/** Regular-spiking cortical pyramidal neuron. */
export const IZH_RS: IzhParams = { a: 0.02, b: 0.2, c: -65, d: 8 };
/** Fast-spiking inhibitory interneuron. */
export const IZH_FS: IzhParams = { a: 0.1, b: 0.2, c: -65, d: 2 };
/** Chattering neuron (high-frequency bursts). */
export const IZH_CH: IzhParams = { a: 0.02, b: 0.2, c: -50, d: 2 };
/** Intrinsically bursting neuron. */
export const IZH_IB: IzhParams = { a: 0.02, b: 0.2, c: -55, d: 4 };

/** Resting state for a parameter set: v at the reset potential, u = b·v. */
export function izhRest(p: IzhParams): IzhState {
  return { v: p.c, u: p.b * p.c };
}

/**
 * Advance one 1 ms tick under input current `I`. Two 0.5 ms substeps for v
 * (Izhikevich's stability scheme) then one step for u, then threshold/reset.
 * Returns the next state and whether the neuron spiked this tick.
 */
export function izhStep(
  p: IzhParams,
  s: IzhState,
  I: number,
): { state: IzhState; spiked: boolean } {
  let v = s.v;
  let u = s.u;
  v += 0.5 * (0.04 * v * v + 5 * v + 140 - u + I);
  v += 0.5 * (0.04 * v * v + 5 * v + 140 - u + I);
  u += p.a * (p.b * v - u);
  if (v >= IZH_THRESHOLD) {
    return { state: { v: p.c, u: u + p.d }, spiked: true };
  }
  return { state: { v, u }, spiked: false };
}

/**
 * Run a neuron for `steps` ticks under constant input current. Returns the spike
 * times (tick indices) and the full membrane-potential trace. O(steps).
 */
export function izhRun(
  p: IzhParams,
  current: number,
  steps: number,
): { spikes: number[]; trace: number[] } {
  let s = izhRest(p);
  const spikes: number[] = [];
  const trace: number[] = [];
  for (let t = 0; t < steps; t++) {
    const r = izhStep(p, s, current);
    s = r.state;
    if (r.spiked) spikes.push(t);
    trace.push(s.v);
  }
  return { spikes, trace };
}

/** Mean firing rate in Hz given a spike-time list over `steps` ms ticks. */
export function firingRateHz(spikes: readonly number[], steps: number): number {
  return steps > 0 ? (spikes.length * 1000) / steps : 0;
}
