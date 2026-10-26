// Audit #151 (honesty, documented): "phi" here is a min balanced-cut linear entropy (quantum) or a static |a||w| flow share (classical); it is not IIT phi.
/**
 * BALANCED-CUT LINEAR ENTROPY (legacy API names: integratedInformation / phi). This computes a
 * restricted pure-state entanglement diagnostic, not IIT integrated information or consciousness.
 * It does not evaluate causal transition probabilities, IIT distinctions/relations, or every cut.
 *
 * THE MATH (real, falsifiable). For a normalized pure state |ψ⟩ on n qubits and a bipartition A|B,
 * the reduced state ρ_A = Tr_B|ψ⟩⟨ψ|. We use the LINEAR entropy (purity deficit) so no diagonalization
 * is needed: S_L(A) = d_A/(d_A−1) · (1 − Tr ρ_A²) ∈ [0,1], where Tr ρ_A² = Σ_{a,a'} |Σ_b ψ_{a,b}
 * conj(ψ_{a',b})|² is read straight off the amplitudes. The legacy `phi` field is min S_L over
 * balanced cuts only. A six-qubit GHZ state gives 4/7, not 1. GHZ5 tensor |0> also gives 4/7 even
 * though the omitted 1|5 cut is separable: a positive result does NOT prove global irreducibility.
 *
 * Cost: for n = 6 there are C(5,2) = 10 balanced bipartitions (qubit 0 fixed to A to avoid the A↔B
 * double-count); each costs O(d_A²·d_B) ≈ 8·8·8. ~5k ops total — UI/cognitive cadence, one apex
 * creature. Pure leaf module: imports nothing; deterministic (a pure function of the amplitudes).
 */

/** Read-only balanced-cut diagnostic; legacy field names are retained for API compatibility. */
export interface PhiSnapshot {
  /** Qubit count the measure was taken over. */
  qubits: number;
  /** Minimum normalized linear entropy over the evaluated balanced cuts, 0..1; not IIT Φ. */
  phi: number;
  /** Mean normalized linear entropy over the evaluated balanced cuts, 0..1. */
  meanIntegration: number;
  /** Minimizing evaluated A-mask as a qubit bitstring; not an IIT minimum-information partition. */
  mipBits: string;
  /** Number of balanced bipartitions evaluated. */
  cuts: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Normalized linear entropy S_L(ρ_A) ∈ [0,1] of subsystem A (the qubits set in `aMask`) for the pure
 * state given by the `re`/`im` amplitudes over `1<<nQubits` basis states. 0 ⇒ A separable from B;
 * 1 ⇒ A maximally mixed (maximally entangled with B). Eigensolver-free (purity from the amplitudes).
 */
export function subsystemLinearEntropy(
  re: ArrayLike<number>,
  im: ArrayLike<number>,
  nQubits: number,
  aMask: number,
): number {
  const aBits: number[] = [];
  const bBits: number[] = [];
  for (let q = 0; q < nQubits; q++) {
    if ((aMask & (1 << q)) !== 0) aBits.push(q);
    else bBits.push(q);
  }
  const dimA = 1 << aBits.length;
  const dimB = 1 << bBits.length;
  if (dimA < 2) return 0; // empty A side carries no entanglement
  // Relabel amplitudes into M[a][b] = ψ_{a,b} (a indexes A, b indexes B).
  const mRe = new Float64Array(dimA * dimB);
  const mIm = new Float64Array(dimA * dimB);
  const dim = 1 << nQubits;
  for (let g = 0; g < dim; g++) {
    let a = 0;
    for (let t = 0; t < aBits.length; t++) if ((g & (1 << (aBits[t] ?? 0))) !== 0) a |= 1 << t;
    let b = 0;
    for (let t = 0; t < bBits.length; t++) if ((g & (1 << (bBits[t] ?? 0))) !== 0) b |= 1 << t;
    mRe[a * dimB + b] = re[g] ?? 0;
    mIm[a * dimB + b] = im[g] ?? 0;
  }
  // purity = Tr ρ_A² = Σ_{a,a'} |Σ_b M[a][b]·conj(M[a'][b])|².
  let purity = 0;
  for (let a = 0; a < dimA; a++) {
    for (let ap = 0; ap < dimA; ap++) {
      let rr = 0;
      let ii = 0;
      const aoff = a * dimB;
      const apoff = ap * dimB;
      for (let b = 0; b < dimB; b++) {
        const xr = mRe[aoff + b] ?? 0;
        const xi = mIm[aoff + b] ?? 0;
        const yr = mRe[apoff + b] ?? 0;
        const yi = mIm[apoff + b] ?? 0;
        rr += xr * yr + xi * yi; // Re(x·conj(y))
        ii += xi * yr - xr * yi; // Im(x·conj(y))
      }
      purity += rr * rr + ii * ii;
    }
  }
  const sl = (dimA / (dimA - 1)) * (1 - purity);
  return clamp01(sl);
}

/**
 * Legacy API for minimum/mean normalized linear entropy over balanced bipartitions of a pure state.
 * `re`/`im` are the 2ⁿ complex amplitudes (assumed normalized). For odd n, A can have either
 * near-balanced size and normalization uses the dimension of that selected A. Other cut sizes are
 * omitted. Deterministic; allocates small relabel buffers per cut. For n < 2 the diagnostic is 0.
 */
export function integratedInformation(
  re: ArrayLike<number>,
  im: ArrayLike<number>,
  nQubits: number,
): PhiSnapshot {
  if (nQubits < 2) {
    return { qubits: nQubits, phi: 0, meanIntegration: 0, mipBits: '', cuts: 0 };
  }
  const half = nQubits >> 1; // balanced cut size
  let phi = Infinity;
  let mip = 0;
  let sum = 0;
  let cuts = 0;
  // Enumerate balanced subsets A that contain qubit 0 (so A and B are counted once). For odd n the
  // two near-balanced sizes are floor(n/2) and ceil(n/2); fixing qubit 0 in A de-duplicates only when
  // both sizes appear, so we must accept popcount == half AND == n-half (identical for even n).
  for (let mask = 0; mask < 1 << nQubits; mask++) {
    if ((mask & 1) === 0) continue; // fix qubit 0 in A
    const pc = popcount(mask);
    if (pc !== half && pc !== nQubits - half) continue;
    const sl = subsystemLinearEntropy(re, im, nQubits, mask);
    sum += sl;
    cuts++;
    if (sl < phi) {
      phi = sl;
      mip = mask;
    }
  }
  if (cuts === 0) return { qubits: nQubits, phi: 0, meanIntegration: 0, mipBits: '', cuts: 0 };
  return {
    qubits: nQubits,
    phi: clamp01(phi),
    meanIntegration: clamp01(sum / cuts),
    mipBits: mip.toString(2).padStart(nQubits, '0'),
    cuts,
  };
}

/** Population count of the low `bits` of an integer. */
function popcount(x: number): number {
  let v = x;
  let c = 0;
  while (v !== 0) {
    v &= v - 1;
    c++;
  }
  return c;
}

/**
 * Rescaled activation participation ratio, not IIT Φ or a causal integration measure.
 * `pr = (Σx)² / (M·Σx²)` is shifted so a single active module maps to 0. Equal nonzero constants
 * map to 1 even with no interactions; signed activations can cancel. No causal graph is inspected.
 */
export function classicalParticipationRatio(mods: ArrayLike<number>): number {
  const M = mods.length;
  if (M < 2) return 0;
  let energy = 0;
  let sum = 0;
  for (let i = 0; i < M; i++) {
    const x = mods[i] ?? 0;
    energy += x * x;
    sum += x;
  }
  const pr = energy > 1e-9 ? (sum * sum) / (M * energy) : 1 / M;
  return clamp01((pr - 1 / M) / (1 - 1 / M));
}

/** Activation-weighted graph-flow heuristic; compatibility names do not denote IIT quantities. */
export interface ClassicalPhiSnapshot {
  /** Minimum directional cross-cut flow fraction over balanced cuts, clamped to [0,1]. */
  phi: number;
  /** Normalized outgoing activation-weighted flow shares per module. */
  modulePhi: number[];
  /** A-side indices of the minimizing evaluated cut. */
  mipPartition: number[];
  /** Mean directional cross-cut fraction over evaluated balanced cuts. */
  meanIntegration: number;
  /** Number of modules measured. */
  moduleCount: number;
}

/**
 * Activation-weighted directional graph-flow heuristic over balanced cuts. Assumes nonnegative
 * adjacency weights. It has no intervention model or transition probabilities and is not IIT Φ.
 */
export function classicalIntegratedInformation(
  activations: ArrayLike<number>,
  adjacency: ArrayLike<number>, // adjacency matrix (flattened)
): ClassicalPhiSnapshot {
  const M = activations.length;
  if (M < 2) {
    return {
      phi: 0,
      modulePhi: Array.from(activations, () => 0),
      mipPartition: [],
      meanIntegration: 0,
      moduleCount: M,
    };
  }

  const modulePhi = new Float32Array(M);
  let minPhi = Infinity;
  let mipPartition: number[] = [];
  let sumIntegration = 0;
  let cuts = 0;

  // Evaluate balanced bipartitions (fix module 0 in A to avoid double-count). For odd M accept both
  // near-balanced sizes floor(M/2) and M-floor(M/2) (identical for even M, e.g. the production M=8).
  const half = Math.floor(M / 2);
  for (let mask = 0; mask < 1 << M; mask++) {
    if ((mask & 1) === 0) continue; // fix module 0 in A
    const pc = popcount(mask);
    if (pc !== half && pc !== M - half) continue;

    const aMask = mask;
    const bMask = ((1 << M) - 1) ^ mask;

    // Compute effective integration across this cut
    const cutPhi = computeCutIntegration(activations, adjacency, aMask, bMask);
    sumIntegration += cutPhi;
    cuts++;

    if (cutPhi < minPhi) {
      minPhi = cutPhi;
      mipPartition = [];
      for (let i = 0; i < M; i++) {
        if ((aMask & (1 << i)) !== 0) mipPartition.push(i);
      }
    }
  }

  // Per-module local integration: each module's SHARE of the system's total interaction flow,
  // so modulePhi is a meaningful [0,1] participation distribution (summing to ~1) rather than the
  // degenerate 0/1 the prior local/total ratio always produced.
  let totalFlow = 0;
  for (let i = 0; i < M; i++) {
    modulePhi[i] = computeModuleFlow(activations, adjacency, i);
    totalFlow += modulePhi[i] ?? 0;
  }
  if (totalFlow > 1e-9) {
    for (let i = 0; i < M; i++) modulePhi[i] = (modulePhi[i] ?? 0) / totalFlow;
  }

  const meanIntegration = cuts > 0 ? sumIntegration / cuts : 0;
  const phi = cuts > 0 ? clamp01(minPhi) : 0;

  return {
    phi,
    modulePhi: Array.from(modulePhi),
    mipPartition,
    meanIntegration: clamp01(meanIntegration),
    moduleCount: M,
  };
}

/**
 * Compute integration across a specific bipartition cut.
 */
function computeCutIntegration(
  activations: ArrayLike<number>,
  adjacency: ArrayLike<number>,
  aMask: number,
  bMask: number,
): number {
  let crossFlow = 0;
  let totalFlow = 0;

  for (let i = 0; i < activations.length; i++) {
    for (let j = 0; j < activations.length; j++) {
      if (i === j) continue;
      const weight = adjacency[i * activations.length + j] ?? 0;
      const flow = Math.abs(activations[i] ?? 0) * Math.abs(activations[j] ?? 0) * weight;
      totalFlow += flow;

      const iInA = (aMask & (1 << i)) !== 0;
      const jInB = (bMask & (1 << j)) !== 0;
      if (iInA && jInB) {
        crossFlow += flow;
      }
    }
  }

  return totalFlow > 1e-9 ? crossFlow / totalFlow : 0;
}

/**
 * Outgoing weighted flow from a module: Σ_{j≠i} |aᵢ|·|aⱼ|·w(i,j). The caller
 * normalizes these by the whole-graph total to get each module's [0,1] share for nonnegative weights.
 * (The prior version accumulated the same term into two locals and returned their ratio — always
 * exactly 1 for any connected module, 0 otherwise — which carried no per-module information.)
 */
function computeModuleFlow(
  activations: ArrayLike<number>,
  adjacency: ArrayLike<number>,
  moduleIndex: number,
): number {
  let flow = 0;
  for (let j = 0; j < activations.length; j++) {
    if (j === moduleIndex) continue;
    const weight = adjacency[moduleIndex * activations.length + j] ?? 0;
    flow += Math.abs(activations[moduleIndex] ?? 0) * Math.abs(activations[j] ?? 0) * weight;
  }
  return flow;
}
