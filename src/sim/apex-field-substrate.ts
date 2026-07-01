/**
 * APEX Field Substrate — the field organs as GPU-resident texture stencils (the `resident-field` tier).
 *
 * Four of the eleven organs are continuum fields, not graphs: the Acoustic Meat-Drum (a wave equation),
 * the Thermodynamic Engine (heat diffusion), the Klein-Bottle Cortex (diffusion on a folded topology),
 * and the Quantum-Tunnel Lattice (a complex amplitude field). Fields are embarrassingly parallel
 * stencils, so they belong on the GPU: a 2048² texture is 4.19M resident cells stepped every frame in
 * one draw. Across the four organs that is tens of millions of *genuinely resident* parameters — the
 * honest bulk of the browser-side billion.
 *
 * This module owns the DETERMINISTIC CPU REFERENCE for each stencil (leapfrog wave + 5-point heat
 * diffusion) plus the matching GLSL fragment source. The CPU reference is the oracle; the GPU shader
 * ({@link APEX_FIELD_WAVE_FRAG} / {@link APEX_FIELD_HEAT_FRAG}) must reproduce it (same ping-pong
 * DataTexture pattern the repo's reaction-diffusion already uses). Deterministic (seeded {@link Rng}),
 * DOM/THREE-free — the render layer imports the shader strings; the sim imports the reference.
 *
 * @see src/sim/apex-parameter-manifold.ts  (the resident-field tier)
 * @see docs/APEX-1B-SUBSTRATE-ARCHITECTURE-2026-07-01.md
 */

import { mulberry32 } from '../math/rng';
import { type DeviceProfile, DEVICE_BROWSER } from './apex-parameter-manifold';

/** The two continuum-field update laws the organs use. */
export type FieldKind = 'wave' | 'diffusion';

/** A field organ: a `w`×`h` texture with `components` channels evolving by `kind`. */
export interface FieldOrgan {
  readonly name: 'acoustic' | 'heat' | 'klein' | 'tunnel';
  readonly w: number;
  readonly h: number;
  /** Channels held per texel (1 = scalar field, 2 = complex amplitude). */
  readonly components: number;
  readonly kind: FieldKind;
}

/** The four field organs at their browser-resident texture sizes (tens of millions of texels total). */
export const APEX_FIELDS: readonly FieldOrgan[] = [
  { name: 'acoustic', w: 2048, h: 2048, components: 1, kind: 'wave' },
  { name: 'heat', w: 2048, h: 2048, components: 1, kind: 'diffusion' },
  { name: 'klein', w: 1024, h: 1024, components: 1, kind: 'diffusion' },
  { name: 'tunnel', w: 1024, h: 1024, components: 2, kind: 'wave' },
];

/** Total texels × components a field-organ set designs for (its resident-field parameter budget). O(k). */
export function fieldDesignedParams(fields: readonly FieldOrgan[] = APEX_FIELDS): number {
  return fields.reduce((a, f) => a + f.w * f.h * f.components, 0);
}

/** Field parameters actually resident on a device (bounded by its per-organ texel cap). O(k). */
export function fieldResidentParams(
  fields: readonly FieldOrgan[] = APEX_FIELDS,
  device: DeviceProfile = DEVICE_BROWSER,
): number {
  return fields.reduce((a, f) => a + Math.min(f.w * f.h, device.fieldTexelCap) * f.components, 0);
}

/** FNV-1a hash of a quantised field buffer (the determinism oracle for the GPU stencil). O(n). */
export function fieldHash(grid: Float64Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < grid.length; i++) {
    const q = Math.round((grid[i] ?? 0) * 1e5) | 0;
    h = Math.imul(h ^ (q & 0xffff), 0x01000193) >>> 0;
    h = Math.imul(h ^ ((q >>> 16) & 0xffff), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Seed a field buffer deterministically (a smooth-ish initial condition). O(n). */
export function seedField(grid: Float64Array, seed: number): void {
  const rng = mulberry32(seed >>> 0 || 1);
  for (let i = 0; i < grid.length; i++) grid[i] = rng() * 2 - 1;
}

/**
 * One 5-point heat-diffusion step (Neumann/clamped boundary) from `src` into `dst`. Total heat is
 * non-increasing and values stay bounded for `k ≤ 0.25` (the CFL limit). The GPU reproduces this.
 * O(w·h).
 */
export function heatDiffuseStep(
  src: Float64Array,
  dst: Float64Array,
  w: number,
  h: number,
  k = 0.2,
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = src[y * w + x] ?? 0;
      const l = src[y * w + (x > 0 ? x - 1 : x)] ?? 0;
      const r = src[y * w + (x < w - 1 ? x + 1 : x)] ?? 0;
      const u = src[(y > 0 ? y - 1 : y) * w + x] ?? 0;
      const dn = src[(y < h - 1 ? y + 1 : y) * w + x] ?? 0;
      dst[y * w + x] = c + k * (l + r + u + dn - 4 * c);
    }
  }
}

/**
 * One symplectic leapfrog wave step: `next = 2·u − uPrev + c²·∇²u` (clamped boundary). Energy stays
 * bounded for `c² ≤ 0.5`; the interference of standing waves IS the organ's computation. The GPU
 * reproduces this. O(w·h). Writes the new field into `next`.
 */
export function waveLeapfrogStep(
  u: Float64Array,
  uPrev: Float64Array,
  next: Float64Array,
  w: number,
  h: number,
  c2 = 0.4,
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = u[y * w + x] ?? 0;
      const l = u[y * w + (x > 0 ? x - 1 : x)] ?? 0;
      const r = u[y * w + (x < w - 1 ? x + 1 : x)] ?? 0;
      const up = u[(y > 0 ? y - 1 : y) * w + x] ?? 0;
      const dn = u[(y < h - 1 ? y + 1 : y) * w + x] ?? 0;
      const lap = l + r + up + dn - 4 * c;
      next[y * w + x] = 2 * c - (uPrev[y * w + x] ?? 0) + c2 * lap;
    }
  }
}

/**
 * A small owned field-organ grid: two ping-pong buffers, a deterministic step, and a hash. This is the
 * CPU reference the GPU texture path must reproduce. Construct once; {@link step} each beat.
 */
export class ApexFieldGrid {
  readonly organ: FieldOrgan;
  private a: Float64Array;
  private b: Float64Array;
  private prev: Float64Array;
  private front = true;

  constructor(organ: FieldOrgan, seed: number, live = { w: 0, h: 0 }) {
    // Live CPU reference runs at a tractable resolution; the GPU runs the full organ texture size.
    const w = live.w > 0 ? live.w : Math.min(64, organ.w);
    const h = live.h > 0 ? live.h : Math.min(64, organ.h);
    this.organ = { ...organ, w, h };
    this.a = new Float64Array(w * h);
    this.b = new Float64Array(w * h);
    this.prev = new Float64Array(w * h);
    seedField(this.a, seed);
  }

  /** Advance one deterministic step (wave or diffusion). O(w·h). */
  step(): void {
    const { w, h, kind } = this.organ;
    const cur = this.front ? this.a : this.b;
    const nxt = this.front ? this.b : this.a;
    if (kind === 'wave') {
      waveLeapfrogStep(cur, this.prev, nxt, w, h);
      this.prev.set(cur);
    } else {
      heatDiffuseStep(cur, nxt, w, h);
    }
    this.front = !this.front;
  }

  /** The current field buffer (read-only view for hashing / telemetry). */
  field(): Float64Array {
    return this.front ? this.a : this.b;
  }

  /** Deterministic hash of the current field. O(w·h). */
  hash(): number {
    return fieldHash(this.field());
  }

  /** Σ of the field (heat total / net displacement) — bounded invariant for tests. O(w·h). */
  total(): number {
    const f = this.field();
    let s = 0;
    for (let i = 0; i < f.length; i++) s += f[i] ?? 0;
    return s;
  }

  /**
   * Deposit `amount` into the field at its centre — the source term that closes the sensorimotor loop
   * (the creature's drive excites the organ; the resulting interference/heat is what it then senses).
   * Bounded input; O(1).
   */
  excite(amount: number): void {
    const { w, h } = this.organ;
    const f = this.field();
    const cx = w >> 1;
    const cy = h >> 1;
    f[cy * w + cx] = (f[cy * w + cx] ?? 0) + amount;
  }

  /** Spatial variance of the field about its mean — the interference/structure strength. O(w·h). */
  variance(): number {
    const f = this.field();
    const n = f.length;
    if (n === 0) return 0;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += f[i] ?? 0;
    mean /= n;
    let v = 0;
    for (let i = 0; i < n; i++) {
      const d = (f[i] ?? 0) - mean;
      v += d * d;
    }
    return v / n;
  }
}

/** GLSL fragment stencil for the diffusion organs (ping-pong DataTexture; reproduces heatDiffuseStep). */
export const APEX_FIELD_HEAT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uField;   // R channel = scalar field
uniform vec2 uTexel;        // 1.0 / resolution
uniform float uK;           // diffusion rate (<= 0.25)
varying vec2 vUv;
void main() {
  float c  = texture2D(uField, vUv).r;
  float l  = texture2D(uField, vUv - vec2(uTexel.x, 0.0)).r;
  float r  = texture2D(uField, vUv + vec2(uTexel.x, 0.0)).r;
  float u  = texture2D(uField, vUv + vec2(0.0, uTexel.y)).r;
  float dn = texture2D(uField, vUv - vec2(0.0, uTexel.y)).r;
  float next = c + uK * (l + r + u + dn - 4.0 * c);
  gl_FragColor = vec4(next, 0.0, 0.0, 1.0);
}
`;

/** GLSL fragment stencil for the wave organs (R = u, G = uPrev; reproduces waveLeapfrogStep). */
export const APEX_FIELD_WAVE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uField;   // R = u(t), G = u(t-1)
uniform vec2 uTexel;
uniform float uC2;          // wave speed² (<= 0.5)
varying vec2 vUv;
void main() {
  vec2 s   = texture2D(uField, vUv).rg;
  float c  = s.r;
  float l  = texture2D(uField, vUv - vec2(uTexel.x, 0.0)).r;
  float r  = texture2D(uField, vUv + vec2(uTexel.x, 0.0)).r;
  float u  = texture2D(uField, vUv + vec2(0.0, uTexel.y)).r;
  float dn = texture2D(uField, vUv - vec2(0.0, uTexel.y)).r;
  float lap = l + r + u + dn - 4.0 * c;
  float next = 2.0 * c - s.g + uC2 * lap;
  gl_FragColor = vec4(next, c, 0.0, 1.0); // new u, old u → next prev
}
`;
