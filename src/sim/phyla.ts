/**
 * Phyla — the taxonomic layer above morphotypes (CONTRACTS V3.2, PANTHEON).
 *
 * A {@link Phylum} is a *template distribution*: a band of the hue wheel, a
 * family of geometry-cache indices, a pool of behaviors, size/speed ranges and
 * a preferred home sector. {@link createPhyla} mints {@link PHYLUM_COUNT} of
 * them deterministically from an injected {@link Rng}; lore names come from the
 * caller (world wires {@link LoreEngine.name}), keeping this module a pure,
 * three.js-free leaf for `bun test`.
 *
 * {@link createMorphotypes} (re-exported and extended here) gains an OPTIONAL
 * third argument: when phyla are supplied it generates `25 × phyla.length`
 * morphotypes, each stamped with its phylum's traits (hue inside the band,
 * geometry from the family, behavior from the pool) plus ~1% seeded OUTLIER
 * morphotypes that ignore the bands entirely. With NO third argument the output
 * is bit-identical to the legacy 100-morphotype population (see
 * `tests/phyla.test.ts` backward-compat snapshot).
 *
 * Determinism: every draw flows through the injected `Rng` in a documented,
 * fixed order so a seed reproduces the whole taxonomy byte-for-byte.
 */
import * as THREE from 'three';
import type { Rng } from '../math/rng';
import type { Behavior } from './constants';
import type { MorphType } from '../types';
import { BEHAVIORS, MORPH_COUNT } from './constants';

/** Number of creature phyla minted at boot (CONTRACTS V3.2). */
export const PHYLUM_COUNT = 10;

/** Morphotypes generated per phylum when `createMorphotypes` runs in phylum mode. */
export const MORPHS_PER_PHYLUM = 25;

/**
 * Approximate fraction of phylum-mode morphotypes that are wildcard OUTLIERS —
 * seeded, band-ignoring, two-behavior excursions. ~1% per the V3.2 mandate.
 */
export const OUTLIER_RATE = 0.01;

/** Number of geometry-cache slots a phylum's geometry family samples from. */
const GEOMETRY_FAMILY_SIZE = 4;

/** Number of distinct behaviors pooled per phylum. */
const BEHAVIOR_POOL_SIZE = 3;

/** Multiplier ceiling for outlier parameter excursions (spd/wf/wa), per V3.2. */
const OUTLIER_EXCURSION_MAX = 3;

/**
 * A creature phylum: a template distribution shared by ~25 morphotypes.
 *
 * - `geometryFamily` — indices into the 40-entry geometry cache; member
 *   morphotypes pick `gi` from here (NOT `i % geoCount`).
 * - `hueBand` — `[lo, hi]` on the 0..1 hue wheel; member base hues land inside.
 *   `lo ≤ hi` always (no wrap), so `lerp(lo, hi, t)` stays in-band.
 * - `behaviorPool` — the behaviors member morphotypes draw from.
 * - `sizeMul` / `speedMul` — `[lo, hi]` multipliers applied to the legacy
 *   scale-range and speed draws.
 * - `homeSector` — preferred sector index (0..PHYLUM_COUNT-1) for spawn bias.
 */
export interface Phylum {
  /** Lore name (caller-supplied via `loreName(i)`). */
  readonly name: string;
  /** Geometry-cache indices this phylum's morphotypes may use. */
  readonly geometryFamily: readonly number[];
  /** Inclusive `[lo, hi]` hue band on the 0..1 wheel; `lo ≤ hi`. */
  readonly hueBand: readonly [number, number];
  /** Behaviors member morphotypes draw from. */
  readonly behaviorPool: readonly Behavior[];
  /** `[lo, hi]` multiplier on member scale range. */
  readonly sizeMul: readonly [number, number];
  /** `[lo, hi]` multiplier on member speed. */
  readonly speedMul: readonly [number, number];
  /** Preferred sector index for spawn bias. */
  readonly homeSector: number;
}

/**
 * A morphotype carrying its phylum lineage and (for outliers) a blended second
 * behavior. Extends the integrator-owned {@link MorphType} WITHOUT touching
 * `types.ts`: the base shape is unchanged, so a `PhylumMorphType` is assignable
 * anywhere a `MorphType` is expected (the legacy path returns plain
 * `PhylumMorphType`s with `phylum`/`beh2` simply absent).
 *
 * NOTE for the entities writer: `beh2`, when present, is the OUTLIER's second
 * behavior. Blended-behavior integration (running `beh` and `beh2` together) is
 * a LATER entities.ts change — this module only records the pairing; it does NOT
 * edit entities.ts.
 */
export interface PhylumMorphType extends MorphType {
  /** Phylum index 0..PHYLUM_COUNT-1; absent in the legacy (no-phyla) path. */
  phylum?: number;
  /** Second behavior for outliers; entities blends `beh`+`beh2` later. */
  beh2?: Behavior;
}

/** Min/max of a two-element ordered draw (`lo ≤ hi`). O(1). */
function ordered(a: number, b: number): readonly [number, number] {
  return a <= b ? [a, b] : [b, a];
}

/**
 * Mint {@link PHYLUM_COUNT} phyla deterministically from `rng`.
 *
 * Names are sourced from `loreName(i)` (world supplies
 * `(i) => lore.name('tribe', i)`), keeping lore derivation in the cosmos
 * writer's hands and this module three.js-/DOM-free.
 *
 * Draw order per phylum (fixed for determinism): hue-band centre, hue-band
 * half-width, GEOMETRY_FAMILY_SIZE geometry indices, BEHAVIOR_POOL_SIZE
 * behaviors, two sizeMul endpoints, two speedMul endpoints. `geoCount` bounds
 * the geometry indices; `homeSector` is just the phylum index (stable, distinct
 * per phylum). O(PHYLUM_COUNT), boot-time only.
 *
 * @param rng deterministic generator (Known Bug 9 — never `Math.random`).
 * @param loreName maps a phylum index to its lore name.
 * @param geoCount geometry-cache length (default 40); indices stay `< geoCount`.
 */
export function createPhyla(rng: Rng, loreName: (i: number) => string, geoCount = 40): Phylum[] {
  const out: Phylum[] = [];
  for (let i = 0; i < PHYLUM_COUNT; i++) {
    // Hue band: a centre and half-width carve an in-[0,1] sub-arc (no wrap).
    const centre = rng();
    const halfWidth = 0.03 + rng() * 0.09; // 0.03..0.12 → bands 0.06..0.24 wide
    const lo = Math.max(0, centre - halfWidth);
    const hi = Math.min(1, centre + halfWidth);

    const geometryFamily: number[] = [];
    for (let g = 0; g < GEOMETRY_FAMILY_SIZE; g++) {
      // Invariant: rng() ∈ [0,1) ⇒ index ∈ [0, geoCount).
      geometryFamily.push(Math.floor(rng() * geoCount));
    }

    const behaviorPool: Behavior[] = [];
    for (let b = 0; b < BEHAVIOR_POOL_SIZE; b++) {
      const bi = Math.floor(rng() * BEHAVIORS.length);
      // Invariant: bi ∈ [0, BEHAVIORS.length) — floor of a [0,1)·len product.
      behaviorPool.push(BEHAVIORS[bi]!);
    }

    // sizeMul spans roughly 0.6..1.7, speedMul roughly 0.5..1.8.
    const sizeMul = ordered(0.6 + rng() * 0.6, 0.8 + rng() * 0.9);
    const speedMul = ordered(0.5 + rng() * 0.6, 0.9 + rng() * 0.9);

    out.push({
      name: loreName(i),
      geometryFamily,
      hueBand: [lo, hi],
      behaviorPool,
      sizeMul,
      speedMul,
      homeSector: i,
    });
  }
  return out;
}

/**
 * Build one LEGACY morphotype (15 draws, exact legacy order/fields). Shared by
 * the no-phyla path so it stays bit-identical to the original population. The
 * returned object has NO `phylum`/`beh2` keys (legacy parity). O(1).
 */
function legacyMorph(rng: Rng, i: number, geoCount: number): PhylumMorphType {
  const h = rng();
  const bi = i % BEHAVIORS.length;
  // Invariant: bi ∈ [0, BEHAVIORS.length) — modulo of a non-negative index.
  const beh = BEHAVIORS[bi]!;
  return {
    id: i,
    gi: i % geoCount,
    col: new THREE.Color().setHSL(h, 0.4 + rng() * 0.6, 0.1 + rng() * 0.55),
    em: new THREE.Color().setHSL(rng(), 0.5 + rng() * 0.5, 0.15 + rng() * 0.4),
    emI: 0.1 + rng() * 0.9,
    met: 0.05 + rng() * 0.9,
    rou: 0.05 + rng() * 0.9,
    op: 0.25 + rng() * 0.75,
    beh,
    srMin: 0.1 + rng() * 0.2,
    srMax: 0.3 + rng() * 1.2,
    spd: 0.15 + rng() * 2.5,
    wf: 0.3 + rng() * 5,
    wa: 0.03 + rng() * 0.35,
  };
}

/** Clamp to a finite value in `[lo, hi]`; NaN/∞ collapse to `lo`. O(1). */
function clampFinite(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return v < lo ? lo : v > hi ? hi : v;
}

/** Linear interpolation `a + (b - a) · t`. O(1). */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Build one PHYLUM-mode morphotype for `phylum`. Draw order (fixed): outlier
 * coin, hue, colS, colL, emH, emS, emL, emI, met, rou, op, srMin-base,
 * srMax-base, spd-base, wf, wa, then geometry pick, behavior pick, and — only
 * when the coin selected an outlier — a SECOND behavior pick plus three excursion
 * multipliers (spd/wf/wa). Non-outlier draws are a strict prefix of the outlier
 * draw sequence, so the outlier branch never desynchronizes the stream for the
 * common case. O(1).
 */
function phylumMorph(
  rng: Rng,
  id: number,
  phylumIndex: number,
  phylum: Phylum,
  geoCount: number,
): PhylumMorphType {
  const isOutlier = rng() < OUTLIER_RATE;

  // Base palette/material draws (mirror legacy field structure & ranges).
  const baseHue = rng();
  const colS = 0.4 + rng() * 0.6;
  const colL = 0.1 + rng() * 0.55;
  const emH = rng();
  const emS = 0.5 + rng() * 0.5;
  const emL = 0.15 + rng() * 0.4;
  const emI = 0.1 + rng() * 0.9;
  const met = 0.05 + rng() * 0.9;
  const rou = 0.05 + rng() * 0.9;
  const op = 0.25 + rng() * 0.75;
  const srMinBase = 0.1 + rng() * 0.2;
  const srMaxBase = 0.3 + rng() * 1.2;
  const spdBase = 0.15 + rng() * 2.5;
  let wf = 0.3 + rng() * 5;
  let wa = 0.03 + rng() * 0.35;

  // Geometry: outliers roam the whole cache; members stay in the family.
  const geoPick = rng();
  let gi: number;
  if (isOutlier) {
    gi = Math.floor(geoPick * geoCount);
  } else {
    const fi = Math.floor(geoPick * phylum.geometryFamily.length);
    // Invariant: fi ∈ [0, family.length) — family is never empty.
    gi = phylum.geometryFamily[fi]!;
  }
  // Defensive: clamp into range regardless of geoCount mismatches.
  if (gi < 0 || gi >= geoCount) gi = id % geoCount;

  // Behavior: outliers ignore the pool (any of the 26); members stay in pool.
  const behPick = rng();
  let beh: Behavior;
  if (isOutlier) {
    const anyIdx = Math.floor(behPick * BEHAVIORS.length);
    // Invariant: anyIdx ∈ [0, BEHAVIORS.length).
    beh = BEHAVIORS[anyIdx]!;
  } else {
    const pi = Math.floor(behPick * phylum.behaviorPool.length);
    // Invariant: pi ∈ [0, pool.length) — pool is never empty.
    beh = phylum.behaviorPool[pi]!;
  }

  // Hue: members land inside the band; outliers land anywhere on the wheel.
  const hue = isOutlier ? baseHue : lerp(phylum.hueBand[0], phylum.hueBand[1], baseHue);

  // Size/speed multipliers: members scaled by phylum range; outliers excurse.
  const sizeT = rng();
  const speedT = rng();
  const sizeMul = lerp(phylum.sizeMul[0], phylum.sizeMul[1], sizeT);
  const speedMul = lerp(phylum.speedMul[0], phylum.speedMul[1], speedT);

  let srMin = srMinBase * sizeMul;
  let srMax = srMaxBase * sizeMul;
  let spd = spdBase * speedMul;

  let beh2: Behavior | undefined;
  if (isOutlier) {
    // Second blended behavior (entities integrates the blend LATER).
    const b2Idx = Math.floor(rng() * BEHAVIORS.length);
    // Invariant: b2Idx ∈ [0, BEHAVIORS.length).
    beh2 = BEHAVIORS[b2Idx]!;
    // Parameter excursions up to OUTLIER_EXCURSION_MAX× the phylum range,
    // clamped to finite, sane bounds (NaN-safety only — the wildness is real).
    const spdEx = 1 + rng() * (OUTLIER_EXCURSION_MAX - 1);
    const wfEx = 1 + rng() * (OUTLIER_EXCURSION_MAX - 1);
    const waEx = 1 + rng() * (OUTLIER_EXCURSION_MAX - 1);
    spd = clampFinite(spd * spdEx, 0.05, spdBase * OUTLIER_EXCURSION_MAX);
    wf = clampFinite(wf * wfEx, 0.05, 5 * OUTLIER_EXCURSION_MAX);
    wa = clampFinite(wa * waEx, 0.01, 0.35 * OUTLIER_EXCURSION_MAX);
  }

  // Final NaN-safety on the size band (outlier excursions never touch size, but
  // a degenerate phylum multiplier must never leak a non-finite scale).
  srMin = clampFinite(srMin, 0.01, 10);
  srMax = clampFinite(srMax, srMin, 20);

  const morph: PhylumMorphType = {
    id,
    gi,
    col: new THREE.Color().setHSL(hue, colS, colL),
    em: new THREE.Color().setHSL(emH, emS, emL),
    emI,
    met,
    rou,
    op,
    beh,
    srMin,
    srMax,
    spd,
    wf,
    wa,
    phylum: phylumIndex,
  };
  if (beh2 !== undefined) morph.beh2 = beh2;
  return morph;
}

/**
 * Generate the morphotype population, deterministic from `rng`.
 *
 * - **No `phyla`** (legacy mode): exactly {@link MORPH_COUNT} (100) morphotypes,
 *   consuming 15 rng draws each in legacy order — BIT-IDENTICAL to the original
 *   `createMorphotypes` (and the snapshot in `tests/phyla.test.ts`). The result
 *   has no `phylum`/`beh2` keys.
 * - **With `phyla`** (phylum mode): `MORPHS_PER_PHYLUM × phyla.length`
 *   morphotypes, each tagged with `phylum`, traits drawn from its phylum band,
 *   plus ~{@link OUTLIER_RATE} wildcard outliers (band-ignoring, two-behavior,
 *   parameter-excursed). Morphotypes are emitted phylum-by-phylum so a phylum's
 *   block is contiguous.
 *
 * `geoCount` is the geometry-cache length; legacy morphotype `i` borrows
 * geometry `i % geoCount`. O(count), boot-time only.
 *
 * @param rng deterministic generator (never `Math.random`).
 * @param geoCount geometry-cache length.
 * @param phyla optional phyla; when present switches to phylum mode.
 */
export function createMorphotypes(rng: Rng, geoCount: number, phyla?: Phylum[]): PhylumMorphType[] {
  const out: PhylumMorphType[] = [];

  if (phyla === undefined || phyla.length === 0) {
    for (let i = 0; i < MORPH_COUNT; i++) {
      out.push(legacyMorph(rng, i, geoCount));
    }
    return out;
  }

  let id = 0;
  for (let p = 0; p < phyla.length; p++) {
    // Invariant: p ∈ [0, phyla.length) — direct loop index.
    const phylum = phyla[p]!;
    for (let m = 0; m < MORPHS_PER_PHYLUM; m++) {
      out.push(phylumMorph(rng, id, p, phylum, geoCount));
      id++;
    }
  }
  return out;
}
