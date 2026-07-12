/**
 * ALIEN FLORA — a living vegetal ecology for the dead arena floor.
 *
 * The ground was barren. This grows 60,000 plants drawn from 50 deterministic SPECIES across
 * nine structural FAMILIES, distributed in biome PATCHES
 * with bare PATHS, open GLADES, and a clear CENTER so the temple/cosmic-crown stay framed — the
 * spacing of a real world, not a uniform lawn. Plants are NOT neural (no brain, no rng draws) —
 * they are a substrate the fauna reads through {@link EntityManager.attachFloraComfort}: creatures
 * find dense cover for rest / camouflage / mating / gathering using this module's {@link comfortAt}
 * spatial readout. They are FOOD: creatures graze biomass to stubs; cells REGENERATE (logistic +
 * neighbor-seeded recovery). Some plants are RARE (iridescent / crystal / mycelial specials).
 *
 * RENDER: each family is ONE `InstancedMesh` (≤9 draw calls for 60k plants) sharing one
 * `ShaderMaterial`. Multi-axis tipMorph (yaw/pitch/roll + counter-mid), mutating skins
 * (field4 + health/stress/contact hue), and LOCAL multi-point ragdoll contact all run on the GPU.
 * Per-frame CPU work is O(biomass-grid cells) + O(4 contacts) and never scales with plant count.
 *
 * CONTACT (USER fix): NEVER one gigantic solid patch. Up to 4 local contact seeds with a tight
 * falloff (~16u). Spatial multi-scale phase desync + density separation peel so neighbors don't
 * lockstep-crossover. Root pin seats; tip thrash is multi-degree (spin/invert/heave/expand).
 *
 * DETERMINISM (ADR 0004): placement + per-instance params from a pure positional hash — ZERO
 * draws from `ctx.rng`. No Date.now, no Math.random.
 *
 * @see src/sim/environment.ts (the ground these are seated on — height function mirrored here)
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { OrganismIntelligenceSignal, SimContext } from '../types';
import { ARENA_MID, HABITAT_XZ_SCALE, PLATFORM_HALF } from './constants';
import { baseTerrainHeightAt } from './terrain-profile';
import { TERRAIN_DEFORMATION_GLSL } from './terrain-deformation';

const TAU = Math.PI * 2;

/** Nine structural families — distinct alien silhouettes (compound SEM / crystal / mycelial). */
const FAMILY_COUNT = 9;
/** 50 deterministic species spread across the families + biomes. */
const SPECIES_COUNT = 50;
/** Smooth biome field resolution: how many edaphic zones the palette/species cluster into. */
const BIOME_COUNT = 7;
/** Exact desktop plant population: 4× the former 15,000 for 4× the land area. */
export const ALIEN_FLORA_TARGET_DESKTOP = 60_000;
/** Phone population also scales 4×, preserving its former density without forcing desktop load. */
export const ALIEN_FLORA_TARGET_MOBILE = 20_800;
/** Plant square half-extent follows the authoritative invisible platform wall. */
export const ALIEN_FLORA_FIELD_HALF = PLATFORM_HALF;
/** Enough deterministic candidates to fill the requested population after paths/glades are carved. */
const PLACEMENT_CANDIDATE_FACTOR = 4;
/** Preserve clearing density over 4× land instead of leaving the expanded outskirts overgrown. */
const GLADE_COUNT = 7 * HABITAT_XZ_SCALE * HABITAT_XZ_SCALE;
/** Keep a clear circle at the centre (temple base + cosmic crown column). */
const CENTER_CLEAR = 78;
/** USER: the ascension temple + its DEATH portal rise at (0, 0, -100) (= -40·ARENA_MID). */
const TEMPLE_Z = -40 * ARENA_MID;
const TEMPLE_CLEAR = 104;
/** Fixed layout seed — flora is the same world every replay (decor, not heritable state). */
const FLORA_SEED = 0x5eedf10a;

// ── USER ecology: plants offer FOOD, get grazed to stubs, and REGROW. All deterministic. ──
/** Biomass eaten per second by a full-pressure graze on one cell. */
const GRAZE_RATE = 0.9;
/** Energy (on the 0..100 creature scale) yielded per unit of biomass eaten. */
const GRAZE_YIELD = 22;
/**
 * Logistic regrowth toward capacity. Tuned so a fully eaten cell recovers to a living
 * stand in ~5s under calm climate (owner: respawn ~5 seconds after graze-down).
 */
const REGROW_RATE = 1.05;
/** Reseed floor so a dead cell leaves stub quickly (enables ~5s respawn from zero). */
const REGROW_SEED = 0.11;
/** Neighbor diffusion assist — dense live neighbors speed recovery of depleted cells. */
const REGROW_NEIGHBOR = 0.14;
/** Overgraze residual decay (1/s) — debt clears so respawn is not blocked for long. */
const PRESSURE_DECAY = 0.42;
const PRESSURE_STAMP = 0.9;
/** Continuous recovery time constant (s); exp form guarantees ~95% restore by ~5s. */
const REGROW_TAU = 5 / 3;
/** Max simultaneous local contact seeds (multi-point; kills the single giant-patch slide). */
export const FLORA_CONTACT_SLOTS = 4;
/** Local contact radius (world units). Tight enough for per-being thrash, not lawn slabs. */
const CONTACT_RADIUS = 14;
/** Squared radius for GPU falloff — must match `smoothstep` edge in the vertex shader. */
const CONTACT_RADIUS2 = CONTACT_RADIUS * CONTACT_RADIUS;
/**
 * Spatial-hash soft plant↔plant collision (O(N·k), NOT N²).
 * Bases are fixed; crowns thrash — hash uses base xz + scale for soft radii.
 */
const COLLIDE_HASH_CELL = 5.5;
/** Soft collision radius multiplier on plant scale (crown envelope). */
const COLLIDE_RADIUS_MUL = 2.35;
/** Max soft separation push (world units) per pair — keeps solve stable. */
const COLLIDE_PUSH_MAX = 2.8;
/** Global soft-solve cadence (s). Scalable O(N·k) ~8Hz cold / faster when beings touch. */
const COLLIDE_PERIOD = 0.12;
/** Thrash-offset amp (world units) for dynamic crown collision proxies. */
const COLLIDE_THRASH_AMP = 1.15;

/** Deterministic positional hash → [0,1). No bitwise, no rng stream. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7 + FLORA_SEED * 0.000113) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth biome zonation 0..BIOME_COUNT-1 — a continuous function of position ⇒ species cluster. */
function biomeAt(x: number, z: number): number {
  const f = Math.sin(x * 0.0042) * Math.cos(z * 0.0051) + Math.sin((x + z) * 0.0031 + 1.7) + 2; // ∈ [0,4]
  const b = Math.floor((f / 4) * BIOME_COUNT);
  return b < 0 ? 0 : b >= BIOME_COUNT ? BIOME_COUNT - 1 : b;
}

/** Edaphic nutrient quality 0..1 — fixed field, independent of live biomass (falsifiable). */
function edaphicQuality(x: number, z: number): number {
  const f =
    0.5 +
    0.25 * Math.sin(x * 0.0042) * Math.cos(z * 0.0051) +
    0.15 * Math.sin((x + z) * 0.0031 + 1.7) +
    0.1 * Math.sin(x * 0.011 - z * 0.009);
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

interface Species {
  readonly family: number;
  readonly biome: number;
  /** Base hue (turns 0..1) — biome-banded so a patch reads as one alien palette. */
  readonly hue: number;
  readonly sat: number;
  readonly light: number;
  /** Overall size multiplier. */
  readonly size: number;
  /** Sway oscillation frequency (rad/s of `t`). */
  readonly swayFreq: number;
  /** Bioluminescent intensity 0..1. */
  readonly glow: number;
  /** 0..1 rarity bias — higher → more special iridescence / crystal reaction. */
  readonly rarityBias: number;
}

/** One structural family's base geometry + the local height of its tallest vertex (for sway up-weighting). */
interface Family {
  readonly geo: THREE.BufferGeometry;
  readonly height: number;
}

/**
 * How deep the instance origin sits below the analytic surface.
 * Must clear the ground-triangle chord (habitat seal: origin ≤ rendered mesh) so roots never float.
 * Collar is local y=0; root bulbs are negative-Y.
 *
 * Living attach (GPU) — RIGID crest ride (one Y lift for the whole plant):
 * Neighborhood CREST max under the footprint, applied as a single translation after
 * instanceMatrix. Per-vertex height deltas were tried and REJECTED — they sheared meshes
 * into stretch/thin horizontal ribbons. Land coupling must never non-uniformly scale stems.
 */
export const FLORA_ROOT_SINK = 0.5;
const ROOT_SINK = FLORA_ROOT_SINK;
/** GPU rigid lift after crest sample — collar rides the wave top. */
const SURFACE_RIDE = 0.3;
/** Footprint guard radius (world units) for neighborhood crest max. */
const CREST_GUARD = 3.5;

/** Dispose extras after merge, keep the final geometry. */
function adoptMerged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(nonIndexed);
  const out = (merged ?? nonIndexed[0]!) as THREE.BufferGeometry;
  for (const g of new Set([...parts, ...nonIndexed])) {
    if (g !== out) g.dispose();
  }
  return out;
}

/** Lathe a 2D profile (radius,y) into a curved solid of revolution — organic, not faceted boxes. */
function lathe(profile: ReadonlyArray<readonly [number, number]>, segs = 14): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
  return new THREE.LatheGeometry(pts, segs);
}

/** Subsurface root bulb (y < 0) so the plant reads as planted, not hovering. */
function rootBulb(r = 0.38, depth = 0.55): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 10, 8);
  g.scale(1.15, 0.75, 1.15);
  g.translate(0, -depth * 0.55, 0);
  return g;
}

/** Positive-Y peak of a geometry (for sway up-weighting; ignores subterranean roots). */
function peakHeight(geo: THREE.BufferGeometry): number {
  geo.computeBoundingBox();
  const maxY = geo.boundingBox?.max.y ?? 1;
  return Math.max(0.5, maxY);
}

const flora_vert = /* glsl */ `
  attribute vec4 aParams;   // x: phase, y: swayFreq, z: glow, w: localHeight (stem peak)
  attribute vec4 aMeta;     // x: rarity, y: stiffness, z: secondaryHue, w: reactGain
  attribute vec3 aColor;
  attribute vec2 aPush;     // CPU spatial-hash soft collision push (world XZ) — real plant↔plant
  uniform float uTime;
  uniform float uWind;
  uniform float uChaos;
  uniform float uTerrainEntropy;
  uniform vec2 uTerrainWind;
  // MULTI-POINT local contact (4 seeds). Old single-point used ~72u falloff → giant solid patches.
  uniform vec4 uContactX;
  uniform vec4 uContactZ;
  uniform vec4 uContactS;
  uniform sampler2D uBiomass;
  uniform float uGridExtent;
  uniform vec2 uScorchCenter;
  uniform float uScorchRadius;
  varying vec3 vColor;
  varying float vGlow;
  varying float vUp;
  varying float vRarity;
  varying float vSecHue;
  varying float vContactLive;
  varying float vRoot;
  varying float vBiomass;
  varying float vStress;
  varying float vDensity;
  varying float vDebt;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying vec3 vWorldP;
  ${TERRAIN_DEFORMATION_GLSL}

  // Per-plant local contact impulse. Falloff is sharp so only nearby beings thrash a plant
  // (individual physics, not decorative cluster sway).
  float localContact(vec2 base, float cx, float cz, float strength, float phase, float stiff, float react) {
    if (strength < 0.001) return 0.0;
    vec2 d = base - vec2(cx, cz);
    float d2 = dot(d, d);
    // Sharper kernel: full at ~0–5u, dead by CONTACT_RADIUS (was soft 25→256 slab feel).
    float fall = smoothstep(${CONTACT_RADIUS2.toFixed(1)}, 16.0, d2);
    if (fall <= 0.0) return 0.0;
    float personal = 0.5 + 0.5 * sin(phase * 3.4 + stiff * 5.9 + base.x * 0.41 + base.y * 0.37);
    float wobble = 0.65 + 0.45 * sin(uTime * (3.4 + stiff * 4.6) + phase * 2.5);
    float counter = 0.8 + 0.3 * cos(phase * 1.9 - stiff * 2.4 + uTime * 0.5);
    // Soft plants (low stiff) + high react = harder thrash when touched.
    return strength * fall * personal * react * wobble * counter * (0.85 + 0.35 / max(stiff, 0.15));
  }

  // UPRIGHT multi-axis morph — HARD LAW (do not break again):
  // • Y-spin + lateral thrash + heave only. NEVER pitch/roll (faceplant).
  // • NEVER per-vertex land Y deltas (stretch/thin shear).
  // Bizarro but falsifiable: Berry dual counter-spin, chiral thrash, quasiperiodic
  // radial warp (golden-angle lobes) — upright only, never ribbon-shear / faceplant.
  vec3 tipMorph(vec3 p, float up, float rootPin, float yaw, float leanX, float leanZ, float twist2, float band) {
    float u2 = up * up * rootPin;
    float mid = rootPin * up * (1.0 - up);
    // Dual counter-spins + geometric twist around vertical only (local Y preserved).
    float ang = yaw * u2 - yaw * 0.82 * mid + twist2 * u2 * 0.6 - twist2 * mid * 0.7
              + band * mid * 0.4 - band * u2 * 0.22;
    float ca = cos(ang);
    float sa = sin(ang);
    vec3 q = vec3(ca * p.x + sa * p.z, p.y, -sa * p.x + ca * p.z);
    // Vectorized thrash: tip / mid counter + helix residual (lateral only).
    q.x += leanX * u2 + leanZ * mid * 0.72 + leanX * mid * 0.25 - leanZ * u2 * 0.14;
    q.z += leanZ * u2 - leanX * mid * 0.72 + leanZ * mid * 0.25 + leanX * u2 * 0.14;
    // Quasiperiodic isotropic warp (φ-ratio lobes) — same X/Z scale, never thin poles.
    float phi = 2.3999632; // golden angle
    float az = atan(q.z, q.x);
    float warp = 1.0
      + u2 * 0.07 * sin(az * 3.0 + yaw * 1.9 + q.y * 1.3 + twist2)
      + mid * 0.08 * sin(az * phi + twist2 * 2.0 + band)
      + mid * band * 0.11 - u2 * band * 0.07;
    q.x *= warp;
    q.z *= warp;
    return q;
  }

  void main() {
    vColor = aColor;
    vGlow = aParams.z;
    vRarity = aMeta.x;
    vSecHue = aMeta.z;
    float up = clamp(position.y / max(aParams.w, 0.001), 0.0, 1.0);
    vUp = up;
    // rootPin: seating only — collar never leaves soil (f8c6eadb).
    float rootPin = smoothstep(0.0, 0.22, up);
    vRoot = 1.0 - rootPin;

    vec2 bmBase = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
    // Multi-scale spatial desync — neighbors never share swing period/phase (crossover ↓).
    float spatial = bmBase.x * 0.19 + bmBase.y * 0.24
                  + sin(bmBase.x * 0.11 - bmBase.y * 0.13) * 2.4
                  + cos(bmBase.x * 0.053 + bmBase.y * 0.067) * 1.6
                  + sin((bmBase.x - bmBase.y) * 0.037) * 1.3
                  + cos(bmBase.x * 0.021 - bmBase.y * 0.029) * 1.05
                  + sin(bmBase.x * 0.31 + bmBase.y * 0.27) * 0.55;
    float phase = aParams.x + spatial;
    float idHash = fract(sin(bmBase.x * 12.9 + bmBase.y * 78.2) * 43758.5);
    float idHash2 = fract(sin(bmBase.y * 91.7 - bmBase.x * 43.1) * 24634.7);
    // Per-plant freq skew + incommensurate ratio so thrash arcs desync hard.
    float freq = aParams.y * (0.65 + 0.7 * idHash) * (0.9 + 0.2 * idHash2);
    float stiff = clamp(aMeta.y, 0.08, 1.4);
    float react = clamp(aMeta.w, 0.2, 2.2);
    float rarity = aMeta.x;
    // Axis energy split: spin-dominant vs lean-dominant (still upright, still capped).
    float axisBias = fract(sin(phase * 19.7 + idHash * 91.3) * 23421.1);
    float yawBias = 0.75 + 0.95 * axisBias;
    float leanBias = 0.7 + 0.75 * fract(axisBias * 5.3);
    float twistBias = 0.6 + 0.9 * fract(axisBias * 11.3);

    // R=biomass food, G=density, B=overgraze pressure (operational; not paint).
    vec4 field = texture2D(uBiomass, (bmBase + 0.5 * uGridExtent) / uGridExtent);
    float biomass = field.r;
    float density = field.g;
    float overgraze = field.b;
    vBiomass = biomass;
    vDensity = density;
    float health = clamp(biomass, 0.0, 1.0);
    float hunger = 1.0 - health;
    float debt = clamp(overgraze, 0.0, 1.0); // overgraze debt → degrade morph + skin
    vDebt = debt;

    float soft = 1.0 / stiff;
    // Environment-driven thrash (wind + chaos) — tip-weighted LATERAL only (upright, alive).
    float env = uWind + uChaos * 1.1 + 0.18 + react * 0.08;
    float bend = rootPin * rootPin * env * soft * (1.1 + rarity * 0.75) * (0.85 + 0.15 * health);
    float turb = rootPin * rootPin * (uChaos * 0.95 + debt * 0.2) * soft;
    vec3 p = position;

    // ── Living-ground crest — ONE rigid Y for whole plant (no per-vertex shear). ──
    float gEps = 1.35;
    float gR = ${CREST_GUARD.toFixed(2)};
    float gC = cqmTerrainDisplacement(vec3(bmBase.x, 0.0, bmBase.y), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gE = cqmTerrainDisplacement(vec3(bmBase.x + gEps, 0.0, bmBase.y), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gW = cqmTerrainDisplacement(vec3(bmBase.x - gEps, 0.0, bmBase.y), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gN = cqmTerrainDisplacement(vec3(bmBase.x, 0.0, bmBase.y + gEps), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gS = cqmTerrainDisplacement(vec3(bmBase.x, 0.0, bmBase.y - gEps), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gE2 = cqmTerrainDisplacement(vec3(bmBase.x + gR, 0.0, bmBase.y), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gW2 = cqmTerrainDisplacement(vec3(bmBase.x - gR, 0.0, bmBase.y), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gN2 = cqmTerrainDisplacement(vec3(bmBase.x, 0.0, bmBase.y + gR), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gS2 = cqmTerrainDisplacement(vec3(bmBase.x, 0.0, bmBase.y - gR), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gNE = cqmTerrainDisplacement(vec3(bmBase.x + gR * 0.71, 0.0, bmBase.y + gR * 0.71), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gNW = cqmTerrainDisplacement(vec3(bmBase.x - gR * 0.71, 0.0, bmBase.y + gR * 0.71), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gSE = cqmTerrainDisplacement(vec3(bmBase.x + gR * 0.71, 0.0, bmBase.y - gR * 0.71), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float gSW = cqmTerrainDisplacement(vec3(bmBase.x - gR * 0.71, 0.0, bmBase.y - gR * 0.71), uTime, uChaos, uTerrainEntropy, uTerrainWind);
    float liftMax = gC;
    liftMax = max(liftMax, max(gE, max(gW, max(gN, gS))));
    liftMax = max(liftMax, max(gE2, max(gW2, max(gN2, gS2))));
    liftMax = max(liftMax, max(gNE, max(gNW, max(gSE, gSW))));
    float gLen = length(vec2((gE - gW) / (2.0 * gEps), (gN - gS) / (2.0 * gEps)));
    float crestHeave = max(0.0, liftMax - gC);
    // Rigid ride: same on every vertex — crest max + mild slope safety (no shear).
    float rigidRide = liftMax + min(gLen, 0.4) * (1.6 + uChaos * 0.8) + crestHeave * 0.35;

    // Density gradient for chiral anti-correlation (neighbors desync) — computed early for spin.
    float eps = 6.0;
    float dE = texture2D(uBiomass, (bmBase + vec2(eps, 0.0) + 0.5 * uGridExtent) / uGridExtent).g;
    float dW = texture2D(uBiomass, (bmBase + vec2(-eps, 0.0) + 0.5 * uGridExtent) / uGridExtent).g;
    float dN = texture2D(uBiomass, (bmBase + vec2(0.0, eps) + 0.5 * uGridExtent) / uGridExtent).g;
    float dS = texture2D(uBiomass, (bmBase + vec2(0.0, -eps) + 0.5 * uGridExtent) / uGridExtent).g;
    vec2 avoid = vec2(dW - dE, dS - dN);
    float al = length(avoid);
    if (al > 1e-5) avoid /= al;
    // Chiral sign: spin against denser neighbors (falsifiable anti-lockstep with grove).
    float chirality = sign(avoid.x + avoid.y * 1.3 + (idHash - 0.5) * 0.2 + 0.001);

    // Berry-ish geometric phase: accumulates from climate loop in (wind, chaos) parameter space.
    // Plants that experience more env change twist more — not free decoration.
    float berry = (uWind * 0.7 + uChaos * 1.1) * soft
                * sin(uTime * 0.31 + phase * 0.5) * cos(uTime * 0.19 - phase * 0.3 + idHash2 * 4.0);
    // Josephson-like phase slip when stress energy exceeds threshold (sudden twist invert seed).
    float slipDrive = uChaos * 0.5 + debt * 0.4 + react * 0.15;
    float josephson = floor(uTime * (0.35 + slipDrive) + phase + idHash * 3.0);
    float phaseSlip = sin(josephson * 2.399 + idHash2 * 6.28) * (0.4 + slipDrive);

    // Y-spin + secondary counter-twist (height-preserving; no pitch/roll faceplant).
    float yaw = (uTime * (1.05 + freq * 1.15 + rarity * 0.75 + uChaos * 0.55) * soft * chirality
              + (1.25 + rarity) * sin(uTime * freq * 0.44 + phase)
              + sin(uTime * freq * 2.0 + phase * 2.4) * 0.65 * turb
              + cos(uTime * freq * 0.27 - phase * 1.1) * 0.4 * react * soft
              + berry * 1.2 + phaseSlip * 0.9)
              * yawBias;
    float twist2 = (uTime * (0.6 + freq * 0.45) * soft * twistBias * (-chirality)
                 + sin(uTime * freq * 2.8 + phase * 3.1 + idHash2 * 6.28) * (0.85 + turb)
                 + cos(uTime * freq * 0.9 - phase) * debt * 0.7
                 + berry * 0.8 + phaseSlip * 0.55)
                 * (0.75 + rarity * 0.55);
    float pulse = 0.5 + 0.5 * sin(uTime * (1.45 + freq * 0.42) + phase + rarity + debt * 2.0);
    float pulse2 = 0.5 + 0.5 * cos(uTime * (0.88 + freq * 0.58) - phase * 1.4);
    // Band: mid expand under health, tip contract under debt (throat morph — operational).
    float band = (health * 0.55 - debt * 0.65 - hunger * 0.25) * (0.65 + 0.35 * pulse);

    // Lateral thrash: multi-harmonic + orthogonal, hard-capped (never horizontal wires).
    float leanAmp = 1.9;
    float leanX = (
      sin(uTime * freq + phase) * bend * 2.35
      + sin(uTime * freq * 3.7 + phase * 2.1) * turb * 1.15
      + sin(uTime * freq * 5.8 + phase * 0.7 + idHash2 * 4.0) * turb * 0.42 * rarity
      + sin(uTime * 0.8 + phase) * uWind * rootPin * rootPin * 0.65
      + cos(uTime * freq * 1.2 - phase * 1.8) * bend * 0.5 * twistBias
      + avoid.x * density * rootPin * 0.35 * chirality
    ) * leanBias;
    float leanZ = (
      cos(uTime * freq * 0.77 + phase * 1.44) * bend * 2.1
      + cos(uTime * freq * 3.1 + phase * 1.7) * turb * 1.05
      + cos(uTime * freq * 5.2 + phase * 1.1 - idHash * 3.0) * turb * 0.38 * rarity
      + cos(uTime * 0.74 + phase * 1.25) * uWind * rootPin * rootPin * 0.6
      + sin(uTime * freq * 1.3 + phase * 2.2) * bend * 0.5 * twistBias
      + avoid.y * density * rootPin * 0.35 * chirality
    ) * leanBias;
    // Kakeya needle (Besicovitch/Kakeya set intuition): fixed-length thrash segment rotates
    // through ALL planar directions over time — geometric insanity that stays upright (length
    // capped, Y never folded). Length is operational: wind + chaos + health, not free decoration.
    float needleLen = clamp(0.55 + bend * 0.85 + turb * 0.4 + rarity * 0.25, 0.2, leanAmp);
    float needleAng = uTime * (0.85 + freq * 0.55 + react * 0.2) + phase + berry + phaseSlip * 0.5;
    // Dual needle (Besicovitch multi-direction cover) — second arm phase-locked π/2 out.
    float n2 = needleAng + 1.5707963 + idHash2 * 0.7;
    leanX = leanX * 0.5 + cos(needleAng) * needleLen * 0.55 + cos(n2) * needleLen * 0.28 * chirality;
    leanZ = leanZ * 0.5 + sin(needleAng) * needleLen * 0.55 + sin(n2) * needleLen * 0.28 * chirality;
    leanX = clamp(leanX, -leanAmp, leanAmp);
    leanZ = clamp(leanZ, -leanAmp, leanAmp);
    p = tipMorph(p, up, rootPin, yaw, leanX, leanZ, twist2, band);

    // Vertical life (heave) + expand/contract/degrade — operational food+debt readout.
    // FPU-like multi-mode energy bounce between heave harmonics (incommensurate freqs).
    float heave = sin(uTime * freq * 0.55 + phase) * rootPin * 0.26 * (uWind + uChaos + 0.55)
                + sin(uTime * freq * 4.4 + phase * 1.2) * rootPin * 0.1 * uChaos
                + cos(uTime * freq * 1.35 + phase * 1.5) * rootPin * 0.08 * (0.45 + health)
                + sin(uTime * freq * 7.1 + phase * 0.6 + idHash2) * rootPin * 0.04 * turb
                + 0.05 * rootPin * health
                + crestHeave * 0.08 * rootPin
                - debt * rootPin * 0.045 * up; // overgraze sags slightly (degrade), never faceplant
    // Expand healthy / contract hunger+overgraze (falsifiable ecology state on silhouette).
    float expand = rootPin * (0.06 + 0.13 * health) * pulse
                 - rootPin * hunger * 0.075
                 - rootPin * debt * 0.06
                 + rootPin * rarity * 0.035 * pulse2
                 + rootPin * band * 0.04;
    p.y += heave * up;
    float morph = rootPin * (0.045 + 0.11 * rarity) * (0.5 + 0.5 * sin(uTime * (1.25 + freq * 0.45) + phase));
    // Isotropic radial breath only — never XZ-only thin-out.
    float radScale = 1.0 + expand * 0.74 + morph * 0.82;
    p.x *= radScale;
    p.z *= radScale;
    p.y *= 1.0 + morph * 0.45 * rootPin * health + expand * 0.24 * up - debt * 0.045 * rootPin * up;

    float grow = 0.12 + 0.88 * biomass;
    if (uScorchRadius > 0.0) {
      float scorchD = length(bmBase - uScorchCenter);
      grow *= smoothstep(uScorchRadius * 0.82, uScorchRadius, scorchD);
    }
    float gRoot = mix(0.92 + 0.08 * grow, grow, rootPin);
    p.x *= gRoot;
    p.z *= gRoot;
    p.y = position.y < 0.0 ? p.y * (0.9 + 0.1 * grow) : p.y * mix(1.0, grow, rootPin);
    vGlow *= 0.28 + 0.72 * biomass * (1.0 - debt * 0.25);

    // ── PLANT↔PLANT SOFT COLLISION (always on — not decorative cluster sway) ──
    // Density G-channel = local packing. High density = soft-body pressure from neighbors.
    // Each plant flees the density gradient + a deterministic self-orbit so co-cell plants
    // don't stack (bleed). Crowding compresses crowns (collision squash).
    float crowd = density * density; // nonlinear: only dense packs really collide
    float tipW = rootPin * up * up;
    // Strong separation along open-space gradient.
    float sep = density * tipW * (1.85 + 0.55 * rarity + 0.4 * uChaos + react * 0.2);
    p.x += avoid.x * sep;
    p.z += avoid.y * sep;
    // Orthogonal peel so neighbors don't share the same thrash plane.
    float peel = sep * (0.55 + 0.35 * idHash);
    p.x += -avoid.y * peel * sin(phase * 2.6 + idHash * 6.28);
    p.z += avoid.x * peel * cos(phase * 2.1 + idHash2 * 4.1);
    // Deterministic self-flee: two plants in the same density cell push opposite hash orbits.
    vec2 selfFlee = vec2(
      cos(idHash * 6.2831853 + phase * 0.7),
      sin(idHash2 * 6.2831853 - phase * 0.55)
    );
    p.x += selfFlee.x * crowd * tipW * (1.55 + rarity * 0.4);
    p.z += selfFlee.y * crowd * tipW * (1.55 + rarity * 0.4);
    // Soft-body compress when packed (collision deformation — isotropic, not thin shear).
    float packSquash = crowd * rootPin * (0.08 + 0.06 * up);
    p.x *= 1.0 - packSquash;
    p.z *= 1.0 - packSquash;
    // Brace heave: packed crowns lift slightly so they don't occupy the same height band.
    p.y += crowd * tipW * 0.18 * (0.5 + 0.5 * sin(phase + uTime * 1.1));

    vec4 worldPosition = instanceMatrix * vec4(p, 1.0);
    // RIGID land attach — identical Y on every vertex (no stretch/thin shear).
    worldPosition.y += rigidRide + ${SURFACE_RIDE.toFixed(3)};
    // CPU spatial-hash soft plant↔plant push (O(N·k) pairs) — real packing, not decorative peel.
    // Tip weights more so crowns separate; roots stay seated.
    float pushW = rootPin * (0.4 + 0.6 * rootPin * up);
    worldPosition.x += aPush.x * pushW;
    worldPosition.z += aPush.y * pushW;

    // ── BEING CONTACT PHYSICS (per-plant, local seeds — not hollow decorative) ──
    float c0 = localContact(bmBase, uContactX.x, uContactZ.x, uContactS.x, phase + idHash * 2.0, stiff, react);
    float c1 = localContact(bmBase, uContactX.y, uContactZ.y, uContactS.y, phase + 2.3 + idHash2 * 3.1, stiff, react);
    float c2 = localContact(bmBase, uContactX.z, uContactZ.z, uContactS.z, phase + 4.1 + idHash * 1.7, stiff, react);
    float c3 = localContact(bmBase, uContactX.w, uContactZ.w, uContactS.w, phase + 5.9 + idHash2 * 2.4, stiff, react);
    float cSum = c0 + c1 + c2 + c3;
    // Neighbor "virtual contact": high crowd is continuous plant↔plant collision pressure.
    float plantHit = crowd * (0.55 + 0.45 * sin(uTime * 2.2 + phase));
    float hit = cSum + plantHit * 0.85;
    vContactLive = clamp(hit, 0.0, 2.8);
    vStress = clamp(uChaos * 0.4 + hit * 0.6 + hunger * 0.3 + debt * 0.5, 0.0, 1.6);

    vec2 push = vec2(0.0);
    float wsum = 0.001;
    if (c0 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.x, uContactZ.x);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c0; wsum += c0;
    }
    if (c1 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.y, uContactZ.y);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c1; wsum += c1;
    }
    if (c2 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.z, uContactZ.z);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c2; wsum += c2;
    }
    if (c3 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.w, uContactZ.w);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c3; wsum += c3;
    }
    // Plant-plant push always contributes (soft collision field).
    push += avoid * plantHit * 1.2 + selfFlee * plantHit * 0.8;
    wsum += plantHit + 0.001;
    push /= wsum;
    push = normalize(
      push
      + vec2(sin(phase * 2.1 + idHash * 6.28), cos(phase * 1.7 - idHash2 * 4.2)) * 0.2
      + vec2(0.0001)
    );

    float tip = rootPin * rootPin * rootPin;
    float mid = rootPin * rootPin * (1.0 - up) * 4.0;
    // Hot contact amp — individual plant reacts hard when hit (not gentle decorative sway).
    float amp = (4.0 + uChaos * 3.6 + rarity * 2.2 + react * 1.25) * soft;
    worldPosition.xz += push * (hit * tip * amp + biomass * hit * mid * 0.5);
    vec2 ortho = vec2(-push.y, push.x);
    // Multi-harmonic whip; mid vs tip counter-phase (per-plant, not cluster).
    worldPosition.xz += ortho * sin(uTime * (6.0 + stiff * 3.6) + phase) * hit * mid * amp * 0.75;
    worldPosition.xz += push * cos(uTime * (3.9 + stiff * 2.4) - phase * 1.9) * hit * tip * amp * 0.45;
    worldPosition.xz += ortho * cos(uTime * (7.5 + react) + phase * 2.3) * hit * tip * amp * 0.28;
    // Collision squash under hit (soft-body compression — isotropic XZ).
    float hitSquash = clamp(hit * tip * 0.14 * soft, 0.0, 0.22);
    worldPosition.xz = bmBase + (worldPosition.xz - bmBase) * (1.0 - hitSquash);
    // Contact turbo-spin around Y only (invert = reverse spin + UP, NOT faceplant).
    float zeno = 1.0 / (1.0 + cSum * 0.28);
    float cTwist = hit * tip * (2.7 + react) * (0.5 + 0.5 * sin(uTime * 4.8 + phase + idHash * 3.0)) * zeno;
    float invert = smoothstep(0.25, 1.0, hit + uChaos * 0.5 + phaseSlip * 0.15) * tip * (0.6 + rarity * 0.35);
    cTwist *= (1.0 - 2.0 * invert) * chirality;
    float cca = cos(cTwist);
    float csa = sin(cTwist);
    vec2 rel = worldPosition.xz - bmBase;
    worldPosition.xz = bmBase + vec2(cca * rel.x - csa * rel.y, csa * rel.x + cca * rel.y);
    worldPosition.xz += ortho * invert * sin(uTime * 7.0 + phase) * 1.2;
    // Contact flee UP + lateral — never into dirt.
    worldPosition.y += hit * tip * (1.9 + uChaos * 1.85 + rarity * 1.25 + react * 0.4) * (0.85 + 0.15 * zeno);
    worldPosition.y += sin(hit * 9.0 + uTime * 3.0 + phase) * hit * tip * 1.2;
    worldPosition.y += invert * tip * 0.85;
    worldPosition.y += cos(uTime * 4.2 + phase * 1.6) * hit * tip * 0.5;
    worldPosition.y += sin(uTime * 6.5 - phase * 2.0 + josephson) * invert * tip * 0.45;
    worldPosition.xz += push * invert * 1.55;
    // Extra plant-plant bounce when packed and thrashing into density.
    worldPosition.xz += avoid * crowd * tip * (0.9 + hit * 0.6) * soft;

    vWorldP = worldPosition.xyz;
    vec4 mvPosition = modelViewMatrix * worldPosition;
    vNormalV = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const flora_frag = /* glsl */ `
  uniform float uTime;
  uniform float uChaos;
  varying vec3 vColor;
  varying float vGlow;
  varying float vUp;
  varying float vRarity;
  varying float vSecHue;
  varying float vContactLive;
  varying float vRoot;
  varying float vBiomass;
  varying float vStress;
  varying float vDensity;
  varying float vDebt;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying vec3 vWorldP;

  vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float hp = mod(h, 1.0) * 6.0;
    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
    vec3 rgb;
    if (hp < 1.0) rgb = vec3(c, x, 0.0);
    else if (hp < 2.0) rgb = vec3(x, c, 0.0);
    else if (hp < 3.0) rgb = vec3(0.0, c, x);
    else if (hp < 4.0) rgb = vec3(0.0, x, c);
    else if (hp < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + (l - 0.5 * c);
  }

  // Biosphere-driven domain warp (not a free loop). Rates from stress/contact/density/debt.
  float field4(vec3 p, float t) {
    float bio = 0.15 + vStress * 0.55 + vContactLive * 0.35 + vDensity * 0.25 + vDebt * 0.2;
    vec3 q = p * (0.09 + bio * 0.04);
    q.x += 0.5 * sin(q.y * 1.9 + t * (0.28 + bio * 0.2) + vStress * 0.5);
    q.y += 0.5 * cos(q.z * 1.7 - t * (0.24 + bio * 0.15) - vContactLive * 0.3);
    q.z += 0.45 * sin(q.x * 2.1 + t * 0.21);
    // Quasiperiodic second lattice (incommensurate — never exact period loop).
    q.x += 0.28 * cos(q.z * 2.618 + t * 0.17 * 1.414 + vStress);
    q.y += 0.22 * sin(length(q.xz) * 2.3 - t * 0.31 * 1.732 + vRarity);
    q.z += 0.18 * cos(q.x * 1.618 - q.y * 2.236 + t * 0.11 + vDensity);
    float a = sin(q.x * 2.3 + t * 0.4) * cos(q.y * 1.9 - t * 0.33);
    float b = sin(q.y * 2.6 + q.z * 1.4 + t * 0.21);
    float c = cos(length(q.xy) * 3.3 - t * 0.29 + q.z);
    float d = sin(length(q.yz) * 2.8 + t * 0.17 + q.x);
    float e = cos(q.x * 1.5 - q.z * 1.7 + t * 0.5 + vContactLive);
    // Weierstrass-ish continuous nowhere-smooth feel (finite modes, still C0).
    float w = 0.0;
    float amp = 0.5;
    float fr = 1.0;
    for (int i = 0; i < 4; i++) {
      w += amp * sin(fr * (q.x + q.y * 1.3) + t * (0.2 + float(i) * 0.07) + vStress * float(i));
      amp *= 0.55;
      fr *= 2.17;
    }
    return a * 0.28 + b * 0.22 + c * 0.14 + d * 0.12 + e * 0.1 + w * 0.14;
  }

  // Möbius map on the circle (hue) — extreme remapping, still continuous.
  float moebiusHue(float h, float a, float b) {
    // Map hue to complex unit circle, apply (z-a)/(1-conj(a)z) style shift.
    float ang = h * 6.2831853;
    float zx = cos(ang);
    float zy = sin(ang);
    float den = 1.0 - a * zx - b * zy;
    den = max(abs(den), 0.15) * sign(den);
    float nx = (zx - a) / den;
    float ny = (zy - b) / den;
    return fract(atan(ny, nx) / 6.2831853);
  }

  // Hopf-ish dual angle from 3D point (S3 projection lite) for dual-skin channels.
  vec2 hopfAngles(vec3 p, float t) {
    float r = length(p) + 1e-4;
    float u = p.x / r;
    float v = p.y / r;
    float w = p.z / r;
    float a1 = atan(v, u);
    float a2 = atan(w, length(p.xy) + 1e-4) + t * 0.1;
    return vec2(a1, a2);
  }

  void main() {
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(vViewDir);
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 1.7);

    float f = field4(vWorldP, uTime);
    float f2 = field4(vWorldP.yzx * 1.41 + 2.1, uTime * 0.73 + vStress * 1.1);
    float f3 = field4(vWorldP.zxy * 0.87 - 1.4, uTime * 0.47 - vContactLive * 0.9);
    float f4 = field4(vWorldP.xzy * 1.17 + vDensity, uTime * 0.61 + vDebt * 2.0);
    float tex = 0.48 + 0.22 * f + 0.14 * f2 + 0.1 * f3 + 0.08 * f4;

    // Mutating operational skins: food / stress / contact / density / debt (biosphere, not paint).
    float health = clamp(vBiomass, 0.0, 1.0);
    float hunger = 1.0 - health;
    float contactFlash = clamp(vContactLive, 0.0, 1.8);
    float crowd = clamp(vDensity, 0.0, 1.0);
    float debt = clamp(vDebt, 0.0, 1.0);
    float skinPulse = 0.5 + 0.5 * sin(uTime * (1.7 + vRarity * 1.1 + vStress * 0.7 + crowd * 0.4) + vUp * 4.5 + f * 3.5);
    float skinPulse2 = 0.5 + 0.5 * cos(uTime * (1.05 + vStress * 0.9 + contactFlash * 0.5) - vUp * 2.8 + f2 * 2.2);
    float skinPulse3 = 0.5 + 0.5 * sin(uTime * (0.55 + debt * 1.2) + f3 * 4.0 + vRarity * 3.0);

    // Quasiperiodic hue drive: incommensurate clocks (√2, √3, φ) × biosphere rates.
    float bioRate = 0.04 + vRarity * 0.05 + vStress * 0.06 + contactFlash * 0.04 + health * 0.02 + uChaos * 0.03;
    float rawHue = fract(
      vSecHue
      + fres * 0.38 + vUp * 0.16
      + f * 0.14 + f3 * 0.09 + f4 * 0.07
      + uTime * bioRate * 1.0
      + uTime * bioRate * 1.41421356 * 0.55
      + uTime * bioRate * 1.7320508 * 0.35
      + hunger * 0.16 + vStress * 0.22 + contactFlash * 0.18 + debt * 0.12 + crowd * 0.08
      + skinPulse * 0.06 * vRarity + skinPulse2 * 0.045 * vStress + skinPulse3 * 0.04 * debt
    );
    // Möbius warp of hue circle driven by stress/contact (extreme remapping, continuous).
    float viewHue = moebiusHue(rawHue, vStress * 0.45 + contactFlash * 0.2 - 0.15, debt * 0.35 - health * 0.2);

    float sat = clamp(
      0.78 + vRarity * 0.35 - hunger * 0.25 + contactFlash * 0.18 + f2 * 0.12
      + uChaos * 0.1 - vStress * 0.05 + health * 0.08 - debt * 0.12 + crowd * 0.06,
      0.2, 1.0);
    float lit = clamp(
      0.52 + fres * 0.22 - hunger * 0.12 + health * 0.12 - vStress * 0.07
      + f * 0.07 + contactFlash * 0.08 - debt * 0.08 + skinPulse * 0.04,
      0.12, 0.88);

    vec2 hopf = hopfAngles(vWorldP * 0.08 + n * 0.3, uTime + vStress);
    float hopfHue = fract(hopf.x / 6.2831853 + hopf.y / 6.2831853 * 0.5 + viewHue * 0.3);

    vec3 iri = hsl2rgb(viewHue, sat, lit);
    vec3 iri2 = hsl2rgb(fract(viewHue + 0.22 + f * 0.1 + vStress * 0.08), sat * 1.1, lit + 0.08);
    vec3 iri3 = hsl2rgb(fract(viewHue + 0.48 - f2 * 0.06 + contactFlash * 0.05), 0.82 + vRarity * 0.25, 0.46 + fres * 0.24);
    vec3 iri4 = hsl2rgb(hopfHue, sat * 0.95, lit * 0.92 + fres * 0.1);
    // Spectrum morph: biosphere-weighted blend of four skin manifolds.
    float w12 = clamp(0.4 + f * 0.25 + skinPulse2 * 0.15 + health * 0.1, 0.0, 1.0);
    float w3 = clamp(0.18 + contactFlash * 0.22 + vRarity * 0.18 + uChaos * 0.1, 0.0, 0.85);
    float w4 = clamp(0.12 + vStress * 0.15 + debt * 0.12 + crowd * 0.1, 0.0, 0.7);
    vec3 spectrum = mix(mix(iri, iri2, w12), iri3, w3);
    spectrum = mix(spectrum, iri4, w4);

    float key = 0.3 + 0.8 * clamp(dot(n, normalize(vec3(0.3, 0.85, 0.4))), 0.0, 1.0);
    // Skin almost fully spectrum when rare/healthy/contacted — base color only as residual.
    float skinMix = 0.4 + vRarity * 0.5 + fres * 0.28 + vStress * 0.22 + contactFlash * 0.16 + health * 0.1 + uChaos * 0.08;
    vec3 body = mix(vColor * tex, spectrum, clamp(skinMix, 0.0, 0.98)) * key;
    // Degrade / bruise / ash when biomass low or debt (operational food state).
    vec3 bruise = hsl2rgb(fract(viewHue + 0.55 + f * 0.05 + vStress * 0.1), 0.38, 0.22);
    vec3 ash = hsl2rgb(fract(viewHue + 0.08), 0.18, 0.14);
    body = mix(body, bruise, hunger * 0.58 * (1.0 - vRoot));
    body = mix(body, ash, (debt * 0.45 + vStress * hunger * 0.3) * (1.0 - vRoot));
    // Healthy tips chroma; crowded mid mutates toward hopf dual-skin.
    body = mix(body, spectrum * 1.12, health * vUp * 0.16 * (1.0 - vStress * 0.4));
    body = mix(body, iri4 * 1.05, crowd * (1.0 - vUp) * 0.2 * (1.0 - vRoot));

    vec3 rootCol = mix(vColor * 0.28, hsl2rgb(fract(viewHue + 0.1), 0.42, 0.16), 0.55);
    body = mix(body, rootCol, vRoot * 0.92);

    float pulse = 0.5 + 0.5 * sin(uTime * 2.3 + vUp * 6.2 + f * 2.5 + vRarity * 1.9 + vStress + contactFlash);
    float glow = vGlow * (0.22 + 1.0 * vUp) * pulse
               * (0.45 + 1.05 * uChaos + contactFlash * 0.7 + health * 0.32 + vRarity * 0.15)
               * (1.0 - vRoot * 0.76) * (1.0 - hunger * 0.18);
    vec3 glowCol = mix(vColor * vec3(1.3, 1.55, 2.15), spectrum * 1.55, 0.55 + vRarity * 0.45);

    vec3 rim = spectrum * fres * (0.9 + vRarity * 1.25 + contactFlash * 0.85 + uChaos * 0.3) * (1.0 - vRoot * 0.45);
    float spore = pow(max(0.0, 0.5 + 0.5 * f2), 2.5) * (0.22 + vRarity * 0.85) * pulse * vUp * health;
    vec3 sporeCol = hsl2rgb(fract(viewHue + 0.22 + f3 * 0.08 + skinPulse3 * 0.1), 0.95, 0.68) * spore;
    // Contact chromatic flash (threat) + debt bruise pulse.
    vec3 threat = hsl2rgb(fract(viewHue + 0.38 + uTime * 0.15 + vStress * 0.08), 0.98, 0.62)
                * contactFlash * 0.48 * vUp;
    vec3 debtVeil = hsl2rgb(fract(viewHue + 0.62), 0.55, 0.28) * debt * 0.2 * (1.0 - vRoot);

    vec3 col = body + glowCol * glow + rim + sporeCol + threat + debtVeil;
    col += spectrum * contactFlash * 0.3 * vUp * (0.5 + 0.5 * skinPulse);
    col = mix(col, col * vec3(0.78, 0.86, 0.94), vStress * 0.28 * (1.0 - vUp));
    col += spectrum * vRarity * vUp * 0.14 * skinPulse * (0.55 + 0.45 * health);
    col = mix(col, col * vec3(1.08, 0.92, 1.15), skinPulse2 * 0.1 * (vStress + contactFlash * 0.55));
    // Thin-film interference: two path phases from hopf + view — operational rarity/health.
    vec3 film = hsl2rgb(fract(viewHue + 0.3 + f * 0.12 + hopfHue * 0.15), 0.95, 0.6);
    col = mix(col, col + film * 0.28, vRarity * health * vUp * (0.4 + 0.6 * skinPulse));
    col += film * uChaos * vRarity * vUp * 0.16 * pulse * (0.45 + contactFlash * 0.55);
    // Crowd interference: packing densifies chroma bands (plant↔plant biosphere signal).
    col = mix(col, spectrum * vec3(1.1, 0.95, 1.2), crowd * vUp * 0.12 * skinPulse3);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface FloraComfort {
  /** World position of the densest nearby grove cell centre. */
  x: number;
  y: number;
  z: number;
  /** 0..1 cover strength (normalized local plant density). */
  strength: number;
}

/**
 * The alien-flora field. Construct once with the {@link SimContext}; `update` each frame;
 * `comfortAt` queries cover density for the fauna.
 */
export class AlienFlora {
  /** One InstancedMesh per family that has ≥1 plant. */
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly families: Family[];
  private readonly material: THREE.ShaderMaterial;
  private readonly scene: THREE.Scene;
  /** ADR-0013 shared field; null in legacy/headless contexts preserves the original ecology exactly. */
  private readonly intelligence: OrganismIntelligenceSignal | null;

  /** Total plants actually placed (after clearings/paths/glade rejections). */
  readonly instanceCount: number;
  readonly speciesCount = SPECIES_COUNT;

  // ── Coarse density grid for the ecology query (cover for rest/camo/mating). ──
  private readonly cell = 44;
  private readonly gridN: number;
  private readonly gridHalf: number;
  private readonly density: Float32Array;
  private readonly maxDensity: number;
  // ── Operational ecology fields (food, capacity, overgraze debt) — not decorative paint. ──
  private readonly biomass: Float32Array;
  private readonly capacity: Float32Array;
  private readonly pressure: Float32Array;
  private readonly quality: Float32Array;
  private readonly biomassTex: THREE.DataTexture;
  private biomassTotal = 0;
  private biomassCells = 0;
  private biomassDirty = true;
  private texAccum = 0;
  private climateChaos = 0;
  private climateEntropy = 0;

  // Multi-point ragdoll springs (one per contact slot).
  private readonly contactDisp = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactVel = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactTarget = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactPX = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactPZ = new Float32Array(FLORA_CONTACT_SLOTS);

  // ── Spatial-hash soft plant↔plant collision — O(N·k), scales with N & field size. ──
  private readonly plantX: Float32Array;
  private readonly plantZ: Float32Array;
  private readonly plantR: Float32Array;
  private readonly plantPhase: Float32Array;
  private readonly plantFreq: Float32Array;
  /** mesh index into {@link meshes} for each plant. */
  private readonly plantMeshIdx: Uint16Array;
  /** instance index within that mesh. */
  private readonly plantInstIdx: Uint32Array;
  /** Accumulated soft push (xz interleaved). */
  private readonly plantPush: Float32Array;
  /** Scratch for thrash proxies (preallocated — no per-solve GC). */
  private readonly plantPX: Float32Array;
  private readonly plantPZ: Float32Array;
  private readonly plantRR: Float32Array;
  private readonly plantOX: Float32Array;
  private readonly plantOZ: Float32Array;
  private readonly plantTouch: Float32Array;
  /** Per-mesh aPush buffers (same order as meshes). */
  private readonly pushAttrs: Float32Array[] = [];
  private readonly hashBuckets: number[][];
  private readonly hashOrigin: number;
  private readonly hashN: number;
  private collideAccum = 0;
  private collideTime = 0;
  private collideChaos = 0;
  private collideWind = 0.4;

  constructor(ctx: SimContext) {
    this.scene = ctx.scene;
    this.intelligence = ctx.organismIntelligence ?? null;
    const target = ctx.quality.isMobile ? ALIEN_FLORA_TARGET_MOBILE : ALIEN_FLORA_TARGET_DESKTOP;

    // Park inactive contact slots far away with zero strength.
    for (let i = 0; i < FLORA_CONTACT_SLOTS; i++) {
      this.contactPX[i] = 99999;
      this.contactPZ[i] = 99999;
    }

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0.4 },
        uChaos: { value: 0 },
        uTerrainEntropy: { value: 0 },
        uTerrainWind: { value: new THREE.Vector2() },
        uContactX: { value: new THREE.Vector4(99999, 99999, 99999, 99999) },
        uContactZ: { value: new THREE.Vector4(99999, 99999, 99999, 99999) },
        uContactS: { value: new THREE.Vector4(0, 0, 0, 0) },
        // Legacy single-contact uniforms kept for test/read compatibility (mirrored from slot 0).
        uContactPos: { value: new THREE.Vector2(99999, 99999) },
        uContact: { value: 0 },
        uBiomass: { value: null as THREE.Texture | null },
        uGridExtent: { value: 1 },
        uScorchCenter: { value: new THREE.Vector2(1e9, 1e9) },
        uScorchRadius: { value: 0 },
      },
      vertexShader: flora_vert,
      fragmentShader: flora_frag,
      // Kill coplanar ground/plant z-fighting (bleeding edges) without floating the field.
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
      depthWrite: true,
    });

    this.families = AlienFlora.buildFamilies();
    const species = AlienFlora.buildSpecies();

    // Density grid spans the field; +1 cell margin so edge plants land in-bounds.
    this.gridN = Math.ceil((ALIEN_FLORA_FIELD_HALF * 2) / this.cell) + 2;
    this.gridHalf = (this.gridN * this.cell) / 2;
    this.density = new Float32Array(this.gridN * this.gridN);

    // ── Placement: low-discrepancy candidates, thinned by paths / glades / density. ──
    interface Placed {
      x: number;
      z: number;
      sp: number;
      scale: number;
      yaw: number;
      tilt: number;
      rarity: number;
    }
    const perFamily: Placed[][] = Array.from({ length: FAMILY_COUNT }, () => []);
    const candidates = Math.ceil(target * PLACEMENT_CANDIDATE_FACTOR);
    let placed = 0;
    let maxD = 1;
    for (let k = 0; k < candidates && placed < target; k++) {
      const u = (0.5 + 0.7548776662466927 * (k + 1)) % 1;
      const v = (0.5 + 0.5698402909980532 * (k + 1)) % 1;
      let x = (u * 2 - 1) * ALIEN_FLORA_FIELD_HALF + (hash(k * 3 + 1) - 0.5) * this.cell * 1.3;
      let z = (v * 2 - 1) * ALIEN_FLORA_FIELD_HALF + (hash(k * 3 + 2) - 0.5) * this.cell * 1.3;
      if (Math.abs(x) > ALIEN_FLORA_FIELD_HALF || Math.abs(z) > ALIEN_FLORA_FIELD_HALF) continue;
      if (Math.hypot(x, z) < CENTER_CLEAR) continue;
      if (Math.hypot(x, z - TEMPLE_Z) < TEMPLE_CLEAR) continue;

      const trail = Math.abs(
        Math.sin(x * 0.009 + z * 0.005 + 1.3 * Math.sin(z * 0.004)) +
          0.65 * Math.sin(z * 0.017 - x * 0.006 + 0.9 * Math.sin(x * 0.008)) +
          0.35 * Math.sin((x - z) * 0.024),
      );
      if (trail < 0.22) continue;

      let inGlade = false;
      for (let g = 0; g < GLADE_COUNT; g++) {
        const gx = (hash(g * 7 + 3) - 0.5) * ALIEN_FLORA_FIELD_HALF * 1.9;
        const gz = (hash(g * 7 + 5) - 0.5) * ALIEN_FLORA_FIELD_HALF * 1.9;
        const gr = 40 + hash(g * 7 + 9) * 70;
        const dx = x - gx;
        const dz = z - gz;
        if (dx * dx + dz * dz < gr * gr) {
          inGlade = true;
          break;
        }
      }
      if (inGlade) continue;

      const grove =
        Math.sin(x * 0.0055 + 0.7 * Math.sin(z * 0.003)) * Math.cos(z * 0.0061) +
        0.55 * Math.sin((x + z) * 0.013 + 2.1) +
        0.3 * Math.sin(x * 0.028 - z * 0.023) +
        0.18 * Math.sin(x * 0.061 + z * 0.057);
      const clump = 0.5 + 0.5 * Math.max(-1, Math.min(1, grove * 0.62));
      const accept = 0.06 + 0.94 * Math.pow(clump, 1.8);
      if (hash(k * 3) > accept) continue;

      const biome = biomeAt(x, z);
      const sp = AlienFlora.pickSpecies(biome, k);
      const s = species[sp]!;
      // Rarity: most common, some uncommon, a few legendary specials (food-rich, flashier).
      const rRoll = hash(k * 41 + 77);
      const rarity =
        rRoll > 0.992
          ? 0.85 + hash(k * 43) * 0.15 // legendary ~0.8%
          : rRoll > 0.94
            ? 0.45 + hash(k * 43) * 0.35 // uncommon ~5%
            : s.rarityBias * (0.05 + hash(k * 47) * 0.25); // common low rarity
      // Size ladder: floor out tiny stubs; scatter real giants (not nuclear lawn poles).
      const gRoll = hash(k * 23 + 29);
      const giant =
        gRoll > 0.988
          ? 3.1 + hash(k * 23 + 31) * 1.4 // legendary mega ~1.2%
          : gRoll > 0.94
            ? 1.85 + hash(k * 23 + 31) * 0.95 // uncommon large ~4.8%
            : 1;
      const scale = s.size * (0.9 + hash(k * 5 + 11) * 1.15) * giant * (1 + rarity * 0.28);
      const yaw = hash(k * 5 + 13) * TAU;
      // Small intrinsic lean only — big random tilt levers roots out of the ground and looks broken.
      const tilt = (hash(k * 5 + 17) - 0.5) * (0.06 + hash(k * 5 + 19) * 0.08);
      perFamily[s.family]!.push({ x, z, sp, scale, yaw, tilt, rarity });
      placed++;

      const gi = this.gridIndex(x, z);
      if (gi >= 0) {
        const d = (this.density[gi]! += 1);
        if (d > maxD) maxD = d;
      }
    }
    this.instanceCount = placed;
    this.maxDensity = maxD;

    // Flatten plant bases for spatial-hash soft collision (real plant↔plant, O(N·k) not N²).
    this.plantX = new Float32Array(placed);
    this.plantZ = new Float32Array(placed);
    this.plantR = new Float32Array(placed);
    this.plantPhase = new Float32Array(placed);
    this.plantFreq = new Float32Array(placed);
    this.plantMeshIdx = new Uint16Array(placed);
    this.plantInstIdx = new Uint32Array(placed);
    this.plantPush = new Float32Array(placed * 2);
    this.plantPX = new Float32Array(placed);
    this.plantPZ = new Float32Array(placed);
    this.plantRR = new Float32Array(placed);
    this.plantOX = new Float32Array(placed);
    this.plantOZ = new Float32Array(placed);
    this.plantTouch = new Float32Array(placed);
    let pi = 0;
    for (let fam = 0; fam < FAMILY_COUNT; fam++) {
      const list = perFamily[fam]!;
      for (let i = 0; i < list.length; i++) {
        const pl = list[i]!;
        this.plantX[pi] = pl.x;
        this.plantZ[pi] = pl.z;
        this.plantR[pi] = Math.max(0.95, pl.scale * COLLIDE_RADIUS_MUL);
        // Same family of phase/freq as GPU thrash so crown proxies stay coherent with sway.
        this.plantPhase[pi] =
          hash(pl.sp * 13 + i * 7 + fam * 101) * TAU +
          pl.x * 0.041 +
          pl.z * 0.037 +
          Math.sin(pl.x * 0.09 - pl.z * 0.07) * 1.7;
        this.plantFreq[pi] = 0.45 + hash(pl.sp * 37 + i * 11) * 2.1;
        // mesh/inst filled when InstancedMeshes are built (same fam order).
        this.plantInstIdx[pi] = i;
        pi++;
      }
    }
    this.hashOrigin = -ALIEN_FLORA_FIELD_HALF - COLLIDE_HASH_CELL;
    this.hashN = Math.ceil((ALIEN_FLORA_FIELD_HALF * 2 + COLLIDE_HASH_CELL * 2) / COLLIDE_HASH_CELL) + 1;
    this.hashBuckets = Array.from({ length: this.hashN * this.hashN }, () => []);
    for (let i = 0; i < placed; i++) {
      const hx = Math.floor((this.plantX[i]! - this.hashOrigin) / COLLIDE_HASH_CELL);
      const hz = Math.floor((this.plantZ[i]! - this.hashOrigin) / COLLIDE_HASH_CELL);
      if (hx < 0 || hz < 0 || hx >= this.hashN || hz >= this.hashN) continue;
      this.hashBuckets[hz * this.hashN + hx]!.push(i);
    }

    // Operational grids: capacity/quality from edaphics; biomass starts at capacity.
    const cells = this.gridN * this.gridN;
    this.biomass = new Float32Array(cells);
    this.capacity = new Float32Array(cells);
    this.pressure = new Float32Array(cells);
    this.quality = new Float32Array(cells);
    for (let i = 0; i < cells; i++) {
      if ((this.density[i] ?? 0) <= 0) continue;
      const ix = i % this.gridN;
      const iz = (i / this.gridN) | 0;
      const wx = ix * this.cell - this.gridHalf + this.cell / 2;
      const wz = iz * this.cell - this.gridHalf + this.cell / 2;
      const q = edaphicQuality(wx, wz);
      this.quality[i] = q;
      const cap = 0.55 + 0.45 * q;
      this.capacity[i] = cap;
      this.biomass[i] = cap;
      this.biomassTotal += cap;
      this.biomassCells++;
    }
    const texData = new Uint8Array(cells * 4);
    const densScale = this.maxDensity > 0 ? 1 / this.maxDensity : 0;
    for (let i = 0; i < cells; i++) {
      texData[i * 4] = Math.round((this.biomass[i] ?? 0) * 255);
      texData[i * 4 + 1] = Math.round((this.density[i] ?? 0) * densScale * 255);
      texData[i * 4 + 2] = Math.round((this.pressure[i] ?? 0) * 255);
    }
    this.biomassTex = new THREE.DataTexture(texData, this.gridN, this.gridN, THREE.RGBAFormat);
    this.biomassTex.minFilter = THREE.LinearFilter;
    this.biomassTex.magFilter = THREE.LinearFilter;
    this.biomassTex.needsUpdate = true;
    this.material.uniforms['uBiomass']!.value = this.biomassTex;
    this.material.uniforms['uGridExtent']!.value = this.gridN * this.cell;

    // ── Realize one InstancedMesh per non-empty family. ──
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    // Global plant index follows the same fam→list order used when filling plantX/Z.
    let globalPlant = 0;
    for (let fam = 0; fam < FAMILY_COUNT; fam++) {
      const list = perFamily[fam]!;
      if (list.length === 0) continue;
      const fmly = this.families[fam]!;
      const geo = fmly.geo.clone();
      const n = list.length;
      const params = new Float32Array(n * 4);
      const meta = new Float32Array(n * 4);
      const colors = new Float32Array(n * 3);
      const pushArr = new Float32Array(n * 2); // aPush: soft plant↔plant separation
      const mesh = new THREE.InstancedMesh(geo, this.material, n);
      mesh.frustumCulled = false;
      const meshIdx = this.meshes.length;
      for (let i = 0; i < n; i++) {
        const pl = list[i]!;
        const s = species[pl.sp]!;
        // Wire spatial-hash plant id → this instance.
        if (globalPlant < this.plantMeshIdx.length) {
          this.plantMeshIdx[globalPlant] = meshIdx;
          this.plantInstIdx[globalPlant] = i;
          globalPlant++;
        }
        // Seat origin into the soil so curved roots bury; GPU adds the same living-ground displacement.
        const gy = baseTerrainHeightAt(pl.x, pl.z) - ROOT_SINK;
        pos.set(pl.x, gy, pl.z);
        // Soft terrain-slope align only — collar follows land tilt, never laid flat.
        const dhx = baseTerrainHeightAt(pl.x + 1, pl.z) - baseTerrainHeightAt(pl.x - 1, pl.z);
        const dhz = baseTerrainHeightAt(pl.x, pl.z + 1) - baseTerrainHeightAt(pl.x, pl.z - 1);
        const groundTiltX = Math.max(-0.14, Math.min(0.14, -dhz * 0.18));
        const groundTiltZ = Math.max(-0.14, Math.min(0.14, dhx * 0.18));
        e.set(
          groundTiltX + Math.sin(pl.yaw) * pl.tilt * 0.65,
          pl.yaw,
          groundTiltZ + Math.cos(pl.yaw) * pl.tilt * 0.65,
        );
        q.setFromEuler(e);
        // Taller than wide: bigger presence without fat slabs or spaghetti poles.
        const s0 = pl.scale;
        scl.set(s0 * 0.94, s0 * 1.28, s0 * 0.94);
        m.compose(pos, q, scl);
        mesh.setMatrixAt(i, m);

        // Wild palettes — saturated alien food colors, not lawn green.
        const hueJit =
          (s.hue +
            (hash(pl.sp * 31 + i) - 0.5) * 0.14 +
            0.04 * Math.sin(pl.x * 0.009 + pl.z * 0.011) +
            pl.rarity * 0.1 +
            1) %
          1;
        const sat = Math.min(
          0.98,
          Math.max(0.55, s.sat + (hash(i * 97 + pl.sp) - 0.5) * 0.2 + pl.rarity * 0.15),
        );
        const light = Math.min(
          0.72,
          Math.max(0.32, s.light + hash(i * 101 + pl.sp) * 0.16 + pl.rarity * 0.1),
        );
        col.setHSL(hueJit, sat, light);
        if (pl.rarity > 0.55) {
          const kick = hash(i * 113 + pl.sp);
          const t = 0.28 + pl.rarity * 0.25;
          if (kick < 0.33) col.lerp(new THREE.Color(0.25, 0.95, 1.0), t);
          else if (kick < 0.66) col.lerp(new THREE.Color(1.0, 0.3, 0.85), t);
          else col.lerp(new THREE.Color(1.0, 0.8, 0.28), t);
        }

        const o4 = i * 4;
        // Spatial salt in phase so neighbors don't lockstep-crossover.
        // Spatial salt so neighbors never lockstep thrash (crossover ↓ at source).
        params[o4] =
          hash(pl.sp * 13 + i * 7) * TAU +
          pl.x * 0.041 +
          pl.z * 0.037 +
          Math.sin(pl.x * 0.09 - pl.z * 0.07) * 1.7 +
          Math.cos(pl.x * 0.05 + pl.z * 0.06) * 1.1;
        params[o4 + 1] = s.swayFreq * (0.55 + hash(i * 73 + pl.sp) * 1.9);
        params[o4 + 2] = Math.min(1, s.glow + hash(i * 79 + pl.sp) * 0.38 + pl.rarity * 0.25);
        params[o4 + 3] = fmly.height;

        // aMeta: rarity, stiffness, secondaryHue, reactGain
        meta[o4] = pl.rarity;
        meta[o4 + 1] = 0.18 + hash(i * 83 + pl.sp) * 1.0; // stiffness variance
        meta[o4 + 2] = (hueJit + 0.18 + pl.rarity * 0.25 + hash(i * 89) * 0.2) % 1;
        meta[o4 + 3] = 0.55 + hash(i * 91 + pl.sp) * 0.9 + pl.rarity * 0.7; // react gain

        const o3 = i * 3;
        colors[o3] = col.r;
        colors[o3 + 1] = col.g;
        colors[o3 + 2] = col.b;
      }
      geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
      geo.setAttribute('aMeta', new THREE.InstancedBufferAttribute(meta, 4));
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
      geo.setAttribute('aPush', new THREE.InstancedBufferAttribute(pushArr, 2));
      this.pushAttrs.push(pushArr);
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
    // Boot packing solve (dynamic thrash/biomass/contact continue in update).
    this.resolvePlantCollisions(0, 0, 0.4);
  }

  /**
   * Spatial-hash soft plant↔plant solve — O(N·k), scales with plant count & field area
   * (hash cells grow with extent; each plant only tests local buckets).
   *
   * Dynamic / adaptive / reactive:
   * - crown proxies thrash with phase/freq (same family as GPU sway)
   * - soft radii shrink when biomass is eaten (grazed stubs stop shoving)
   * - climate chaos/wind amplify thrash proxies
   * - beings in contact slots boost local separation (touch reaction)
   *
   * Falsifiable: overlapping soft envelopes ⇒ equal-opposite aPush forces.
   */
  private resolvePlantCollisions(t: number, chaos: number, wind: number): void {
    const n = this.plantX.length;
    if (n === 0) return;
    const push = this.plantPush;
    push.fill(0);
    // Precompute thrash proxies + biomass-scaled radii once (O(N), pair loop stays hot).
    const px = this.plantPX;
    const pz = this.plantPZ;
    const rr = this.plantRR;
    const ox = this.plantOX;
    const oz = this.plantOZ;
    const touch = this.plantTouch;
    const thrashScale = COLLIDE_THRASH_AMP * (0.55 + chaos * 0.9 + wind * 0.35);
    const boostR2 = (CONTACT_RADIUS * 1.15) * (CONTACT_RADIUS * 1.15);
    const cpx = this.contactPX;
    const cpz = this.contactPZ;
    const cstr = this.contactDisp;
    for (let i = 0; i < n; i++) {
      const xi = this.plantX[i]!;
      const zi = this.plantZ[i]!;
      const bm = this.biomassNear(xi, zi);
      const grow = 0.28 + 0.72 * bm;
      rr[i] = this.plantR[i]! * grow;
      const ph = this.plantPhase[i]!;
      const fq = this.plantFreq[i]!;
      const amp = thrashScale * (0.65 + 0.35 * grow);
      const oxi = Math.cos(t * fq + ph) * amp;
      const ozi = Math.sin(t * fq * 0.82 + ph * 1.3) * amp;
      ox[i] = oxi;
      oz[i] = ozi;
      px[i] = xi + oxi;
      pz[i] = zi + ozi;
      let tch = 1;
      for (let s = 0; s < FLORA_CONTACT_SLOTS; s++) {
        const cs = cstr[s]!;
        if (cs < 0.04) continue;
        const dx = xi - cpx[s]!;
        const dz = zi - cpz[s]!;
        if (dx * dx + dz * dz < boostR2) tch = Math.max(tch, 1 + cs * 1.35);
      }
      touch[i] = tch;
    }
    const hn = this.hashN;
    const origin = this.hashOrigin;
    const cell = COLLIDE_HASH_CELL;
    const buckets = this.hashBuckets;
    for (let i = 0; i < n; i++) {
      const xi = this.plantX[i]!;
      const zi = this.plantZ[i]!;
      const ri = rr[i]!;
      const pxi = px[i]!;
      const pzi = pz[i]!;
      const oxi = ox[i]!;
      const ozi = oz[i]!;
      const touchI = touch[i]!;
      const hx = Math.floor((xi - origin) / cell);
      const hz = Math.floor((zi - origin) / cell);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = hx + dx;
          const cz = hz + dz;
          if (cx < 0 || cz < 0 || cx >= hn || cz >= hn) continue;
          const bucket = buckets[cz * hn + cx]!;
          for (let b = 0; b < bucket.length; b++) {
            const j = bucket[b]!;
            if (j <= i) continue;
            const rj = rr[j]!;
            let ddx = pxi - px[j]!;
            let ddz = pzi - pz[j]!;
            const d2 = ddx * ddx + ddz * ddz;
            const minDist = ri + rj;
            if (d2 >= minDist * minDist || d2 < 1e-8) continue;
            const d = Math.sqrt(d2);
            const overlap = 1 - d / minDist;
            const inv = 1 / d;
            ddx *= inv;
            ddz *= inv;
            const closing = (oxi - ox[j]!) * -ddx + (ozi - oz[j]!) * -ddz > 0 ? 1.15 : 1;
            let mag = overlap * overlap * minDist * 0.62 * closing * Math.max(touchI, touch[j]!);
            if (mag > COLLIDE_PUSH_MAX) mag = COLLIDE_PUSH_MAX;
            const fx = ddx * mag;
            const fz = ddz * mag;
            const i2 = i * 2;
            const j2 = j * 2;
            push[i2] = (push[i2] ?? 0) + fx;
            push[i2 + 1] = (push[i2 + 1] ?? 0) + fz;
            push[j2] = (push[j2] ?? 0) - fx;
            push[j2 + 1] = (push[j2 + 1] ?? 0) - fz;
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const mi = this.plantMeshIdx[i]!;
      const ii = this.plantInstIdx[i]!;
      const buf = this.pushAttrs[mi];
      if (!buf) continue;
      const o = ii * 2;
      buf[o] = this.plantPush[i * 2] ?? 0;
      buf[o + 1] = this.plantPush[i * 2 + 1] ?? 0;
    }
    for (const mesh of this.meshes) {
      const attr = mesh.geometry.getAttribute('aPush') as THREE.InstancedBufferAttribute | undefined;
      if (attr) attr.needsUpdate = true;
    }
  }

  /** Nearest-cell biomass for collision radius scaling (O(1)). */
  private biomassNear(x: number, z: number): number {
    const gi = this.gridIndex(x, z);
    if (gi < 0) return 0;
    const b = this.biomass[gi] ?? 0;
    return b < 0 ? 0 : b > 1 ? 1 : b;
  }

  /** Map world (x,z) → density-grid index, or −1 if outside. */
  private gridIndex(x: number, z: number): number {
    const ix = Math.floor((x + this.gridHalf) / this.cell);
    const iz = Math.floor((z + this.gridHalf) / this.cell);
    if (ix < 0 || iz < 0 || ix >= this.gridN || iz >= this.gridN) return -1;
    return iz * this.gridN + ix;
  }

  /**
   * Nine unearthly silhouettes (lathe / tube / knot / compound) + buried root bulbs.
   * Same height envelope as f8c6eadb (~2–6u) — bizarro asymmetry & surface artifacts, NOT tall thin poles.
   * Collar at y=0; roots below (y negative). No boxy plates.
   */
  private static buildFamilies(): Family[] {
    const fams: Family[] = [];

    // 0 SPIRE — multi-lobe alien tower (fat mid, off-axis crowns — not a thin needle)
    {
      const stem = lathe(
        [
          [0.05, 0.0],
          [0.48, 0.28],
          [0.62, 0.85],
          [0.52, 1.7],
          [0.72, 2.7],
          [0.42, 3.9],
          [0.28, 5.0],
          [0.1, 5.7],
        ],
        18,
      );
      const crown = new THREE.SphereGeometry(0.5, 12, 10);
      crown.scale(1.5, 0.6, 1.25);
      crown.rotateZ(0.4);
      crown.translate(0.22, 5.5, 0.08);
      const lobe = new THREE.SphereGeometry(0.32, 10, 8);
      lobe.scale(1.4, 0.65, 1.0);
      lobe.rotateX(0.55);
      lobe.translate(-0.42, 3.3, 0.22);
      const lobe2 = new THREE.SphereGeometry(0.26, 9, 7);
      lobe2.scale(1.2, 0.7, 1.35);
      lobe2.rotateY(0.9);
      lobe2.translate(0.38, 4.2, -0.28);
      const arm = new THREE.TorusKnotGeometry(0.22, 0.07, 40, 6, 2, 3);
      arm.scale(0.9, 1.2, 0.9);
      arm.rotateZ(0.6);
      arm.translate(-0.15, 2.4, 0.35);
      const geo = adoptMerged([stem, crown, lobe, lobe2, arm, rootBulb(0.5, 0.58)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 1 WHIP — double-helix counter-coil + asymmetric fruiting nodules
    {
      const ptsA: THREE.Vector3[] = [];
      const ptsB: THREE.Vector3[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const y = t * 5.9;
        const a = t * Math.PI * 4.6;
        const r = 0.42 * (1 - t * 0.65) + 0.1;
        ptsA.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
        ptsB.push(
          new THREE.Vector3(
            Math.cos(a + Math.PI) * r * 0.75,
            y * 0.95,
            Math.sin(a + Math.PI) * r * 0.75,
          ),
        );
      }
      const tubeA = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsA), 36, 0.14, 7, false);
      const tubeB = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsB), 32, 0.1, 6, false);
      const n1 = new THREE.SphereGeometry(0.36, 10, 8);
      n1.scale(1.4, 0.7, 1.15);
      n1.rotateY(0.8);
      n1.translate(0.38, 1.9, 0.08);
      const n2 = new THREE.SphereGeometry(0.3, 10, 8);
      n2.scale(1.2, 0.65, 1.35);
      n2.rotateZ(-0.4);
      n2.translate(-0.32, 3.5, 0.18);
      const n3 = new THREE.SphereGeometry(0.24, 9, 7);
      n3.scale(1.1, 0.8, 1.5);
      n3.translate(0.14, 5.15, -0.12);
      const geo = adoptMerged([tubeA, tubeB, n1, n2, n3, rootBulb(0.4, 0.52)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 2 POD — warped urn + tilted mouth ring + side blister
    {
      const body = lathe(
        [
          [0.18, 0.0],
          [0.82, 0.22],
          [1.12, 0.65],
          [1.18, 1.1],
          [0.9, 1.5],
          [0.5, 1.85],
          [0.28, 2.1],
        ],
        20,
      );
      body.scale(1.05, 1, 0.88); // elliptic cross-section
      const lip = new THREE.TorusGeometry(0.48, 0.09, 8, 18);
      lip.rotateX(Math.PI / 2 + 0.25);
      lip.rotateZ(0.3);
      lip.translate(0.08, 1.95, 0.05);
      const blister = new THREE.SphereGeometry(0.38, 11, 9);
      blister.scale(1.2, 0.75, 1.0);
      blister.translate(0.72, 0.95, 0.15);
      const geo = adoptMerged([body, lip, blister, rootBulb(0.58, 0.5)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 3 BLADE — twisted sail + mid ridge bulb (asymmetric leaf-body)
    {
      const sail = lathe(
        [
          [0.03, 0.0],
          [0.22, 0.35],
          [0.65, 1.2],
          [0.95, 2.4],
          [1.05, 3.4],
          [0.75, 4.4],
          [0.3, 5.1],
          [0.04, 5.4],
        ],
        16,
      );
      sail.scale(0.42, 1, 1.05);
      sail.rotateY(0.35);
      const ridge = new THREE.SphereGeometry(0.22, 10, 8);
      ridge.scale(0.6, 1.6, 0.7);
      ridge.rotateZ(0.4);
      ridge.translate(0.15, 2.8, 0);
      const tipLobe = new THREE.SphereGeometry(0.2, 9, 7);
      tipLobe.scale(1.4, 0.55, 0.9);
      tipLobe.translate(-0.12, 5.15, 0.08);
      const geo = adoptMerged([sail, ridge, tipLobe, rootBulb(0.36, 0.52)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 4 CORAL — triple torus-knot cluster + satellite limbs (math alien, still connected)
    {
      const core = new THREE.TorusKnotGeometry(0.52, 0.15, 72, 8, 2, 5);
      core.scale(0.95, 1.7, 1.0);
      core.rotateX(0.25);
      core.translate(0, 2.4, 0);
      const core2 = new THREE.TorusKnotGeometry(0.34, 0.1, 48, 7, 3, 2);
      core2.scale(0.85, 1.35, 0.85);
      core2.rotateZ(0.75);
      core2.translate(0.28, 3.45, 0.12);
      const core3 = new THREE.TorusKnotGeometry(0.24, 0.08, 40, 6, 2, 5);
      core3.scale(1.0, 1.1, 1.0);
      core3.rotateY(1.1);
      core3.translate(-0.35, 1.9, -0.2);
      const s1 = new THREE.SphereGeometry(0.34, 10, 8);
      s1.scale(1.25, 0.65, 1.15);
      s1.translate(0.68, 1.4, 0.22);
      const s2 = new THREE.SphereGeometry(0.28, 9, 7);
      s2.translate(-0.55, 3.0, -0.28);
      const s3 = new THREE.SphereGeometry(0.24, 9, 7);
      s3.scale(1.35, 0.55, 1.15);
      s3.translate(0.28, 4.3, 0.38);
      const s4 = new THREE.SphereGeometry(0.2, 8, 6);
      s4.scale(1.1, 0.8, 1.4);
      s4.translate(-0.2, 4.0, 0.45);
      const geo = adoptMerged([core, core2, core3, s1, s2, s3, s4, rootBulb(0.46, 0.54)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 5 SHARD — multi-waist crystal + canted tip + mid wart
    {
      const crystal = lathe(
        [
          [0.06, 0.0],
          [0.52, 0.4],
          [0.62, 1.1],
          [0.38, 2.0],
          [0.58, 2.9],
          [0.42, 3.9],
          [0.55, 4.7],
          [0.12, 5.5],
        ],
        14,
      );
      crystal.scale(1.05, 1, 0.9);
      const tip = new THREE.SphereGeometry(0.22, 10, 8);
      tip.scale(0.65, 1.5, 0.75);
      tip.rotateX(0.35);
      tip.translate(0.08, 5.55, 0);
      const wart = new THREE.SphereGeometry(0.2, 9, 7);
      wart.scale(1.4, 0.7, 1.0);
      wart.translate(0.4, 2.6, 0.1);
      const geo = adoptMerged([crystal, tip, wart, rootBulb(0.4, 0.52)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 6 HELIX — fat counter-rotating mycelial coils + spore orbs
    {
      const pts: THREE.Vector3[] = [];
      const pts2: THREE.Vector3[] = [];
      for (let i = 0; i <= 42; i++) {
        const t = i / 42;
        const y = t * 5.4;
        const a = t * Math.PI * 5.8;
        const r = 0.55 * (1 - t * 0.62) + 0.12;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
        pts2.push(
          new THREE.Vector3(
            Math.cos(-a * 0.85 + 1.2) * r * 0.7,
            y * 0.92 + 0.15,
            Math.sin(-a * 0.85 + 1.2) * r * 0.7,
          ),
        );
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.18, 8, false);
      const tube2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 36, 0.12, 7, false);
      const orb1 = new THREE.SphereGeometry(0.34, 10, 8);
      orb1.scale(1.25, 0.7, 1.15);
      orb1.translate(0.48, 1.5, 0.12);
      const orb2 = new THREE.SphereGeometry(0.28, 10, 8);
      orb2.translate(-0.38, 3.05, 0.22);
      const orb3 = new THREE.SphereGeometry(0.24, 9, 7);
      orb3.scale(1.2, 0.65, 1.3);
      orb3.translate(0.22, 4.55, -0.15);
      const geo = adoptMerged([tube, tube2, orb1, orb2, orb3, rootBulb(0.44, 0.52)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 7 BUBBLE — clustered fruiting bodies + tilted rings (alien polyp)
    {
      const main = new THREE.SphereGeometry(0.75, 14, 12);
      main.scale(1.25, 0.85, 1.15);
      main.translate(0, 0.9, 0);
      const a = new THREE.SphereGeometry(0.45, 12, 10);
      a.scale(1.15, 0.8, 1.0);
      a.translate(0.62, 0.5, 0.25);
      const b = new THREE.SphereGeometry(0.4, 12, 10);
      b.translate(-0.55, 0.75, 0.4);
      const c = new THREE.SphereGeometry(0.36, 11, 9);
      c.scale(1.1, 0.75, 1.2);
      c.translate(0.15, 1.45, -0.5);
      const d = new THREE.SphereGeometry(0.28, 10, 8);
      d.translate(-0.2, 1.7, 0.35);
      const ring = new THREE.TorusGeometry(0.52, 0.07, 8, 18);
      ring.rotateX(Math.PI / 2 + 0.2);
      ring.rotateZ(0.4);
      ring.translate(0.05, 1.5, 0.05);
      const ring2 = new THREE.TorusGeometry(0.28, 0.05, 7, 14);
      ring2.rotateY(0.9);
      ring2.translate(0.4, 1.1, -0.2);
      const geo = adoptMerged([main, a, b, c, d, ring, ring2, rootBulb(0.55, 0.48)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 8 FAN — warped mineral sail + canted jewel + side shelf
    {
      const sail = lathe(
        [
          [0.03, 0.0],
          [0.28, 0.25],
          [0.85, 0.9],
          [1.25, 1.85],
          [1.35, 2.85],
          [1.0, 3.75],
          [0.4, 4.4],
          [0.05, 4.65],
        ],
        18,
      );
      sail.scale(0.32, 1, 1.08);
      sail.rotateY(0.25);
      const jewel = new THREE.SphereGeometry(0.26, 10, 8);
      jewel.scale(1.3, 0.6, 1.1);
      jewel.rotateX(0.4);
      jewel.translate(0.1, 4.4, 0.05);
      const shelf = new THREE.SphereGeometry(0.22, 9, 7);
      shelf.scale(1.5, 0.5, 1.0);
      shelf.translate(0.35, 2.4, 0.1);
      const geo = adoptMerged([sail, jewel, shelf, rootBulb(0.4, 0.5)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    return fams;
  }

  /** 50 deterministic species, biome-banded so each zone has a coherent alien palette. */
  private static buildSpecies(): Species[] {
    const out: Species[] = [];
    for (let i = 0; i < SPECIES_COUNT; i++) {
      const biome = i % BIOME_COUNT;
      const family = Math.floor(hash(i * 17 + 101) * FAMILY_COUNT) % FAMILY_COUNT;
      // Wild non-lawn palettes: stretch across cyan / magenta / gold / violet / rust / lime.
      const band = biome / BIOME_COUNT;
      const hue = (band + (hash(i * 19 + 2) - 0.5) * 0.18 + hash(i * 53) * 0.08 + 1) % 1;
      out.push({
        family,
        biome,
        hue,
        sat: 0.62 + hash(i * 23 + 3) * 0.36,
        light: 0.34 + hash(i * 29 + 5) * 0.3,
        // Bigger / taller — floor kills tiny invisibles; rare size via placement giants.
        size: 0.95 + hash(i * 31 + 7) * 1.7,
        swayFreq: 0.4 + hash(i * 37 + 11) * 2.2,
        glow: 0.35 + hash(i * 41 + 13) * 0.6,
        rarityBias: hash(i * 59 + 17) * 0.4,
      });
    }
    return out;
  }

  /** Choose a species whose biome matches the location; fall back across the band deterministically. */
  private static pickSpecies(biome: number, salt: number): number {
    const start = biome % BIOME_COUNT;
    const stride = BIOME_COUNT;
    const inBand: number[] = [];
    for (let i = start; i < SPECIES_COUNT; i += stride) inBand.push(i);
    if (inBand.length === 0) return 0;
    const pick = Math.floor(hash(salt * 7 + 53) * inBand.length) % inBand.length;
    return inBand[pick]!;
  }

  /**
   * Cover query for the fauna: the densest grove cell near (x,z). Creatures will steer here for
   * rest / camouflage / mating / gathering. Returns finite world coords + a 0..1 strength.
   */
  comfortAt(x: number, z: number): FloraComfort {
    const ix = Math.floor((x + this.gridHalf) / this.cell);
    const iz = Math.floor((z + this.gridHalf) / this.cell);
    let bestD = -1;
    let bx = x;
    let bz = z;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx;
        const cz = iz + dz;
        if (cx < 0 || cz < 0 || cx >= this.gridN || cz >= this.gridN) continue;
        const gi = cz * this.gridN + cx;
        const d = (this.density[gi] ?? 0) * (this.biomass[gi] ?? 0);
        if (d > bestD) {
          bestD = d;
          bx = cx * this.cell - this.gridHalf + this.cell / 2;
          bz = cz * this.cell - this.gridHalf + this.cell / 2;
        }
      }
    }
    const strength = bestD <= 0 ? 0 : bestD / this.maxDensity;
    return { x: bx, y: baseTerrainHeightAt(bx, bz), z: bz, strength };
  }

  /**
   * Drive render uniforms, integrate multi-slot ragdoll springs, and regrow the biomass grid.
   * Allocation-free per frame; O(gridN²), independent of the 60,000 GPU instances.
   */
  update(
    dt: number,
    t: number,
    chaos: number,
    terrainEntropy = 0,
    terrainWindX = 0,
    terrainWindZ = 0,
  ): void {
    const c = chaos < 0 ? 0 : chaos > 1 ? 1 : chaos;
    const e = terrainEntropy < 0 ? 0 : terrainEntropy > 1 ? 1 : terrainEntropy;
    this.climateChaos = c;
    this.climateEntropy = e;
    const u = this.material.uniforms;
    u['uTime']!.value = t;
    u['uWind']!.value = 0.4 + 0.8 * c + 0.1 * Math.sin(t * 0.33);
    u['uChaos']!.value = c;
    u['uTerrainEntropy']!.value = e;
    (u['uTerrainWind']!.value as THREE.Vector2).set(terrainWindX, terrainWindZ);

    this.collideTime = t;
    this.collideChaos = c;
    this.collideWind = 0.4 + 0.8 * c;
    // Dynamic soft plant↔plant: thrash proxies + biomass radii + contact boost.
    // Cadenced O(N·k) — scales with plant count/area (hash grows with field, local k stays bounded).
    this.collideAccum += dt > 0 ? dt : 0;
    const hot =
      Math.abs(this.contactDisp[0]!) +
        Math.abs(this.contactDisp[1]!) +
        Math.abs(this.contactDisp[2]!) +
        Math.abs(this.contactDisp[3]!) >
      0.08;
    const period = hot ? COLLIDE_PERIOD * 0.45 : COLLIDE_PERIOD;
    if (this.collideAccum >= period) {
      this.collideAccum = 0;
      this.resolvePlantCollisions(t, c, this.collideWind);
    }

    // Per-slot underdamped springs — hard snappy thrash when touched (not hollow soft sway).
    const h = dt > 0.05 ? 0.05 : dt > 0 ? dt : 0;
    const K = 95;
    const DAMP = 3.6;
    const cx = u['uContactX']!.value as THREE.Vector4;
    const cz = u['uContactZ']!.value as THREE.Vector4;
    const cs = u['uContactS']!.value as THREE.Vector4;
    for (let i = 0; i < FLORA_CONTACT_SLOTS; i++) {
      this.contactTarget[i]! *= 0.78; // faster release when being leaves
      this.contactVel[i]! +=
        (this.contactTarget[i]! - this.contactDisp[i]!) * K * h - this.contactVel[i]! * DAMP * h;
      this.contactDisp[i]! += this.contactVel[i]! * h;
      if (!Number.isFinite(this.contactDisp[i]!) || !Number.isFinite(this.contactVel[i]!)) {
        this.contactDisp[i] = 0;
        this.contactVel[i] = 0;
      }
      const d = this.contactDisp[i]!;
      // Allow stronger overshoot so a touch visibly thrashs (still clamped).
      this.contactDisp[i] = d < -1.4 ? -1.4 : d > 2.1 ? 2.1 : d;
    }
    cx.set(this.contactPX[0]!, this.contactPX[1]!, this.contactPX[2]!, this.contactPX[3]!);
    cz.set(this.contactPZ[0]!, this.contactPZ[1]!, this.contactPZ[2]!, this.contactPZ[3]!);
    cs.set(this.contactDisp[0]!, this.contactDisp[1]!, this.contactDisp[2]!, this.contactDisp[3]!);
    // Legacy single-contact mirror (slot 0) — tests still read uContact / uContactPos.
    (u['uContactPos']!.value as THREE.Vector2).set(this.contactPX[0]!, this.contactPZ[0]!);
    u['uContact']!.value = this.contactDisp[0]!;

    this.regrow(dt);
    if (this.biomassDirty) {
      this.texAccum += dt > 0 ? dt : 0;
      if (this.texAccum >= 0.1) {
        this.texAccum = 0;
        this.biomassDirty = false;
        const data = this.biomassTex.image.data as Uint8Array;
        const densScale = this.maxDensity > 0 ? 1 / this.maxDensity : 0;
        for (let i = 0; i < this.biomass.length; i++) {
          data[i * 4] = Math.round((this.biomass[i] ?? 0) * 255);
          data[i * 4 + 1] = Math.round((this.density[i] ?? 0) * densScale * 255);
          data[i * 4 + 2] = Math.round((this.pressure[i] ?? 0) * 255);
        }
        this.biomassTex.needsUpdate = true;
      }
    }
  }

  /**
   * Read-only flora biomass at world (x,z), bilinearly interpolated over the four surrounding cells.
   */
  biomassAt(x: number, z: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const fx = (x + this.gridHalf) / this.cell - 0.5;
    const fz = (z + this.gridHalf) / this.cell - 0.5;
    const ix0 = Math.floor(fx);
    const iz0 = Math.floor(fz);
    const tx = fx - ix0;
    const tz = fz - iz0;
    const n = this.gridN;
    const ix1 = ix0 + 1;
    const iz1 = iz0 + 1;
    const row0Valid = iz0 >= 0 && iz0 < n;
    const row1Valid = iz1 >= 0 && iz1 < n;
    const col0Valid = ix0 >= 0 && ix0 < n;
    const col1Valid = ix1 >= 0 && ix1 < n;
    const b00 = row0Valid && col0Valid ? (this.biomass[iz0 * n + ix0] ?? 0) : 0;
    const b10 = row0Valid && col1Valid ? (this.biomass[iz0 * n + ix1] ?? 0) : 0;
    const b01 = row1Valid && col0Valid ? (this.biomass[iz1 * n + ix0] ?? 0) : 0;
    const b11 = row1Valid && col1Valid ? (this.biomass[iz1 * n + ix1] ?? 0) : 0;
    const bx0 = b00 + (b10 - b00) * tx;
    const bx1 = b01 + (b11 - b01) * tx;
    return bx0 + (bx1 - bx0) * tz;
  }

  /**
   * Effective forage field: biomass × quality × (1 − overgraze). Chemotaxis climbs this.
   * Falsifiable: foodAt ≤ biomassAt; richer edaphics rank higher at equal biomass.
   */
  foodAt(x: number, z: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const fx = (x + this.gridHalf) / this.cell - 0.5;
    const fz = (z + this.gridHalf) / this.cell - 0.5;
    const ix0 = Math.floor(fx);
    const iz0 = Math.floor(fz);
    const tx = fx - ix0;
    const tz = fz - iz0;
    const n = this.gridN;
    const sample = (ix: number, iz: number): number => {
      if (ix < 0 || iz < 0 || ix >= n || iz >= n) return 0;
      const i = iz * n + ix;
      const b = this.biomass[i] ?? 0;
      if (b <= 0) return 0;
      const q = this.quality[i] ?? 0;
      const p = this.pressure[i] ?? 0;
      return b * (0.55 + 0.45 * q) * (1 - 0.5 * p);
    };
    const f00 = sample(ix0, iz0);
    const f10 = sample(ix0 + 1, iz0);
    const f01 = sample(ix0, iz0 + 1);
    const f11 = sample(ix0 + 1, iz0 + 1);
    return f00 + (f10 - f00) * tx + (f01 + (f11 - f01) * tx - (f00 + (f10 - f00) * tx)) * tz;
  }

  pressureAt(x: number, z: number): number {
    const gi = this.gridIndex(x, z);
    return gi < 0 ? 0 : (this.pressure[gi] ?? 0);
  }

  qualityAt(x: number, z: number): number {
    const gi = this.gridIndex(x, z);
    return gi < 0 ? 0 : (this.quality[gi] ?? 0);
  }

  capacityAt(x: number, z: number): number {
    const gi = this.gridIndex(x, z);
    return gi < 0 ? 0 : (this.capacity[gi] ?? 0);
  }

  /**
   * Graze: biomass → food. Yield scales with edaphic quality; stamps overgraze debt.
   */
  grazeAt(x: number, z: number, pressure: number, dt: number): number {
    const gi = this.gridIndex(x, z);
    if (gi < 0) return 0;
    const have = this.biomass[gi] ?? 0;
    if (have <= 0.001) return 0;
    const p = Number.isFinite(pressure) ? (pressure < 0 ? 0 : pressure > 1 ? 1 : pressure) : 0;
    const h = Number.isFinite(dt) ? (dt > 0.05 ? 0.05 : dt > 0 ? dt : 0) : 0;
    if (p <= 0 || h <= 0) return 0;
    const eaten = Math.min(have, p * GRAZE_RATE * h);
    this.biomass[gi] = have - eaten;
    const stored = this.biomass[gi] ?? 0;
    this.biomassTotal = Math.max(0, this.biomassTotal + stored - have);
    const cap = Math.max(0.05, this.capacity[gi] ?? 1);
    const pr = (this.pressure[gi] ?? 0) + (eaten / cap) * PRESSURE_STAMP;
    this.pressure[gi] = pr > 1 ? 1 : pr;
    this.biomassDirty = true;
    const q = this.quality[gi] ?? 0.5;
    return eaten * GRAZE_YIELD * (0.65 + 0.55 * q);
  }

  /**
   * Regrow toward capacity under neighbor seed, overgraze debt, climate, intelligence gain.
   */
  private regrow(dt: number): void {
    const h = dt > 0.05 ? 0.05 : dt > 0 ? dt : 0;
    if (h <= 0) return;
    const bm = this.biomass;
    const den = this.density;
    const n = this.gridN;
    const intelligence = this.intelligence;
    const adaptiveGain = intelligence?.enabled
      ? 1 +
        Math.min(
          0.55,
          intelligence.resourcePressure * 0.28 +
            intelligence.forecast * 0.14 +
            intelligence.confidence * 0.08 +
            intelligence.plasticity * 0.05,
        )
      : 1;
    let climate =
      (1 - 0.45 * this.climateEntropy) * (1 - 0.28 * Math.max(0, this.climateChaos - 0.25));
    climate = climate < 0.2 ? 0.2 : climate > 1.2 ? 1.2 : climate;
    const decay = Math.exp(-PRESSURE_DECAY * h);
    for (let i = 0; i < bm.length; i++) {
      if ((den[i] ?? 0) <= 0) continue;
      const p0 = this.pressure[i] ?? 0;
      if (p0 > 1e-6) {
        this.pressure[i] = p0 * decay;
        this.biomassDirty = true;
      }
      const cap = this.capacity[i] ?? 1;
      const b = bm[i]!;
      if (b >= cap - 1e-6) {
        if (b > cap) {
          this.biomassTotal += cap - b;
          bm[i] = cap;
          this.biomassDirty = true;
        }
        continue;
      }
      const ix = i % n;
      const iz = (i / n) | 0;
      let neigh = 0;
      let nc = 0;
      if (ix > 0) {
        neigh += bm[i - 1] ?? 0;
        nc++;
      }
      if (ix < n - 1) {
        neigh += bm[i + 1] ?? 0;
        nc++;
      }
      if (iz > 0) {
        neigh += bm[i - n] ?? 0;
        nc++;
      }
      if (iz < n - 1) {
        neigh += bm[i + n] ?? 0;
        nc++;
      }
      const nMean = nc > 0 ? neigh / nc : 0;
      const room = Math.max(0, cap - b);
      const pDebt = 1 - 0.5 * (this.pressure[i] ?? 0);
      // Dual recovery: logistic + exp approach. Calm climate ≈5s respawn; entropy/chaos stretch τ.
      const logistic =
        (REGROW_SEED * cap + REGROW_RATE * b * room + REGROW_NEIGHBOR * nMean * room) *
        h *
        adaptiveGain *
        climate *
        pDebt;
      const tau = REGROW_TAU / Math.max(0.22, climate * climate);
      const expPull = room * (1 - Math.exp(-h / tau)) * adaptiveGain * pDebt;
      const raw = Math.max(logistic, expPull * 0.75);
      const next = b + raw > cap ? cap : b + raw;
      bm[i] = next;
      this.biomassTotal += next - b;
      this.biomassDirty = true;
    }
  }

  /** Mean live biomass over cells that can carry plants, normalized to [0,1]. O(1). */
  meanBiomass(): number {
    if (this.biomassCells <= 0) return 0;
    const mean = this.biomassTotal / this.biomassCells;
    return mean < 0 ? 0 : mean > 1 ? 1 : mean;
  }

  /**
   * Visual contact — convenience single seed (slot 0). Prefer {@link setContacts} for multi-point.
   * Local radius only; never lawn-wide slabs.
   */
  setContact(x: number, z: number, strength: number): void {
    this.setContacts([{ x, z, strength }]);
  }

  /**
   * Multi-point local contact seeds (≤4). Each seed only thrash plants within ~16u, with
   * per-plant phase desync so the field never slides as one gigantic solid patch.
   * Strength is spring-targeted (overshoot + settle). Render-only; no sim write-back.
   */
  setContacts(seeds: ReadonlyArray<{ x: number; z: number; strength: number }>): void {
    const count = Math.min(FLORA_CONTACT_SLOTS, seeds.length);
    for (let i = 0; i < count; i++) {
      const s = seeds[i]!;
      if (!Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
      const str = s.strength < 0 ? 0 : s.strength > 1 ? 1 : s.strength;
      this.contactPX[i] = s.x;
      this.contactPZ[i] = s.z;
      // Impulse on rising contact — plant reacts immediately to a touch, not a slow blend.
      if (str > this.contactTarget[i]!) {
        this.contactVel[i]! += (str - this.contactTarget[i]!) * 14;
        this.contactTarget[i] = str;
        // Nudge collide cadence so the next update runs a hot soft-solve (still O(N·k)).
        this.collideAccum = Math.max(this.collideAccum, COLLIDE_PERIOD * 0.5);
      } else if (str > 0.05) {
        // Maintain presence while a being stays in the pocket.
        this.contactTarget[i] = Math.max(this.contactTarget[i]!, str * 0.85);
      }
    }
    // Mirror positions into uniforms immediately (spring strength still integrates in update).
    const u = this.material.uniforms;
    (u['uContactX']!.value as THREE.Vector4).set(
      this.contactPX[0]!,
      this.contactPX[1]!,
      this.contactPX[2]!,
      this.contactPX[3]!,
    );
    (u['uContactZ']!.value as THREE.Vector4).set(
      this.contactPZ[0]!,
      this.contactPZ[1]!,
      this.contactPZ[2]!,
      this.contactPZ[3]!,
    );
    (u['uContactPos']!.value as THREE.Vector2).set(this.contactPX[0]!, this.contactPZ[0]!);
  }

  /**
   * PORTAL DEATH: plants inside the risen temple footprint collapse to nothing.
   */
  setScorch(cx: number, cz: number, radius: number): void {
    const u = this.material.uniforms;
    (u['uScorchCenter']!.value as THREE.Vector2).set(cx, cz);
    u['uScorchRadius']!.value = radius > 0 ? radius : 0;
  }

  /** Free every owned geometry + the shared material (HMR / world-reset safe). */
  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      this.scene.remove(mesh);
      mesh.dispose();
    }
    this.meshes.length = 0;
    for (const f of this.families) f.geo.dispose();
    this.biomassTex.dispose();
    this.material.dispose();
  }
}
