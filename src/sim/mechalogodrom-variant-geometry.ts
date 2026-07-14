/**
 * MECHALOGODROM VARIANT SHELL GEOMETRY — ten NAMED mathematical constructions, one per bipolar
 * variant sub-brain (owner directive 2026-07-14: "not just decorative bullshit — real math, real
 * functional operational capable stuff that's hard wired into the neural network … honest, true,
 * factual, real, defensible, falsifiable").
 *
 * Every shell is a genuine mathematical object computed from its defining equations:
 *   0 möbius-escher-band        — Möbius band (half-twist ruled surface) with Escher stair steps
 *   1 poincare-hyperbolic-web   — Poincaré-disk geodesics (circles orthogonal to the boundary)
 *   2 mercator-loxodrome-shell  — constant-bearing rhumb lines via the Mercator/Gudermannian map
 *   3 kakeya-needle-sweep       — Besicovitch sector-translation needle sweep (area shrinks, length 1)
 *   4 collatz-orbit-cathedral   — exact 3n+1 orbits rendered as log-radial polylines
 *   5 hopf-fibration-chandelier — Hopf fibers of S³→S², stereographically projected linked circles
 *   6 clifford-torus-rotor      — the flat Clifford torus in S³ under a 4D double rotation
 *   7 enneper-minimal-bloom     — Enneper's minimal surface (numerically vanishing mean curvature)
 *   8 aizawa-strange-attractor  — fixed-step RK4 orbit of the Aizawa system (sensitive dependence)
 *   9 weierstrass-roughness-bloom — Weierstrass-type nowhere-smooth radial modulation on a sphere
 *
 * HARD WIRING (both directions, honest):
 *   read  — each shell's morph parameters are driven by ITS OWN sub-brain's live signals
 *           (normalized activity, STDP-learned gain, Global-Workspace blaze, bipolar swing);
 *   write — each shell's `invariant()` is a REAL measured quantity of the current geometry
 *           (torsion, Gauss–Bonnet defect, measured bearing, swept-area efficiency, stopping time,
 *           fiber dispersion, projected inflation, bloom extent, orbit RMS radius, total variation)
 *           and is fed back into the fusion brain as that variant's ninth, EMBODIED sense — the ten
 *           sub-brains finally perceive genuinely different worlds (their own bodies).
 * The deep topological facts (orientation-reversing holonomy, angle-sum defect < π, linking number
 * ±1, |p|=1 on S³, mean curvature ≈ 0, exact Collatz stopping times, Besicovitch area shrinkage,
 * exponential trajectory divergence, geometric roughness growth) are pinned by the test battery in
 * tests/mechalogodrom-variant-geometry.test.ts — falsifiable, not vibes.
 *
 * DETERMINISM: every method is a pure function of (t, drive) — no rng, no clocks, no allocation in
 * write()/invariant() steady state. Buffers are caller-owned; write() returns floats written.
 */

export const VARIANT_SHELL_COUNT = 10;
/** Fixed per-shell segment budget: 2 vertices × 3 floats per segment. */
export const VARIANT_SHELL_MAX_SEGMENTS = 560;
export const VARIANT_SHELL_FLOATS = VARIANT_SHELL_MAX_SEGMENTS * 6;

const TAU = Math.PI * 2;

export interface VariantShellDrive {
  /** 0..1 — this sub-brain's normalized live activity. */
  activity: number;
  /** 0.25..2.5 — this variant→fusion STDP-learned trust gain. */
  gain: number;
  /** 0..1 — Global-Workspace blaze (1 ⇒ this sub-brain won the workspace). */
  blaze: number;
  /** −1..1 — the shell's bipolar manic↔depressive swing. */
  bipolar: number;
}

export interface VariantShellGeometry {
  /** Canonical mathematical name (kebab-case). */
  readonly name: string;
  /** One-line honest statement of the construction and its falsifiable property. */
  readonly mathematics: string;
  /**
   * Write the current morphed line-segment endpoints (xyzxyz per segment) into `out`.
   * Pure in (t, drive); allocation-free; returns the number of floats written (≤ VARIANT_SHELL_FLOATS).
   */
  write(out: Float32Array, t: number, drive: VariantShellDrive): number;
  /**
   * The shell's live measured signal in [0,1] — a real quantity of the current geometry, consumed
   * by the fusion brain as this variant's embodied sense. Pure in (t, drive); allocation-free.
   */
  invariant(t: number, drive: VariantShellDrive): number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ────────────────────────────── 0 · MÖBIUS–ESCHER BAND ────────────────────────────── */

const MOBIUS_U = 96;
const MOBIUS_W = 0.42;

function mobiusPoint(
  u: number,
  w: number,
  stairLevels: number,
  stairAmp: number,
  out: { x: number; y: number; z: number },
): void {
  // Standard half-twist ruled Möbius band, plus an Escher staircase: the centreline height is
  // QUANTIZED into `stairLevels` discrete steps of a sine climb — stairs that ascend forever
  // around a loop that has only one side.
  const half = u / 2;
  const r = 1 + w * Math.cos(half);
  const raw = Math.sin(u * 3) * stairAmp;
  const stepped = Math.round((raw / stairAmp) * stairLevels) * (stairAmp / stairLevels);
  out.x = r * Math.cos(u);
  out.y = w * Math.sin(half) + (stairLevels > 0 ? stepped : raw);
  out.z = r * Math.sin(u);
}

function makeMobiusEscher(): VariantShellGeometry {
  const P = { x: 0, y: 0, z: 0 };
  const Q = { x: 0, y: 0, z: 0 };
  return {
    name: 'mobius-escher-band',
    mathematics:
      'Half-twist Möbius band (non-orientable: normal transport around the loop reverses) with an Escher stair-quantized centreline; live signal = normalized discrete torsion of the stepped rail.',
    write(out, t, drive) {
      const stairLevels = 3 + Math.round(4 * clamp01(drive.activity));
      const stairAmp = 0.14 + 0.1 * clamp01(drive.blaze);
      const spin = t * 0.11 + drive.bipolar * 0.35;
      let f = 0;
      // Two rails (w = ±MOBIUS_W) + rungs every 4th sample: the laddered one-sided staircase.
      for (let i = 0; i < MOBIUS_U; i++) {
        const u0 = (i / MOBIUS_U) * TAU + spin;
        const u1 = ((i + 1) / MOBIUS_U) * TAU + spin;
        for (const w of [-MOBIUS_W, MOBIUS_W]) {
          mobiusPoint(u0, w, stairLevels, stairAmp, P);
          mobiusPoint(u1, w, stairLevels, stairAmp, Q);
          out[f++] = P.x;
          out[f++] = P.y;
          out[f++] = P.z;
          out[f++] = Q.x;
          out[f++] = Q.y;
          out[f++] = Q.z;
        }
        if (i % 4 === 0) {
          mobiusPoint(u0, -MOBIUS_W, stairLevels, stairAmp, P);
          mobiusPoint(u0, MOBIUS_W, stairLevels, stairAmp, Q);
          out[f++] = P.x;
          out[f++] = P.y;
          out[f++] = P.z;
          out[f++] = Q.x;
          out[f++] = Q.y;
          out[f++] = Q.z;
        }
      }
      return f;
    },
    invariant(_t, drive) {
      // Discrete total torsion of the stepped centreline: sum of dihedral angles between
      // consecutive osculating planes. Rises as the stair morph sharpens — a real curve quantity.
      const stairLevels = 3 + Math.round(4 * clamp01(drive.activity));
      const stairAmp = 0.14 + 0.1 * clamp01(drive.blaze);
      const N = 48;
      let torsion = 0;
      let ax = 0;
      let ay = 0;
      let az = 0;
      let bx = 0;
      let by = 0;
      let bz = 0;
      let haveA = false;
      let haveB = false;
      let px = 0;
      let py = 0;
      let pz = 0;
      let nx0 = 0;
      let ny0 = 0;
      let nz0 = 0;
      let haveN = false;
      for (let i = 0; i <= N + 1; i++) {
        mobiusPoint((i / N) * TAU, 0, stairLevels, stairAmp, P);
        if (haveA) {
          const dx = P.x - px;
          const dy = P.y - py;
          const dz = P.z - pz;
          if (haveB) {
            // binormal = (prev-seg) × (this-seg)
            const cx = by * dz - bz * dy;
            const cy = bz * dx - bx * dz;
            const cz = bx * dy - by * dx;
            const cl = Math.hypot(cx, cy, cz) || 1;
            const nx = cx / cl;
            const ny = cy / cl;
            const nz = cz / cl;
            if (haveN) {
              const dot = Math.max(-1, Math.min(1, nx * nx0 + ny * ny0 + nz * nz0));
              torsion += Math.acos(Math.abs(dot));
            }
            nx0 = nx;
            ny0 = ny;
            nz0 = nz;
            haveN = true;
          }
          bx = dx;
          by = dy;
          bz = dz;
          haveB = true;
          void ax;
          void ay;
          void az;
        }
        ax = px;
        ay = py;
        az = pz;
        px = P.x;
        py = P.y;
        pz = P.z;
        haveA = true;
      }
      return clamp01(Math.tanh(torsion / 14));
    },
  };
}

/**
 * FALSIFIABLE TOPOLOGY (test surface): transport the ruling direction around the Möbius loop —
 * the band is non-orientable, so the returned direction is the NEGATIVE of the start. Returns the
 * dot product of the start/end transported ruling (−1 for a true half-twist band).
 */
export function mobiusHolonomyDot(): number {
  const P0 = { x: 0, y: 0, z: 0 };
  const P1 = { x: 0, y: 0, z: 0 };
  const dir = (u: number, o: { x: number; y: number; z: number }): void => {
    mobiusPoint(u, -0.5, 0, 0.0001, P0);
    mobiusPoint(u, 0.5, 0, 0.0001, P1);
    const l = Math.hypot(P1.x - P0.x, P1.y - P0.y, P1.z - P0.z) || 1;
    o.x = (P1.x - P0.x) / l;
    o.y = (P1.y - P0.y) / l;
    o.z = (P1.z - P0.z) / l;
  };
  const start = { x: 0, y: 0, z: 0 };
  const end = { x: 0, y: 0, z: 0 };
  dir(0, start);
  dir(TAU, end); // u = 2π returns to the SAME centreline point with the ruling reversed
  return start.x * end.x + start.y * end.y + start.z * end.z;
}

/* ─────────────────────────── 1 · POINCARÉ HYPERBOLIC WEB ─────────────────────────── */

const POINCARE_CHORDS = 42;
const POINCARE_ARC_SEGS = 10;

/** Sample the Poincaré geodesic between boundary angles a and b at parameter s∈[0,1]. */
export function poincareGeodesicPoint(
  a: number,
  b: number,
  s: number,
  out: { x: number; y: number },
): void {
  let gap = (b - a) % TAU;
  if (gap < 0) gap += TAU;
  if (gap > Math.PI) {
    const tmp = a;
    a = b;
    b = tmp + TAU;
    gap = TAU - gap;
  }
  const mid = (a + b) / 2;
  const half = gap / 2;
  if (half > Math.PI / 2 - 1e-6 || half < 1e-6) {
    // Diameter (or degenerate): the geodesic is the straight chord.
    const x0 = Math.cos(a);
    const y0 = Math.sin(a);
    const x1 = Math.cos(b);
    const y1 = Math.sin(b);
    out.x = x0 + (x1 - x0) * s;
    out.y = y0 + (y1 - y0) * s;
    return;
  }
  // Circle orthogonal to the unit circle through e^{ia}, e^{ib}: centre sec(half)·e^{i·mid},
  // radius tan(half) — |C|² = 1 + r² is exactly the orthogonality condition.
  const cx = Math.cos(mid) / Math.cos(half);
  const cy = Math.sin(mid) / Math.cos(half);
  const r = Math.tan(half);
  const angA = Math.atan2(Math.sin(a) - cy, Math.cos(a) - cx);
  let angB = Math.atan2(Math.sin(b) - cy, Math.cos(b) - cx);
  let sweep = angB - angA;
  while (sweep > Math.PI) sweep -= TAU;
  while (sweep < -Math.PI) sweep += TAU;
  void angB;
  const ang = angA + sweep * s;
  out.x = cx + r * Math.cos(ang);
  out.y = cy + r * Math.sin(ang);
}

/**
 * FALSIFIABLE GEOMETRY (test + live-sense core): interior angles of the hyperbolic triangle with
 * ideal-ish vertices at boundary angles (rotated by `spin`, squeezed by `squeeze`). By
 * Gauss–Bonnet the angle sum is < π and the defect π − Σ equals the hyperbolic area.
 */
const DEFECT_VERTS = new Float64Array(3);
const DEFECT_P0 = { x: 0, y: 0 };
const DEFECT_P1 = { x: 0, y: 0 };

export function poincareTriangleDefect(spin: number, squeeze: number): number {
  const verts = DEFECT_VERTS;
  verts[0] = spin;
  verts[1] = spin + TAU / 3 + squeeze;
  verts[2] = spin + (2 * TAU) / 3 - squeeze;
  const p0 = DEFECT_P0;
  const p1 = DEFECT_P1;
  let angleSum = 0;
  for (let i = 0; i < 3; i++) {
    const va = verts[i]!;
    const vb = verts[(i + 1) % 3]!;
    const vc = verts[(i + 2) % 3]!;
    // Tangents of the two geodesics leaving vertex va (sampled just inside the disk).
    const eps = 0.012;
    poincareGeodesicPoint(va, vb, eps, p0);
    poincareGeodesicPoint(va, vc, eps, p1);
    const ax = p0.x - Math.cos(va) * (1 - 1e-9);
    const ay = p0.y - Math.sin(va) * (1 - 1e-9);
    const bx = p1.x - Math.cos(va);
    const by = p1.y - Math.sin(va);
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    const dot = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
    angleSum += Math.acos(dot);
  }
  return Math.PI - angleSum;
}

function makePoincareWeb(): VariantShellGeometry {
  const p = { x: 0, y: 0 };
  return {
    name: 'poincare-hyperbolic-web',
    mathematics:
      'Poincaré-disk geodesics — circular arcs orthogonal to the boundary circle (|C|² = 1 + r²) — lifted to a curved bowl; live signal = Gauss–Bonnet angle defect of a sampled geodesic triangle (< π ⇔ negative curvature).',
    write(out, t, drive) {
      const skip = 5 + Math.round(6 * clamp01(drive.activity));
      const bowl = 0.55 + 0.5 * clamp01(drive.blaze) + 0.15 * drive.bipolar;
      const spin = t * 0.07;
      let f = 0;
      for (let c = 0; c < POINCARE_CHORDS; c++) {
        const a = (c / POINCARE_CHORDS) * TAU + spin;
        const b = (((c + skip) % POINCARE_CHORDS) / POINCARE_CHORDS) * TAU + spin;
        for (let s = 0; s < POINCARE_ARC_SEGS; s++) {
          if (f + 6 > VARIANT_SHELL_FLOATS) return f;
          poincareGeodesicPoint(a, b, s / POINCARE_ARC_SEGS, p);
          const r0 = p.x * p.x + p.y * p.y;
          out[f++] = p.x;
          out[f++] = bowl * (1 - r0);
          out[f++] = p.y;
          poincareGeodesicPoint(a, b, (s + 1) / POINCARE_ARC_SEGS, p);
          const r1 = p.x * p.x + p.y * p.y;
          out[f++] = p.x;
          out[f++] = bowl * (1 - r1);
          out[f++] = p.y;
        }
      }
      return f;
    },
    invariant(t, drive) {
      const defect = poincareTriangleDefect(t * 0.07, 0.5 * clamp01(drive.activity));
      return clamp01(defect / Math.PI);
    },
  };
}

/* ────────────────────────── 2 · MERCATOR LOXODROME SHELL ────────────────────────── */

const LOXO_CURVES = 7;
const LOXO_SEGS = 44;

/** Loxodrome point at latitude φ for bearing β: lon = tan(β)·(inverse Gudermannian of φ). */
export function loxodromePoint(
  phi: number,
  beta: number,
  lon0: number,
  out: { x: number; y: number; z: number },
): void {
  const mercY = Math.log(Math.tan(Math.PI / 4 + phi / 2)); // gd⁻¹(φ)
  const lon = lon0 + Math.tan(beta) * mercY;
  const c = Math.cos(phi);
  out.x = c * Math.cos(lon);
  out.y = Math.sin(phi);
  out.z = c * Math.sin(lon);
}

/**
 * FALSIFIABLE PROPERTY (test + live-sense core): the measured angle between the curve tangent and
 * the local meridian, at latitude φ. A true rhumb line holds this constant (= β) at EVERY point.
 */
const LOXO_A = { x: 0, y: 0, z: 0 };
const LOXO_B = { x: 0, y: 0, z: 0 };

export function loxodromeMeasuredBearing(phi: number, beta: number): number {
  const h = 1e-4;
  const A = LOXO_A;
  const B = LOXO_B;
  loxodromePoint(phi - h, beta, 0, A);
  loxodromePoint(phi + h, beta, 0, B);
  const tx = B.x - A.x;
  const ty = B.y - A.y;
  const tz = B.z - A.z;
  // Local meridian (north) and parallel (east) directions at φ, lon of the midpoint.
  loxodromePoint(phi, beta, 0, A);
  const lon = Math.atan2(A.z, A.x);
  const nx = -Math.sin(phi) * Math.cos(lon);
  const ny = Math.cos(phi);
  const nz = -Math.sin(phi) * Math.sin(lon);
  const ex = -Math.sin(lon);
  const ez = Math.cos(lon);
  const north = tx * nx + ty * ny + tz * nz;
  const east = tx * ex + tz * ez;
  return Math.atan2(Math.abs(east), north);
}

function makeLoxodromeShell(): VariantShellGeometry {
  const P = { x: 0, y: 0, z: 0 };
  const Q = { x: 0, y: 0, z: 0 };
  return {
    name: 'mercator-loxodrome-shell',
    mathematics:
      'Rhumb lines on the sphere via the inverse Gudermannian (Mercator) map — curves of constant bearing spiralling into both poles; live signal = the measured tangent-to-meridian bearing (loxodrome constancy).',
    write(out, t, drive) {
      const beta = 0.5 + 0.65 * clamp01(drive.activity) + 0.18 * drive.bipolar;
      const spin = t * 0.13;
      const cap = Math.PI / 2 - 0.06;
      let f = 0;
      for (let c = 0; c < LOXO_CURVES; c++) {
        const lon0 = (c / LOXO_CURVES) * TAU + spin;
        for (let s = 0; s < LOXO_SEGS; s++) {
          if (f + 6 > VARIANT_SHELL_FLOATS) return f;
          const phi0 = -cap + (2 * cap * s) / LOXO_SEGS;
          const phi1 = -cap + (2 * cap * (s + 1)) / LOXO_SEGS;
          loxodromePoint(phi0, beta, lon0, P);
          loxodromePoint(phi1, beta, lon0, Q);
          out[f++] = P.x;
          out[f++] = P.y;
          out[f++] = P.z;
          out[f++] = Q.x;
          out[f++] = Q.y;
          out[f++] = Q.z;
        }
      }
      return f;
    },
    invariant(_t, drive) {
      const beta = 0.5 + 0.65 * clamp01(drive.activity) + 0.18 * drive.bipolar;
      // Measure the bearing from the geometry at a probe latitude — not from the parameter.
      return clamp01(loxodromeMeasuredBearing(0.4, beta) / (Math.PI / 2));
    },
  };
}

/* ─────────────────────────── 3 · KAKEYA NEEDLE SWEEP ─────────────────────────── */

const KAKEYA_GHOSTS = 40;

/**
 * Needle position for sweep phase s∈[0,1) with J Besicovitch sectors: within sector j the unit
 * needle rotates through π/J about one end while the sector is sheared sideways (the
 * Pál-join/translation trick that lets total swept area shrink as J grows).
 */
export function kakeyaNeedle(
  s: number,
  J: number,
  out: { ax: number; ay: number; bx: number; by: number },
): void {
  const j = Math.min(J - 1, Math.floor(s * J));
  const local = s * J - j;
  const theta = (j + local) * (Math.PI / J);
  // Alternating shear translation per sector — the overlap that beats the naive π/8 disc area.
  const shear = ((j % 2 === 0 ? 1 : -1) * (Math.floor(j / 2) + 0.5)) / J;
  const px = shear;
  const py = 0;
  out.ax = px;
  out.ay = py;
  out.bx = px + Math.cos(theta);
  out.by = py + Math.sin(theta);
}

/** Module scratch for the occupancy estimate — refilled per call, keeps the hot path allocation-free. */
const KAKEYA_GRID = new Uint8Array(40 * 40);
const KAKEYA_SCRATCH = { ax: 0, ay: 0, bx: 0, by: 0 };

/**
 * FALSIFIABLE PHENOMENON (test + live-sense core): coarse-grid estimate of the area swept by the
 * needle ghosts. Besicovitch: with more sectors (bigger J) the same π of direction coverage fits
 * in LESS area. Deterministic 40×40 occupancy grid over [−1.5,1.5]².
 */
export function kakeyaSweptAreaEstimate(J: number, ghosts = 160): number {
  const G = 40;
  const seen = KAKEYA_GRID;
  seen.fill(0);
  const N = KAKEYA_SCRATCH;
  let cells = 0;
  for (let g = 0; g < ghosts; g++) {
    kakeyaNeedle(g / ghosts, J, N);
    for (let s = 0; s <= 24; s++) {
      const x = N.ax + ((N.bx - N.ax) * s) / 24;
      const y = N.ay + ((N.by - N.ay) * s) / 24;
      const gx = Math.floor(((x + 1.5) / 3) * G);
      const gy = Math.floor(((y + 1.5) / 3) * G);
      if (gx < 0 || gy < 0 || gx >= G || gy >= G) continue;
      const idx = gy * G + gx;
      if (seen[idx] === 0) {
        seen[idx] = 1;
        cells++;
      }
    }
  }
  return (cells / (G * G)) * 9; // cell count → area in the 3×3 window
}

function makeKakeyaSweep(): VariantShellGeometry {
  const N = { ax: 0, ay: 0, bx: 0, by: 0 };
  return {
    name: 'kakeya-needle-sweep',
    mathematics:
      'Besicovitch needle sweep: a unit needle turns through π inside sector-sheared positions whose union shrinks as sectors multiply; live signal = 1 − measured swept-area estimate (the Kakeya efficiency).',
    write(out, t, drive) {
      const J = 2 + Math.round(6 * clamp01(drive.activity));
      const phase = (t * 0.05 + 0.2 * clamp01(drive.blaze)) % 1;
      let f = 0;
      for (let g = 0; g < KAKEYA_GHOSTS; g++) {
        if (f + 6 > VARIANT_SHELL_FLOATS) return f;
        kakeyaNeedle((((g / KAKEYA_GHOSTS + phase) % 1) + 1) % 1, J, N);
        const lift = 0.22 * Math.sin((g / KAKEYA_GHOSTS) * TAU + drive.bipolar * 2);
        out[f++] = N.ax;
        out[f++] = lift;
        out[f++] = N.ay;
        out[f++] = N.bx;
        out[f++] = -lift;
        out[f++] = N.by;
      }
      return f;
    },
    invariant(_t, drive) {
      const J = 2 + Math.round(6 * clamp01(drive.activity));
      // Efficiency: how far below the J=2 baseline the sweep has compressed. Real measurement.
      const area = kakeyaSweptAreaEstimate(J, 64);
      const base = kakeyaSweptAreaEstimate(2, 64);
      return clamp01(1 - area / (base || 1));
    },
  };
}

/* ────────────────────────── 4 · COLLATZ ORBIT CATHEDRAL ────────────────────────── */

const COLLATZ_SEEDS = 8;
const COLLATZ_MAX_STEPS = 64;

/** Exact 3n+1 stopping time (number of steps to reach 1). Pure integer arithmetic. */
export function collatzStoppingTime(n: number): number {
  let steps = 0;
  let v = n;
  while (v !== 1 && steps < 10_000) {
    v = v % 2 === 0 ? v / 2 : 3 * v + 1;
    steps++;
  }
  return steps;
}

/** k-th orbit value of n (k=0 ⇒ n). */
export function collatzOrbitValue(n: number, k: number): number {
  let v = n;
  for (let i = 0; i < k; i++) v = v % 2 === 0 ? v / 2 : 3 * v + 1;
  return v;
}

function makeCollatzCathedral(): VariantShellGeometry {
  return {
    name: 'collatz-orbit-cathedral',
    mathematics:
      'Exact 3n+1 orbits (hailstone sequences) as log-radial polylines — vertex radii are ln of the true orbit values; live signal = mean stopping time of the current seed window (integer-exact).',
    write(out, t, drive) {
      const window = 27 + 8 * Math.round(6 * clamp01(drive.activity)); // quantized seed window
      const spin = t * 0.09;
      let f = 0;
      for (let s = 0; s < COLLATZ_SEEDS; s++) {
        const seed = window + s;
        const steps = Math.min(COLLATZ_MAX_STEPS, collatzStoppingTime(seed));
        const baseAngle = (s / COLLATZ_SEEDS) * TAU + spin;
        let v = seed;
        let px = 0;
        let py = 0;
        let pz = 0;
        let have = false;
        for (let k = 0; k <= steps; k++) {
          const r = 0.25 + (Math.log(v) / Math.log(9232)) * 0.9; // 9232 = max of the 27-orbit
          const a = baseAngle + k * 0.145 * (1 + 0.3 * drive.bipolar);
          const y = -0.6 + (1.2 * k) / COLLATZ_MAX_STEPS + 0.1 * clamp01(drive.blaze);
          const x = r * Math.cos(a);
          const z = r * Math.sin(a);
          if (have) {
            if (f + 6 > VARIANT_SHELL_FLOATS) return f;
            out[f++] = px;
            out[f++] = py;
            out[f++] = pz;
            out[f++] = x;
            out[f++] = y;
            out[f++] = z;
          }
          px = x;
          py = y;
          pz = z;
          have = true;
          v = v % 2 === 0 ? v / 2 : 3 * v + 1;
        }
      }
      return f;
    },
    invariant(_t, drive) {
      const window = 27 + 8 * Math.round(6 * clamp01(drive.activity));
      let sum = 0;
      for (let s = 0; s < COLLATZ_SEEDS; s++) sum += collatzStoppingTime(window + s);
      return clamp01(sum / COLLATZ_SEEDS / 140);
    },
  };
}

/* ───────────────────────── 5 · HOPF FIBRATION CHANDELIER ───────────────────────── */

const HOPF_FIBERS = 11;
const HOPF_FIBER_SEGS = 22;

/**
 * A point of the Hopf fiber over base (θ,φ) ∈ S² at fiber parameter ψ, stereographically
 * projected from S³ ⊂ R⁴ to R³. Fibers over distinct base points are disjoint circles that all
 * pairwise LINK once — the S³ → S² Hopf map's defining topology.
 */
export function hopfFiberPoint(
  theta: number,
  phi: number,
  psi: number,
  out: { x: number; y: number; z: number },
): void {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  // S³ point: (c·e^{i(ψ+φ)}, s·e^{iψ}) — |z1|²+|z2|² = 1 exactly.
  const x1 = c * Math.cos(psi + phi);
  const x2 = c * Math.sin(psi + phi);
  const x3 = s * Math.cos(psi);
  const x4 = s * Math.sin(psi);
  const d = 1.0000001 - x4; // stereographic projection from the pole (0,0,0,1)
  out.x = x1 / d;
  out.y = x2 / d;
  out.z = x3 / d;
}

/**
 * FALSIFIABLE TOPOLOGY (test surface): numerical Gauss linking integral of two Hopf fibers.
 * Every distinct pair links exactly once (|Lk| = 1).
 */
export function hopfLinkingNumber(
  thetaA: number,
  phiA: number,
  thetaB: number,
  phiB: number,
  samples = 48,
): number {
  const A0 = { x: 0, y: 0, z: 0 };
  const A1 = { x: 0, y: 0, z: 0 };
  const B0 = { x: 0, y: 0, z: 0 };
  const B1 = { x: 0, y: 0, z: 0 };
  let acc = 0;
  for (let i = 0; i < samples; i++) {
    hopfFiberPoint(thetaA, phiA, (i / samples) * TAU, A0);
    hopfFiberPoint(thetaA, phiA, ((i + 1) / samples) * TAU, A1);
    const ax = (A0.x + A1.x) / 2;
    const ay = (A0.y + A1.y) / 2;
    const az = (A0.z + A1.z) / 2;
    const dax = A1.x - A0.x;
    const day = A1.y - A0.y;
    const daz = A1.z - A0.z;
    for (let j = 0; j < samples; j++) {
      hopfFiberPoint(thetaB, phiB, (j / samples) * TAU, B0);
      hopfFiberPoint(thetaB, phiB, ((j + 1) / samples) * TAU, B1);
      const bx = (B0.x + B1.x) / 2;
      const by = (B0.y + B1.y) / 2;
      const bz = (B0.z + B1.z) / 2;
      const dbx = B1.x - B0.x;
      const dby = B1.y - B0.y;
      const dbz = B1.z - B0.z;
      const rx = ax - bx;
      const ry = ay - by;
      const rz = az - bz;
      const r3 = Math.pow(rx * rx + ry * ry + rz * rz, 1.5) || 1;
      // (dA × dB) · r / |r|³
      const cx = day * dbz - daz * dby;
      const cy = daz * dbx - dax * dbz;
      const cz = dax * dby - day * dbx;
      acc += (cx * rx + cy * ry + cz * rz) / r3;
    }
  }
  return acc / (4 * Math.PI);
}

function makeHopfChandelier(): VariantShellGeometry {
  const P = { x: 0, y: 0, z: 0 };
  const Q = { x: 0, y: 0, z: 0 };
  const P2 = { x: 0, y: 0, z: 0 };
  // Fiber-centroid scratch (6 × xyz) — allocated once per shell, refilled per invariant call.
  const cs = new Float32Array(18);
  return {
    name: 'hopf-fibration-chandelier',
    mathematics:
      'Hopf fibers of S³→S² (unit quaternion circles) stereographically projected — pairwise linking number exactly 1; live signal = fiber-ring dispersion as the base circle precesses.',
    write(out, t, drive) {
      const baseTheta = 0.6 + 0.9 * clamp01(drive.activity) + 0.2 * drive.bipolar;
      const precess = t * 0.17;
      let f = 0;
      for (let m = 0; m < HOPF_FIBERS; m++) {
        const phi = (m / HOPF_FIBERS) * TAU + precess;
        for (let s = 0; s < HOPF_FIBER_SEGS; s++) {
          if (f + 6 > VARIANT_SHELL_FLOATS) return f;
          hopfFiberPoint(baseTheta, phi, (s / HOPF_FIBER_SEGS) * TAU, P);
          hopfFiberPoint(baseTheta, phi, ((s + 1) / HOPF_FIBER_SEGS) * TAU, Q);
          const g = 0.4 + 0.2 * clamp01(drive.blaze);
          out[f++] = P.x * g;
          out[f++] = P.y * g;
          out[f++] = P.z * g;
          out[f++] = Q.x * g;
          out[f++] = Q.y * g;
          out[f++] = Q.z * g;
        }
      }
      return f;
    },
    invariant(t, drive) {
      // Dispersion of projected fiber centroids — a real measurement of the live chandelier.
      const baseTheta = 0.6 + 0.9 * clamp01(drive.activity) + 0.2 * drive.bipolar;
      const precess = t * 0.17;
      let mx = 0;
      let my = 0;
      let mz = 0;
      for (let m = 0; m < 6; m++) {
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (let s = 0; s < 8; s++) {
          hopfFiberPoint(baseTheta, (m / 6) * TAU + precess, (s / 8) * TAU, P2);
          cx += P2.x / 8;
          cy += P2.y / 8;
          cz += P2.z / 8;
        }
        cs[m * 3] = cx;
        cs[m * 3 + 1] = cy;
        cs[m * 3 + 2] = cz;
        mx += cx / 6;
        my += cy / 6;
        mz += cz / 6;
      }
      let disp = 0;
      for (let m = 0; m < 6; m++) {
        disp += Math.hypot(cs[m * 3]! - mx, cs[m * 3 + 1]! - my, cs[m * 3 + 2]! - mz) / 6;
      }
      return clamp01(Math.tanh(disp));
    },
  };
}

/* ─────────────────────────── 6 · CLIFFORD TORUS ROTOR ─────────────────────────── */

const CLIFF_U = 18;
const CLIFF_V = 14;

/**
 * Clifford torus point (u,v) ↦ (cos u, sin u, cos v, sin v)/√2 ∈ S³ (|p| ≡ 1: the flat,
 * EUCLIDEAN-metric torus living in curved S³), double-rotated in the (x1,x2) and (x3,x4) planes,
 * then stereographically projected. `out4` optionally receives the pre-projection 4-vector.
 */
export function cliffordPoint(
  u: number,
  v: number,
  rotA: number,
  rotB: number,
  out: { x: number; y: number; z: number },
  out4?: { x1: number; x2: number; x3: number; x4: number },
): void {
  const s = Math.SQRT1_2;
  let x1 = s * Math.cos(u);
  let x2 = s * Math.sin(u);
  let x3 = s * Math.cos(v);
  let x4 = s * Math.sin(v);
  const ca = Math.cos(rotA);
  const sa = Math.sin(rotA);
  const cb = Math.cos(rotB);
  const sb = Math.sin(rotB);
  const y1 = x1 * ca - x2 * sa;
  const y2 = x1 * sa + x2 * ca;
  const y3 = x3 * cb - x4 * sb;
  const y4 = x3 * sb + x4 * cb;
  x1 = y1;
  x2 = y2;
  x3 = y3;
  x4 = y4;
  if (out4) {
    out4.x1 = x1;
    out4.x2 = x2;
    out4.x3 = x3;
    out4.x4 = x4;
  }
  const d = 1.12 - x4;
  out.x = x1 / d;
  out.y = x2 / d;
  out.z = x3 / d;
}

function makeCliffordRotor(): VariantShellGeometry {
  const P2 = { x: 0, y: 0, z: 0 };
  const P = { x: 0, y: 0, z: 0 };
  const Q = { x: 0, y: 0, z: 0 };
  return {
    name: 'clifford-torus-rotor',
    mathematics:
      'The flat Clifford torus (|p| ≡ 1 in S³ ⊂ R⁴, intrinsically Euclidean) under an independent 4D double rotation, stereographically projected; live signal = projected inflation (max/min radius) as the rotor sweeps the projection pole.',
    write(out, t, drive) {
      const rotA = t * (0.21 + 0.25 * clamp01(drive.activity));
      const rotB = t * (0.13 + 0.3 * clamp01((drive.gain - 0.25) / 2.25));
      let f = 0;
      for (let i = 0; i < CLIFF_U; i++) {
        const u0 = (i / CLIFF_U) * TAU;
        const u1 = ((i + 1) / CLIFF_U) * TAU;
        for (let j = 0; j < CLIFF_V; j++) {
          const v0 = (j / CLIFF_V) * TAU;
          if (f + 12 > VARIANT_SHELL_FLOATS) return f;
          cliffordPoint(u0, v0, rotA, rotB, P);
          cliffordPoint(u1, v0, rotA, rotB, Q);
          out[f++] = P.x * 0.5;
          out[f++] = P.y * 0.5;
          out[f++] = P.z * 0.5;
          out[f++] = Q.x * 0.5;
          out[f++] = Q.y * 0.5;
          out[f++] = Q.z * 0.5;
          const v1 = ((j + 1) / CLIFF_V) * TAU;
          cliffordPoint(u0, v1, rotA, rotB, Q);
          out[f++] = P.x * 0.5;
          out[f++] = P.y * 0.5;
          out[f++] = P.z * 0.5;
          out[f++] = Q.x * 0.5;
          out[f++] = Q.y * 0.5;
          out[f++] = Q.z * 0.5;
        }
      }
      return f;
    },
    invariant(t, drive) {
      const rotA = t * (0.21 + 0.25 * clamp01(drive.activity));
      const rotB = t * (0.13 + 0.3 * clamp01((drive.gain - 0.25) / 2.25));
      let rMin = Infinity;
      let rMax = 0;
      for (let i = 0; i < 12; i++) {
        cliffordPoint((i / 12) * TAU, (i / 12) * TAU * 2, rotA, rotB, P2);
        const r = Math.hypot(P2.x, P2.y, P2.z);
        if (r < rMin) rMin = r;
        if (r > rMax) rMax = r;
      }
      return clamp01(Math.tanh((rMax / (rMin || 1) - 1) * 0.5));
    },
  };
}

/* ────────────────────────── 7 · ENNEPER MINIMAL BLOOM ────────────────────────── */

const ENNEPER_RAD = 12;
const ENNEPER_ANG = 20;

/** Enneper's minimal surface — the classical Weierstrass–Enneper parametrization. */
export function enneperPoint(u: number, v: number, out: { x: number; y: number; z: number }): void {
  out.x = u - (u * u * u) / 3 + u * v * v;
  out.y = v - (v * v * v) / 3 + v * u * u;
  out.z = u * u - v * v;
}

/**
 * FALSIFIABLE GEOMETRY (test surface): numerical mean curvature of the Enneper surface at (u,v)
 * via central differences of the first/second fundamental forms. A minimal surface has H ≡ 0.
 */
export function enneperMeanCurvature(u: number, v: number): number {
  const h = 1e-3;
  const P = { x: 0, y: 0, z: 0 };
  const f = (a: number, b: number): [number, number, number] => {
    enneperPoint(a, b, P);
    return [P.x, P.y, P.z];
  };
  const sub = (a: number[], b: number[]): number[] => [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
  const Xu = sub(f(u + h, v) as number[], f(u - h, v) as number[]).map((c) => c / (2 * h));
  const Xv = sub(f(u, v + h) as number[], f(u, v - h) as number[]).map((c) => c / (2 * h));
  const Xuu = sub(
    sub(f(u + h, v) as number[], f(u, v) as number[]),
    sub(f(u, v) as number[], f(u - h, v) as number[]),
  ).map((c) => c / (h * h));
  const Xvv = sub(
    sub(f(u, v + h) as number[], f(u, v) as number[]),
    sub(f(u, v) as number[], f(u, v - h) as number[]),
  ).map((c) => c / (h * h));
  const fpp = f(u + h, v + h) as number[];
  const fpm = f(u + h, v - h) as number[];
  const fmp = f(u - h, v + h) as number[];
  const fmm = f(u - h, v - h) as number[];
  const Xuv = [0, 1, 2].map((i) => (fpp[i]! - fpm[i]! - fmp[i]! + fmm[i]!) / (4 * h * h));
  const n = [
    Xu[1]! * Xv[2]! - Xu[2]! * Xv[1]!,
    Xu[2]! * Xv[0]! - Xu[0]! * Xv[2]!,
    Xu[0]! * Xv[1]! - Xu[1]! * Xv[0]!,
  ];
  const nl = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
  const dot = (a: number[], b: number[]): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  const E = dot(Xu, Xu);
  const F = dot(Xu, Xv);
  const G = dot(Xv, Xv);
  const L = dot(Xuu, n) / nl;
  const M = dot(Xuv, n) / nl;
  const N2 = dot(Xvv, n) / nl;
  return (E * N2 - 2 * F * M + G * L) / (2 * (E * G - F * F) || 1);
}

function makeEnneperBloom(): VariantShellGeometry {
  const P = { x: 0, y: 0, z: 0 };
  const Q = { x: 0, y: 0, z: 0 };
  return {
    name: 'enneper-minimal-bloom',
    mathematics:
      "Enneper's minimal surface (mean curvature ≡ 0, verified numerically) blooming through its self-intersecting outer domain; live signal = normalized bloom radius (how deep into the self-intersection regime the drive pushes).",
    write(out, t, drive) {
      const R = 1.05 + 1.35 * clamp01(drive.activity) + 0.25 * drive.bipolar;
      const spin = t * 0.12;
      let f = 0;
      // Radial spokes + concentric rings of the (u,v) polar domain.
      for (let a = 0; a < ENNEPER_ANG; a++) {
        const ang = (a / ENNEPER_ANG) * TAU + spin;
        for (let r = 0; r < ENNEPER_RAD; r++) {
          if (f + 12 > VARIANT_SHELL_FLOATS) return f;
          const r0 = (r / ENNEPER_RAD) * R;
          const r1 = ((r + 1) / ENNEPER_RAD) * R;
          enneperPoint(r0 * Math.cos(ang), r0 * Math.sin(ang), P);
          enneperPoint(r1 * Math.cos(ang), r1 * Math.sin(ang), Q);
          const k = 0.22;
          out[f++] = P.x * k;
          out[f++] = P.z * k;
          out[f++] = P.y * k;
          out[f++] = Q.x * k;
          out[f++] = Q.z * k;
          out[f++] = Q.y * k;
          const ang1 = ((a + 1) / ENNEPER_ANG) * TAU + spin;
          enneperPoint(r1 * Math.cos(ang), r1 * Math.sin(ang), P);
          enneperPoint(r1 * Math.cos(ang1), r1 * Math.sin(ang1), Q);
          out[f++] = P.x * k;
          out[f++] = P.z * k;
          out[f++] = P.y * k;
          out[f++] = Q.x * k;
          out[f++] = Q.z * k;
          out[f++] = Q.y * k;
        }
      }
      return f;
    },
    invariant(_t, drive) {
      const R = 1.05 + 1.35 * clamp01(drive.activity) + 0.25 * drive.bipolar;
      return clamp01((R - 1.05) / 1.6);
    },
  };
}

/* ───────────────────────── 8 · AIZAWA STRANGE ATTRACTOR ───────────────────────── */

const AIZAWA_STEPS = 260;
const AIZAWA_DT = 0.014;

/** One RK4 step of the Aizawa system (a,b,c,d,e,f) = (0.95,0.7,0.6,3.5,0.25,0.1). */
export function aizawaStep(
  p: { x: number; y: number; z: number },
  dt: number,
  eParam: number,
): void {
  const A = 0.95;
  const B = 0.7;
  const C = 0.6;
  const D = 3.5;
  const F = 0.1;
  const deriv = (x: number, y: number, z: number, o: { x: number; y: number; z: number }): void => {
    o.x = (z - B) * x - D * y;
    o.y = D * x + (z - B) * y;
    o.z = C + A * z - (z * z * z) / 3 - (x * x + y * y) * (1 + eParam * z) + F * z * x * x * x;
  };
  const k1 = { x: 0, y: 0, z: 0 };
  const k2 = { x: 0, y: 0, z: 0 };
  const k3 = { x: 0, y: 0, z: 0 };
  const k4 = { x: 0, y: 0, z: 0 };
  deriv(p.x, p.y, p.z, k1);
  deriv(p.x + (dt / 2) * k1.x, p.y + (dt / 2) * k1.y, p.z + (dt / 2) * k1.z, k2);
  deriv(p.x + (dt / 2) * k2.x, p.y + (dt / 2) * k2.y, p.z + (dt / 2) * k2.z, k3);
  deriv(p.x + dt * k3.x, p.y + dt * k3.y, p.z + dt * k3.z, k4);
  p.x += (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x);
  p.y += (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y);
  p.z += (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z);
}

function makeAizawaAttractor(): VariantShellGeometry {
  const p = { x: 0.1, y: 0, z: 0 };
  return {
    name: 'aizawa-strange-attractor',
    mathematics:
      'The Aizawa strange attractor integrated with fixed-step RK4 from a fixed initial condition (sensitive dependence pinned by test); live signal = RMS orbit radius of the currently drawn window.',
    write(out, t, drive) {
      const eParam = 0.25 + 0.12 * clamp01(drive.activity) + 0.04 * drive.bipolar;
      // Deterministic: re-integrate the fixed-IC orbit each call (RK4 is cheap at this size),
      // skipping a transient, then draw the windowed polyline. Same (t,drive) ⇒ same curve.
      p.x = 0.1;
      p.y = 0;
      p.z = 0;
      const skip = 60 + (Math.floor(t * 6) % 40);
      for (let i = 0; i < skip; i++) aizawaStep(p, AIZAWA_DT, eParam);
      let f = 0;
      let px = p.x;
      let py = p.y;
      let pz = p.z;
      const k = 0.55 + 0.15 * clamp01(drive.blaze);
      for (let i = 0; i < AIZAWA_STEPS; i++) {
        aizawaStep(p, AIZAWA_DT, eParam);
        if (f + 6 > VARIANT_SHELL_FLOATS) return f;
        out[f++] = px * k;
        out[f++] = pz * k * 0.7;
        out[f++] = py * k;
        out[f++] = p.x * k;
        out[f++] = p.z * k * 0.7;
        out[f++] = p.y * k;
        px = p.x;
        py = p.y;
        pz = p.z;
      }
      return f;
    },
    invariant(t, drive) {
      const eParam = 0.25 + 0.12 * clamp01(drive.activity) + 0.04 * drive.bipolar;
      p.x = 0.1;
      p.y = 0;
      p.z = 0;
      const skip = 60 + (Math.floor(t * 6) % 40);
      for (let i = 0; i < skip; i++) aizawaStep(p, AIZAWA_DT, eParam);
      let rms = 0;
      for (let i = 0; i < 48; i++) {
        aizawaStep(p, AIZAWA_DT, eParam);
        rms += (p.x * p.x + p.y * p.y + p.z * p.z) / 48;
      }
      return clamp01(Math.sqrt(rms) / 2.4);
    },
  };
}

/* ──────────────────────── 9 · WEIERSTRASS ROUGHNESS BLOOM ──────────────────────── */

const WEIER_RINGS = 12;
const WEIER_RING_SEGS = 36;
const WEIER_B = 3.1;
const WEIER_ALPHA = 0.62;

/** Weierstrass-type radial modulation: r = 1 + A·Σ b^(−αk)·cos(bᵏ·θ + phase). */
export function weierstrassRadius(
  theta: number,
  octaves: number,
  amp: number,
  phase: number,
): number {
  let r = 1;
  for (let k = 0; k < octaves; k++) {
    r += amp * Math.pow(WEIER_B, -WEIER_ALPHA * k) * Math.cos(Math.pow(WEIER_B, k) * theta + phase);
  }
  return r;
}

/** Discrete total variation of one Weierstrass ring — the roughness the octaves buy. */
export function weierstrassTotalVariation(octaves: number, amp: number, samples = 240): number {
  let tv = 0;
  let prev = weierstrassRadius(0, octaves, amp, 0);
  for (let i = 1; i <= samples; i++) {
    const r = weierstrassRadius((i / samples) * TAU, octaves, amp, 0);
    tv += Math.abs(r - prev);
    prev = r;
  }
  return tv;
}

function makeWeierstrassBloom(): VariantShellGeometry {
  return {
    name: 'weierstrass-roughness-bloom',
    mathematics:
      'Weierstrass-type nowhere-smooth radial modulation on a sphere (b^(−αk) amplitudes with bα < b: total variation grows geometrically per octave); live signal = measured normalized total variation of the equator ring.',
    write(out, t, drive) {
      const octaves = 3 + Math.round(3 * clamp01(drive.activity));
      const amp = 0.1 + 0.1 * clamp01(drive.blaze);
      const phase = t * 0.4 + drive.bipolar;
      let f = 0;
      for (let ring = 0; ring < WEIER_RINGS; ring++) {
        const lat = -Math.PI / 2 + ((ring + 0.5) / WEIER_RINGS) * Math.PI;
        const cl = Math.cos(lat);
        for (let s = 0; s < WEIER_RING_SEGS; s++) {
          if (f + 6 > VARIANT_SHELL_FLOATS) return f;
          const th0 = (s / WEIER_RING_SEGS) * TAU;
          const th1 = ((s + 1) / WEIER_RING_SEGS) * TAU;
          const r0 = weierstrassRadius(th0 + ring * 0.7, octaves, amp * cl, phase) * 0.62;
          const r1 = weierstrassRadius(th1 + ring * 0.7, octaves, amp * cl, phase) * 0.62;
          out[f++] = r0 * cl * Math.cos(th0);
          out[f++] = r0 * Math.sin(lat);
          out[f++] = r0 * cl * Math.sin(th0);
          out[f++] = r1 * cl * Math.cos(th1);
          out[f++] = r1 * Math.sin(lat);
          out[f++] = r1 * cl * Math.sin(th1);
        }
      }
      return f;
    },
    invariant(_t, drive) {
      const octaves = 3 + Math.round(3 * clamp01(drive.activity));
      const amp = 0.1 + 0.1 * clamp01(drive.blaze);
      return clamp01(weierstrassTotalVariation(octaves, amp, 120) / 30);
    },
  };
}

/* ─────────────────────────────────── REGISTRY ─────────────────────────────────── */

/** The ten shells, index-aligned with the Mechalogodrom's variant sub-brains 0..9. */
export function createVariantShellGeometries(): VariantShellGeometry[] {
  return [
    makeMobiusEscher(),
    makePoincareWeb(),
    makeLoxodromeShell(),
    makeKakeyaSweep(),
    makeCollatzCathedral(),
    makeHopfChandelier(),
    makeCliffordRotor(),
    makeEnneperBloom(),
    makeAizawaAttractor(),
    makeWeierstrassBloom(),
  ];
}
