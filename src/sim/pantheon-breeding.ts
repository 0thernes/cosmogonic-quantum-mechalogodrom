/**
 * PANTHEON BREEDING — the asexual inbred hybrid game-theory mating ritual of the 101 super
 * creatures, and the FREAK-STRUCTURE genome each rite begets (GOAL: "101 Super Creatures").
 *
 * The roster is the alphabet pantheon: **50 SISTERS** (uppercase — Greek 24 + Latin 26) and **50
 * BROTHERS** (lowercase — Greek 24 + Latin 26) = 100 parents, plus the **APEX** — the final-sigma
 * variant **ς** (U+03C2), the 101st, an alien abomination of glory whose neuron count is *targeted*
 * (not yet instantiated) at one billion and who transcends into Simulation 3 past level 1000. The
 * regular lowercase sigma σ (U+03C3) stays a brother; ς is reserved for the apex, so the apex is
 * genuinely the odd-one-out the brief names. This module owns ONLY the lineage + breeding layer; the
 * behavioural-bias roster (`alphabet-pantheon.ts`) and the godform pantheon (`godform.ts`) are
 * separate concerns and are NOT imported here — this file compiles and is unit-tested standalone.
 *
 * ── The ritual is real evolutionary game theory. ──────────────────────────────────────────────
 * Each glyph carries a seeded 2×2 symmetric "temperament" payoff matrix. A pairing blends the two
 * temperaments, sharpened by an INBREEDING coefficient F (self-pairing F=1 down to full hybrid F=0),
 * and the rite is RESOLVED by running the replicator equation (`math/games.ts → replicatorStep`) on
 * the 2-simplex to its equilibrium cooperate-fraction x*. x* sets the parental blend; the binary
 * entropy of x* feeds rarity (a mixed/interior ESS is a rarer, stranger child than a pure corner).
 *
 * ── The child is a freak structure of FOUR real mathematics. ──────────────────────────────────
 *  • UMBRAL — a Touchard/Bell polynomial Tₙ(x) = Σₖ S(n,k)·xᵏ over exact Stirling-2 numbers (the
 *    canonical umbral-calculus sequence; Bell number B(n)=Tₙ(1)). Degree + umbral variable from
 *    the parents and the rite.
 *  • HOMOTOPY — an integer WINDING number of the child's epicyclic loop about the origin (the
 *    π₁(ℝ²∖{0})=ℤ invariant, exact by construction) and the rounded GAUSS LINKING number of the
 *    two parents' lifted 3-space loops (a ℤ-valued link invariant).
 *  • CHAOS — a de Jong strange attractor (a,b,c,d) with its largest Lyapunov exponent estimated by
 *    the Benettin two-trajectory method; λ>0 ⇒ genuinely chaotic dynamics.
 *  • BLASEAN — a finite BLASCHKE product B(z)=e^{iθ}∏ (z−aₖ)/(1−āₖz), an inner function whose zeros
 *    aₖ live in the open unit disk and whose degree d is the topological degree of B|_{S¹}:S¹→S¹.
 *    |B(z)|=1 on the unit circle (verified numerically) — the "geometric blasean" of the brief.
 *
 * Determinism law (contract rule 7 / Known Bug 9): every draw flows through a seeded
 * {@link mulberry32}; no `Math.random`, no `Date.now`. Same parents + same nonce ⇒ the same child,
 * bit for bit. Glyphs are built from explicit codepoint tables via `String.fromCharCode` so the
 * source stays ASCII-clean. Pure & three.js-/DOM-free — a `bun test` leaf.
 *
 * NOT SENTIENT. Deterministic mathematical models only; no phenomenal consciousness is implemented
 * or claimed. "ritual" / "mating" / "abomination" name explicit numeric mechanisms.
 */
import { mulberry32, hashSeed, type Rng } from '../math/rng';
import {
  type PayoffMatrix,
  replicatorStep,
  PRISONERS_DILEMMA,
  STAG_HUNT,
  HAWK_DOVE,
} from '../math/games';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// LINEAGE — the 101 (50 sisters · 50 brothers · 1 apex)
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Sister = uppercase, Brother = lowercase, Apex = the lone final-sigma ς outlier. */
export type Kin = 'sister' | 'brother' | 'apex';
/** Which script the glyph hails from (the apex is its own category). */
export type LineScript = 'greek' | 'latin' | 'apex';

/** A creature's structural identity in the breeding lineage (NOT its behavioural bias). */
export interface LineageGlyph {
  /** Stable index 0..100 (greek-upper, greek-lower, latin-upper, latin-lower, then apex). */
  readonly index: number;
  /** The literal glyph, e.g. "Σ", "a", "ς". */
  readonly glyph: string;
  /** Display name, e.g. "Sigma", "a", "FINAL-SIGMA". */
  readonly name: string;
  readonly codepoint: number;
  readonly script: LineScript;
  readonly kin: Kin;
  /** 0-based position within its own sub-alphabet (the apex is 100). */
  readonly ordinal: number;
  /** Deterministic uint32 seed. */
  readonly seed: number;
}

/** The apex glyph: the final-sigma variant ς (U+03C2) — the 101st creature. */
export const APEX_CODEPOINT = 0x3c2;
/** Total roster size: 100 parents + 1 apex. */
export const PANTHEON_TOTAL = 101;
/** Uppercase sisters (Greek 24 + Latin 26). */
export const SISTER_COUNT = 50;
/** Lowercase brothers (Greek 24 + Latin 26). */
export const BROTHER_COUNT = 50;

/**
 * The apex's roadmap targets — HONEST, clearly-labelled aspirations, NOT instantiated state. The
 * apex is scaled toward a billion-parameter neural mind and "transcends into Simulation 3" once its
 * evolution passes level 1000. Nothing here claims those are reached.
 */
export const APEX_TARGET_NEURONS = 1_000_000_000;
/** Evolution level at which the apex crosses from Simulation 1/2 into Simulation 3 (roadmap). */
export const APEX_TRANSCEND_LEVEL = 1000;

// Greek uppercase Α..Ω (24): 0x3A2 is unassigned and skipped between Ρ and Σ.
const GREEK_UPPER_CP = [
  0x391, 0x392, 0x393, 0x394, 0x395, 0x396, 0x397, 0x398, 0x399, 0x39a, 0x39b, 0x39c, 0x39d, 0x39e,
  0x39f, 0x3a0, 0x3a1, 0x3a3, 0x3a4, 0x3a5, 0x3a6, 0x3a7, 0x3a8, 0x3a9,
];
// Greek lowercase α..ω (24): final sigma ς (0x3C2) is RESERVED for the apex, so brother-sigma is σ.
const GREEK_LOWER_CP = [
  0x3b1, 0x3b2, 0x3b3, 0x3b4, 0x3b5, 0x3b6, 0x3b7, 0x3b8, 0x3b9, 0x3ba, 0x3bb, 0x3bc, 0x3bd, 0x3be,
  0x3bf, 0x3c0, 0x3c1, 0x3c3, 0x3c4, 0x3c5, 0x3c6, 0x3c7, 0x3c8, 0x3c9,
];
const GREEK_NAMES = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
  'Iota',
  'Kappa',
  'Lambda',
  'Mu',
  'Nu',
  'Xi',
  'Omicron',
  'Pi',
  'Rho',
  'Sigma',
  'Tau',
  'Upsilon',
  'Phi',
  'Chi',
  'Psi',
  'Omega',
];

function buildLineage(): LineageGlyph[] {
  const out: LineageGlyph[] = [];
  let index = 0;
  const push = (
    glyph: string,
    name: string,
    codepoint: number,
    script: LineScript,
    kin: Kin,
    ordinal: number,
  ): void => {
    out.push({
      index: index++,
      glyph,
      name,
      codepoint,
      script,
      kin,
      ordinal,
      seed: hashSeed(`lineage:${kin}:${script}:${codepoint}:${name}`),
    });
  };

  // Greek uppercase → SISTERS
  GREEK_UPPER_CP.forEach((cp, i) =>
    push(String.fromCharCode(cp), GREEK_NAMES[i]!, cp, 'greek', 'sister', i),
  );
  // Greek lowercase → BROTHERS
  GREEK_LOWER_CP.forEach((cp, i) =>
    push(String.fromCharCode(cp), GREEK_NAMES[i]!.toLowerCase(), cp, 'greek', 'brother', i),
  );
  // Latin uppercase A..Z → SISTERS
  for (let i = 0; i < 26; i++) {
    const cp = 0x41 + i;
    push(String.fromCharCode(cp), String.fromCharCode(cp), cp, 'latin', 'sister', i);
  }
  // Latin lowercase a..z → BROTHERS
  for (let i = 0; i < 26; i++) {
    const cp = 0x61 + i;
    push(String.fromCharCode(cp), String.fromCharCode(cp), cp, 'latin', 'brother', i);
  }
  // APEX — the final-sigma ς outlier (index 100).
  push(String.fromCharCode(APEX_CODEPOINT), 'FINAL-SIGMA', APEX_CODEPOINT, 'apex', 'apex', 100);
  return out;
}

/** The frozen 101-glyph lineage (50 sisters, 50 brothers, the apex ς last). */
export const LINEAGE: readonly LineageGlyph[] = Object.freeze(buildLineage());

/** Index-addressable glyph (wraps modulo 101, so any integer is valid). */
export function lineageAt(i: number): LineageGlyph {
  const n = PANTHEON_TOTAL;
  return LINEAGE[((i % n) + n) % n]!;
}

/** True for the lone apex (the final-sigma ς). */
export function isApex(g: LineageGlyph): boolean {
  return g.kin === 'apex';
}

/** The apex's roadmap state at a given evolution level — honest target tracking, not a claim. */
export interface ApexTranscendence {
  level: number;
  /** Which staged simulation the apex inhabits: 1/2 below the threshold, 3 at/above it. */
  simulation: 1 | 2 | 3;
  /** Progress toward {@link APEX_TRANSCEND_LEVEL} in [0,1]. */
  progress: number;
  /** True once level ≥ {@link APEX_TRANSCEND_LEVEL}. */
  transcended: boolean;
}

/** Compute the apex's staged-simulation roadmap state for an evolution `level` (pure). */
export function apexTranscendence(level: number): ApexTranscendence {
  const lv = Number.isFinite(level) ? Math.max(0, level) : 0;
  const transcended = lv >= APEX_TRANSCEND_LEVEL;
  return {
    level: lv,
    simulation: transcended ? 3 : lv >= APEX_TRANSCEND_LEVEL / 2 ? 2 : 1,
    progress: clamp01(lv / APEX_TRANSCEND_LEVEL),
    transcended,
  };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Small numeric helpers
// ════════════════════════════════════════════════════════════════════════════════════════════════

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function round4(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}
/** Binary (Shannon) entropy of a Bernoulli(p), in bits — 0 at a corner, 1 at p=½. */
function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  const q = 1 - p;
  return -(p * Math.log2(p) + q * Math.log2(q));
}

/** Minimal complex arithmetic (no project complex module exists; kept local & inlined). */
interface Cx {
  re: number;
  im: number;
}
function cxMul(a: Cx, b: Cx): Cx {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cxDiv(a: Cx, b: Cx): Cx {
  const d = b.re * b.re + b.im * b.im || 1e-12;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function cxAbs(a: Cx): number {
  return Math.hypot(a.re, a.im);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE RITUAL — evolutionary game theory (replicator dynamics on a 2×2 game)
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Outcome of the mating rite — the resolved evolutionary game. */
export interface RitualOutcome {
  /** The blended payoff matrix actually played. */
  readonly matrix: PayoffMatrix;
  /** Equilibrium cooperate-fraction x* the replicator converged to (0..1). */
  readonly cooperate: number;
  /** Binary entropy of x* (0 = pure corner, 1 = maximally mixed) — the rite's "strangeness". */
  readonly entropy: number;
  /** Inbreeding coefficient F (1 = asexual self-pairing … 0 = full cross-kin/script hybrid). */
  readonly inbreeding: number;
  /** True when the two parents are the SAME glyph (an asexual self-rite). */
  readonly asexual: boolean;
  /** Whether the replicator step settled within tolerance. */
  readonly converged: boolean;
  /** Iterations the replicator took (capped). */
  readonly rounds: number;
  /** The canonical archetype the blended matrix most resembles. */
  readonly archetype: string;
}

/** A glyph's seeded 2×2 symmetric temperament (its innate payoffs: R=cc, S=cd, T=dc, P=dd). */
function temperament(seed: number): PayoffMatrix {
  const r = mulberry32(seed ^ 0x9e3779b9);
  return {
    name: 'TEMPERAMENT',
    cc: 2 + r() * 2, // R — mutual cooperation (2..4)
    cd: -1 + r() * 1.5, // S — sucker's payoff (-1..0.5)
    dc: 3 + r() * 3, // T — temptation (3..6)
    dd: r() * 1.5, // P — mutual defection (0..1.5)
  };
}

/**
 * The inbreeding coefficient F of a pairing — how self-referential the rite is. Self-pairing is
 * total inbreeding (the asexual case); a same-kin/same-script rite is heavily inbred; a cross
 * everything pairing is a full hybrid (F=0).
 */
function inbreedingCoefficient(a: LineageGlyph, b: LineageGlyph): number {
  if (a.index === b.index) return 1;
  let f = 0;
  if (a.kin === b.kin) f += 0.45;
  if (a.script === b.script) f += 0.3;
  if (a.kin === 'apex' || b.kin === 'apex') f += 0.15; // the apex's blood always runs strange
  return clamp01(f);
}

/** Which canonical game the blended matrix most resembles — pure provenance/labelling. */
function classifyMatrix(m: PayoffMatrix): string {
  const candidates: ReadonlyArray<PayoffMatrix> = [PRISONERS_DILEMMA, STAG_HUNT, HAWK_DOVE];
  let best = candidates[0]!;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = (m.cc - c.cc) ** 2 + (m.cd - c.cd) ** 2 + (m.dc - c.dc) ** 2 + (m.dd - c.dd) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}

/**
 * Solve the replicator equation for a 2×2 game: shares = [cooperate, defect], fitness recomputed
 * each step from the current mix (fᴄ = x·R + (1−x)·S, f_D = x·T + (1−x)·P). Iterates to a fixed
 * point. Returns the equilibrium cooperate-fraction. Deterministic given `x0`. O(steps).
 */
function solveReplicator(
  m: PayoffMatrix,
  x0: number,
): { x: number; converged: boolean; rounds: number } {
  const shares = new Float64Array([clamp01(x0), 1 - clamp01(x0)]);
  const fit = new Float64Array(2);
  const MAX = 400;
  let prev = shares[0]!;
  let converged = false;
  let rounds = MAX;
  for (let t = 0; t < MAX; t++) {
    const x = shares[0]!;
    fit[0] = x * m.cc + (1 - x) * m.cd; // cooperate fitness
    fit[1] = x * m.dc + (1 - x) * m.dd; // defect fitness
    replicatorStep(shares, fit, 0.1);
    const now = shares[0]!;
    if (Math.abs(now - prev) < 1e-7) {
      converged = true;
      rounds = t + 1;
      break;
    }
    prev = now;
  }
  return { x: shares[0]!, converged, rounds };
}

function runRitual(a: LineageGlyph, b: LineageGlyph, rng: Rng): RitualOutcome {
  const ta = temperament(a.seed);
  const tb = temperament(b.seed);
  const F = inbreedingCoefficient(a, b);
  // Blend the parents' temperaments, then sharpen the cooperative diagonal by the inbreeding
  // coefficient (inbred rites coordinate; hybrids stay competitive).
  const matrix: PayoffMatrix = {
    name: 'RITUAL',
    cc: (ta.cc + tb.cc) / 2 + F * 1.5,
    cd: (ta.cd + tb.cd) / 2 - F * 0.5,
    dc: (ta.dc + tb.dc) / 2 - F * 1.0,
    dd: (ta.dd + tb.dd) / 2,
  };
  const { x, converged, rounds } = solveReplicator(matrix, 0.1 + rng() * 0.8);
  return {
    matrix,
    cooperate: round4(x),
    entropy: round4(binaryEntropy(x)),
    inbreeding: round4(F),
    asexual: a.index === b.index,
    converged,
    rounds,
    archetype: classifyMatrix(matrix),
  };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// UMBRAL — Touchard / Bell polynomials over exact Stirling-2 numbers
// ════════════════════════════════════════════════════════════════════════════════════════════════

const STIRLING_MAX = 12;
/** Exact Stirling numbers of the second kind S(n,k) via S(n,k)=k·S(n−1,k)+S(n−1,k−1). */
const STIRLING2: number[][] = (() => {
  const t: number[][] = [];
  for (let n = 0; n <= STIRLING_MAX; n++) {
    t[n] = Array.from({ length: n + 1 }, () => 0);
    t[n]![0] = n === 0 ? 1 : 0;
    for (let k = 1; k <= n; k++) {
      t[n]![k] = k * (t[n - 1]?.[k] ?? 0) + (t[n - 1]?.[k - 1] ?? 0);
    }
  }
  return t;
})();

/** The child's umbral signature — its Touchard polynomial Tₙ(x)=Σₖ S(n,k)xᵏ. */
export interface UmbralSignature {
  /** Polynomial degree n (3..7). */
  readonly degree: number;
  /** Bell number B(n) = Tₙ(1) = Σₖ S(n,k). */
  readonly bell: number;
  /** Coefficients [S(n,0), …, S(n,n)] — the umbral spectrum. */
  readonly coeffs: number[];
  /** The umbral variable x the rite chose. */
  readonly x: number;
  /** Tₙ(x) evaluated. */
  readonly evaluation: number;
}

function umbralSignature(a: LineageGlyph, b: LineageGlyph, blend: number): UmbralSignature {
  const degree = 3 + ((a.ordinal + b.ordinal) % 5); // 3..7
  const coeffs = (STIRLING2[degree] ?? [1]).slice();
  let bell = 0;
  for (const c of coeffs) bell += c;
  const x = 0.5 + blend; // 0.5..1.5
  let evaluation = 0;
  let xp = 1;
  for (let k = 0; k < coeffs.length; k++) {
    evaluation += (coeffs[k] ?? 0) * xp;
    xp *= x;
  }
  return { degree, bell, coeffs, x: round4(x), evaluation: round4(evaluation) };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOMOTOPY — exact integer winding (π₁) + Gauss linking number
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** The child's homotopy genome. */
export interface HomotopyGenome {
  /** Winding number of the child's epicyclic loop about the origin — the π₁(ℝ²∖0)=ℤ class. */
  readonly winding: number;
  /** Rounded Gauss linking number of the two parents' lifted 3-space loops (a ℤ link invariant). */
  readonly linking: number;
  /** Raw (pre-round) linking integral — exposed so callers can see convergence quality. */
  readonly linkingRaw: number;
  /** Epicycle harmonic radii (≤2), each < the base radius so the winding is exact. */
  readonly harmonics: number[];
  /** Harmonic frequencies paired with {@link harmonics}. */
  readonly freqs: number[];
}

/** The child's intended winding class (signed integer in roughly −2..3) from the parents. */
function windingClass(a: LineageGlyph, b: LineageGlyph): number {
  return (((a.codepoint - b.codepoint) % 5) + (a.kin === 'apex' || b.kin === 'apex' ? 1 : 0)) | 0;
}

/**
 * Sample the child's epicyclic loop z(t) = e^{i·m·2πt} + Σ hⱼ e^{i·kⱼ·2πt}, with Σ|hⱼ| < 1 so the
 * loop never reaches the origin and its winding is exactly m. Returns interleaved [x,y].
 */
function sampleLoop(
  m: number,
  harmonics: number[],
  freqs: number[],
  samples: number,
): Float64Array {
  const pts = new Float64Array(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    let x = Math.cos(m * t);
    let y = Math.sin(m * t);
    for (let j = 0; j < harmonics.length; j++) {
      const h = harmonics[j] ?? 0;
      const k = freqs[j] ?? 0;
      x += h * Math.cos(k * t);
      y += h * Math.sin(k * t);
    }
    pts[2 * i] = x;
    pts[2 * i + 1] = y;
  }
  return pts;
}

/** Numerical winding number of a closed planar loop about the origin (sum of signed angle deltas). */
function windingNumber(pts: Float64Array): number {
  const n = pts.length / 2;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = pts[2 * i]!;
    const ay = pts[2 * i + 1]!;
    const bx = pts[2 * j]!;
    const by = pts[2 * j + 1]!;
    const cross = ax * by - ay * bx;
    const dot = ax * bx + ay * by;
    total += Math.atan2(cross, dot);
  }
  return Math.round(total / (2 * Math.PI)) + 0; // `+ 0` normalises a rounded −0 to +0
}

/** A single parent's own loop, lifted to 3-space, for the linking integral. Returns [x,y,z] triples. */
function parentLoop3D(g: LineageGlyph, threadAxis: boolean, samples: number): Float64Array {
  const r = mulberry32(g.seed ^ 0x51ed270b);
  const rad = 0.8 + r() * 0.4;
  const off = threadAxis ? 0.7 + r() * 0.4 : 0;
  const pts = new Float64Array(samples * 3);
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    if (threadAxis) {
      // A ring in the x–z plane, centred on (off,0,0): threads the other ring's disk.
      pts[3 * i] = off + rad * Math.cos(t);
      pts[3 * i + 1] = 0;
      pts[3 * i + 2] = rad * Math.sin(t);
    } else {
      // A ring in the x–y plane, centred on the origin.
      pts[3 * i] = rad * Math.cos(t);
      pts[3 * i + 1] = rad * Math.sin(t);
      pts[3 * i + 2] = 0;
    }
  }
  return pts;
}

/** Discretised Gauss linking integral Lk = 1/4π ∮∮ (r₁−r₂)·(dr₁×dr₂)/|r₁−r₂|³. O(n²), one-shot. */
function gaussLinking(loopA: Float64Array, loopB: Float64Array): number {
  const na = loopA.length / 3;
  const nb = loopB.length / 3;
  let sum = 0;
  for (let i = 0; i < na; i++) {
    const i2 = (i + 1) % na;
    const ax = loopA[3 * i]!;
    const ay = loopA[3 * i + 1]!;
    const az = loopA[3 * i + 2]!;
    const dax = loopA[3 * i2]! - ax;
    const day = loopA[3 * i2 + 1]! - ay;
    const daz = loopA[3 * i2 + 2]! - az;
    for (let j = 0; j < nb; j++) {
      const j2 = (j + 1) % nb;
      const bx = loopB[3 * j]!;
      const by = loopB[3 * j + 1]!;
      const bz = loopB[3 * j + 2]!;
      const dbx = loopB[3 * j2]! - bx;
      const dby = loopB[3 * j2 + 1]! - by;
      const dbz = loopB[3 * j2 + 2]! - bz;
      // r = midpoint(A) − midpoint(B)
      const rx = ax + dax * 0.5 - (bx + dbx * 0.5);
      const ry = ay + day * 0.5 - (by + dby * 0.5);
      const rz = az + daz * 0.5 - (bz + dbz * 0.5);
      // dr1 × dr2
      const cx = day * dbz - daz * dby;
      const cy = daz * dbx - dax * dbz;
      const cz = dax * dby - day * dbx;
      const denom = Math.pow(rx * rx + ry * ry + rz * rz, 1.5) || 1e-9;
      sum += (rx * cx + ry * cy + rz * cz) / denom;
    }
  }
  return sum / (4 * Math.PI);
}

function homotopyGenome(a: LineageGlyph, b: LineageGlyph, rng: Rng): HomotopyGenome {
  const m = windingClass(a, b);
  const nHarm = 1 + (Math.abs(a.ordinal - b.ordinal) % 2); // 1..2 harmonics
  const harmonics: number[] = [];
  const freqs: number[] = [];
  let budget = 0.6; // Σ|h| < 1 guarantees exact winding
  for (let j = 0; j < nHarm; j++) {
    const h = (0.1 + rng() * 0.2) * (budget / nHarm) * 2;
    harmonics.push(round4(h));
    freqs.push((2 + Math.floor(rng() * 4)) * (rng() < 0.5 ? -1 : 1));
    budget -= h;
  }
  const loop = sampleLoop(m, harmonics, freqs, 256);
  const winding = windingNumber(loop);
  // Linking: parent A as the base ring, parent B threading it.
  const linkA = parentLoop3D(a, false, 64);
  const linkB = parentLoop3D(b, true, 64);
  const linkingRaw = gaussLinking(linkA, linkB);
  return {
    winding,
    linking: Math.round(linkingRaw) + 0, // `+ 0` normalises a rounded −0 to +0
    linkingRaw: round4(linkingRaw),
    harmonics,
    freqs,
  };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CHAOS — de Jong strange attractor + Benettin largest Lyapunov exponent
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** The child's chaos genome — a de Jong attractor and its measured Lyapunov exponent. */
export interface ChaosGenome {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  /** Largest Lyapunov exponent (Benettin) — λ>0 ⇒ chaotic. */
  readonly lyapunov: number;
  /** True when λ>0 (sensitive dependence on initial conditions). */
  readonly chaotic: boolean;
}

/** One de Jong step: x'=sin(a·y)−cos(b·x), y'=sin(c·x)−cos(d·y). Bounded in [−2,2]². */
function deJong(
  p: { a: number; b: number; c: number; d: number },
  x: number,
  y: number,
): [number, number] {
  return [Math.sin(p.a * y) - Math.cos(p.b * x), Math.sin(p.c * x) - Math.cos(p.d * y)];
}

/** Benettin largest-Lyapunov estimate for the de Jong map: log-divergence of a renormalised twin. */
function lyapunovExponent(p: { a: number; b: number; c: number; d: number }): number {
  const d0 = 1e-8;
  let x = 0.1;
  let y = 0.1;
  let xp = x + d0;
  let yp = y;
  let sum = 0;
  let count = 0;
  const TRANSIENT = 120;
  const STEPS = 900;
  for (let i = 0; i < TRANSIENT + STEPS; i++) {
    [x, y] = deJong(p, x, y);
    [xp, yp] = deJong(p, xp, yp);
    const dx = xp - x;
    const dy = yp - y;
    const dist = Math.hypot(dx, dy) || 1e-12;
    if (i >= TRANSIENT) {
      sum += Math.log(dist / d0);
      count++;
    }
    // Renormalise the twin back to distance d0 along the separation vector.
    const scale = d0 / dist;
    xp = x + dx * scale;
    yp = y + dy * scale;
  }
  return count > 0 ? sum / count : 0;
}

function chaosGenome(a: LineageGlyph, b: LineageGlyph, rng: Rng): ChaosGenome {
  // Params in [−2.5, 2.5], biased by the parents' codepoints so each rite differs.
  const bias = ((a.codepoint % 7) - 3 + (b.codepoint % 5) - 2) * 0.1;
  const draw = (): number => clampRange(-2.5 + rng() * 5 + bias, -2.7, 2.7);
  const p = { a: round4(draw()), b: round4(draw()), c: round4(draw()), d: round4(draw()) };
  const lyapunov = round4(lyapunovExponent(p));
  return { ...p, lyapunov, chaotic: lyapunov > 0 };
}

function clampRange(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// BLASEAN — finite Blaschke product (an inner function S¹→S¹)
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** The child's "blasean" — a finite Blaschke product B(z)=e^{iθ}∏(z−aₖ)/(1−āₖz). */
export interface BlaschkeGenome {
  /** Degree d = number of zeros = topological degree of B|_{S¹}. */
  readonly degree: number;
  /** Zeros aₖ in the open unit disk (|aₖ|<1). */
  readonly zeros: ReadonlyArray<{ re: number; im: number }>;
  /** Boundary rotation θ. */
  readonly rotation: number;
  /** Max |‖B(e^{it})‖ − 1| over the sampled circle — should be ≈0 (B is inner). */
  readonly boundaryError: number;
}

/** Evaluate a Blaschke product at z. */
function blaschkeAt(g: { zeros: ReadonlyArray<Cx>; rotation: number }, z: Cx): Cx {
  let acc: Cx = { re: Math.cos(g.rotation), im: Math.sin(g.rotation) };
  for (const a of g.zeros) {
    const num: Cx = { re: z.re - a.re, im: z.im - a.im };
    // 1 − conj(a)·z
    const conjAz = cxMul({ re: a.re, im: -a.im }, z);
    const den: Cx = { re: 1 - conjAz.re, im: -conjAz.im };
    acc = cxMul(acc, cxDiv(num, den));
  }
  return acc;
}

function blaschkeGenome(a: LineageGlyph, b: LineageGlyph, rng: Rng): BlaschkeGenome {
  const degree = 1 + ((a.ordinal * 3 + b.ordinal) % 5); // 1..5
  const zeros: Cx[] = [];
  for (let k = 0; k < degree; k++) {
    const rho = 0.25 + rng() * 0.6; // (0,1) open disk: max 0.85 < 1
    const phi = rng() * 2 * Math.PI;
    zeros.push({ re: round4(rho * Math.cos(phi)), im: round4(rho * Math.sin(phi)) });
  }
  const rotation = round4(rng() * 2 * Math.PI);
  // Verify the inner-function property |B|=1 on the unit circle.
  let boundaryError = 0;
  const probe = { zeros, rotation };
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * 2 * Math.PI;
    const z: Cx = { re: Math.cos(t), im: Math.sin(t) };
    boundaryError = Math.max(boundaryError, Math.abs(cxAbs(blaschkeAt(probe, z)) - 1));
  }
  return { degree, zeros, rotation, boundaryError };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE CHILD — assembling the freak structure
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Rarity tiers — the rarer the child, the stranger and more dangerous. */
export type BabyRank = 'COMMON' | 'RARE' | 'MYTHIC' | 'FORBIDDEN';

/** A bred super-creature child — the freak structure the ritual begot. */
export interface BabyGenome {
  /** Deterministic id (`b:${parentA}x${parentB}#${nonce}`). */
  readonly id: string;
  /** Glyph-derived name, e.g. "Σ×a ✶3". */
  readonly name: string;
  /** Parent lineage indices [A, B]. */
  readonly parents: readonly [number, number];
  /** Parent glyphs [A, B]. */
  readonly glyphs: readonly [string, string];
  /** True when bred from the apex's blood. */
  readonly apexBlooded: boolean;
  readonly ritual: RitualOutcome;
  /** Parental blend weight toward parent A in [0,1] (from the rite's equilibrium). */
  readonly blend: number;
  readonly umbral: UmbralSignature;
  readonly homotopy: HomotopyGenome;
  readonly chaos: ChaosGenome;
  readonly blaschke: BlaschkeGenome;
  /** Rarity in [0,1] combining game entropy, homotopy, chaos and degree. */
  readonly rarity: number;
  readonly rank: BabyRank;
  /** Base body hue in [0,1). */
  readonly hue: number;
  readonly seed: number;
}

function rankOf(rarity: number): BabyRank {
  if (rarity >= 0.8) return 'FORBIDDEN';
  if (rarity >= 0.6) return 'MYTHIC';
  if (rarity >= 0.35) return 'RARE';
  return 'COMMON';
}

/**
 * Perform the rite between two lineage glyphs and return the child genome. Deterministic in
 * `(a.index, b.index, nonce)`. Self-pairing (a===b) is the asexual case; same-kin/script pairings
 * are inbred; everything else is a hybrid. O(1) amortised (fixed-size numerical kernels).
 */
export function breed(a: LineageGlyph, b: LineageGlyph, nonce = 0): BabyGenome {
  const seed = hashSeed(`breed:${a.index}:${b.index}:${nonce}`);
  const rng = mulberry32(seed);
  const ritual = runRitual(a, b, rng);
  const blend = ritual.cooperate; // cooperation favours parent A's contribution
  const umbral = umbralSignature(a, b, blend);
  const homotopy = homotopyGenome(a, b, rng);
  const chaos = chaosGenome(a, b, rng);
  const blaschke = blaschkeGenome(a, b, rng);

  // Rarity: a mixed equilibrium (high entropy), a nonzero homotopy class, a linked lineage, strong
  // chaos and a high Blaschke degree all make the child rarer. Weighted, clamped to [0,1].
  const chaosTerm = clamp01(chaos.lyapunov / 0.6);
  const rarity = round4(
    clamp01(
      0.34 * ritual.entropy +
        0.18 * (Math.min(3, Math.abs(homotopy.winding)) / 3) +
        0.14 * (Math.abs(homotopy.linking) > 0 ? 1 : 0) +
        0.18 * chaosTerm +
        0.16 * ((blaschke.degree - 1) / 4),
    ),
  );

  const apexBlooded = a.kin === 'apex' || b.kin === 'apex';
  const hue =
    (a.codepoint * 0.0131 + b.codepoint * 0.0071 + blend * 0.37 + (apexBlooded ? 0.5 : 0)) % 1;
  const tag = nonce > 0 ? ` ✶${nonce}` : '';
  return {
    id: `b:${a.index}x${b.index}#${nonce}`,
    name: `${a.glyph}×${b.glyph}${tag}`,
    parents: [a.index, b.index],
    glyphs: [a.glyph, b.glyph],
    apexBlooded,
    ritual,
    blend,
    umbral,
    homotopy,
    chaos,
    blaschke,
    rarity,
    rank: rankOf(rarity),
    hue: round4((hue + 1) % 1),
    seed,
  };
}

/** Breed by lineage indices (wraps modulo 101). */
export function breedAt(i: number, j: number, nonce = 0): BabyGenome {
  return breed(lineageAt(i), lineageAt(j), nonce);
}

/**
 * A random rite drawn from a seeded `rng`: most pairings are cross-lineage hybrids, but with real
 * probability the rite is inbred (same kin) or asexual (a glyph with itself), per the brief's
 * "inbred asexual hybrid" ritual. The apex joins rites at a small, deterministic rate.
 */
export function randomBreeding(rng: Rng): BabyGenome {
  const roll = rng();
  let i = Math.floor(rng() * BROTHER_COUNT * 2); // 0..99 (a non-apex parent)
  let j: number;
  if (roll < 0.12) {
    j = i; // asexual self-rite
  } else if (roll < 0.4) {
    // inbred — same kin (offset within the same 50-block of sisters/brothers)
    const block = i < SISTER_COUNT ? 0 : SISTER_COUNT;
    j = block + Math.floor(rng() * SISTER_COUNT);
  } else {
    j = Math.floor(rng() * 100);
  }
  if (rng() < 0.06) i = 100; // the apex's blood enters the pool, rarely
  const nonce = 1 + Math.floor(rng() * 0xffff);
  return breedAt(i, j, nonce);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// VISUALISATION — pure data extraction for the Dome's Architecture cycler
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Sample the child's de Jong strange-attractor orbit as interleaved [x,y] in [−2,2]². */
export function babyAttractorPath(g: BabyGenome, steps = 4000): Float64Array {
  const out = new Float64Array(steps * 2);
  let x = 0.1;
  let y = 0.1;
  for (let i = 0; i < 80; i++) [x, y] = deJong(g.chaos, x, y); // burn transient
  for (let i = 0; i < steps; i++) {
    [x, y] = deJong(g.chaos, x, y);
    out[2 * i] = x;
    out[2 * i + 1] = y;
  }
  return out;
}

/** Sample the child's homotopy loop as interleaved [x,y] (winds {@link HomotopyGenome.winding} times). */
export function babyLoopPath(g: BabyGenome, samples = 256): Float64Array {
  return sampleLoop(g.homotopy.winding, g.homotopy.harmonics, g.homotopy.freqs, samples);
}

/** Sample the Blaschke boundary image B(e^{2πit}) as interleaved [re,im] (winds `degree` times). */
export function babyBlaschkeImage(g: BabyGenome, samples = 256): Float64Array {
  const out = new Float64Array(samples * 2);
  const probe = { zeros: g.blaschke.zeros as ReadonlyArray<Cx>, rotation: g.blaschke.rotation };
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    const w = blaschkeAt(probe, { re: Math.cos(t), im: Math.sin(t) });
    out[2 * i] = w.re;
    out[2 * i + 1] = w.im;
  }
  return out;
}

/** The umbral coefficient spectrum [S(n,0..n)] for the data-viz bars. */
export function babyUmbralCoeffs(g: BabyGenome): number[] {
  return g.umbral.coeffs.slice();
}
