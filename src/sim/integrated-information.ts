/**
 * INTEGRATED INFORMATION Φ (V90 / Super Creature 1.1) — a tractable, eigensolver-free proxy for the
 * central quantity of Integrated Information Theory (IIT 4.0, Tononi et al.), computed directly from the
 * apex creature's 6-qubit statevector. IIT measures consciousness as the irreducibility of a system to
 * its parts: the information a whole generates ABOVE its minimum-information partition (the MIP). For a
 * PURE quantum state the integration across a cut is exactly the entanglement across that cut, so the
 * MIP is the least-entangled balanced bipartition and Φ is the integration that survives it — the
 * "weakest link" that still binds the register into one mind.
 *
 * THE MATH (real, falsifiable). For a normalized pure state |ψ⟩ on n qubits and a bipartition A|B,
 * the reduced state ρ_A = Tr_B|ψ⟩⟨ψ|. We use the LINEAR entropy (purity deficit) so no diagonalization
 * is needed: S_L(A) = d_A/(d_A−1) · (1 − Tr ρ_A²) ∈ [0,1], where Tr ρ_A² = Σ_{a,a'} |Σ_b ψ_{a,b}
 * conj(ψ_{a',b})|² is read straight off the amplitudes. Φ = min over balanced bipartitions of S_L —
 * the integration at the MIP. A product state ⇒ Φ = 0 (reducible, no integration); a GHZ/maximally
 * entangled register ⇒ Φ → 1 (every cut is integrated). This is IIT's spirit in a form a browser tab
 * can compute exactly each beat: a measured consciousness index, not a label.
 *
 * Cost: for n = 6 there are C(5,2) = 10 balanced bipartitions (qubit 0 fixed to A to avoid the A↔B
 * double-count); each costs O(d_A²·d_B) ≈ 8·8·8. ~5k ops total — UI/cognitive cadence, one apex
 * creature. Pure leaf module: imports nothing; deterministic (a pure function of the amplitudes).
 */

/** Read-only integrated-information readout for the BRAIN view. */
export interface PhiSnapshot {
  /** Qubit count the measure was taken over. */
  qubits: number;
  /** Φ — integrated information at the minimum-information partition, 0..1 (the "consciousness index"). */
  phi: number;
  /** Mean balanced-cut integration (S_L averaged over all balanced bipartitions), 0..1. */
  meanIntegration: number;
  /** The minimum-information-partition mask over A (the cut Φ is measured at), as a qubit bitstring. */
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
 * Integrated information Φ of a pure n-qubit state: the minimum balanced-bipartition linear entropy
 * (the integration at the minimum-information partition), plus the mean balanced-cut integration and
 * the MIP mask. `re`/`im` are the 2ⁿ complex amplitudes (assumed normalized). Deterministic; allocates
 * the small relabel buffers per cut (UI/cognitive cadence). For n < 2, Φ = 0.
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
  // Enumerate balanced subsets A of size `half` that contain qubit 0 (so A and B are counted once).
  for (let mask = 0; mask < 1 << nQubits; mask++) {
    if ((mask & 1) === 0) continue; // fix qubit 0 in A
    if (popcount(mask) !== half) continue;
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
