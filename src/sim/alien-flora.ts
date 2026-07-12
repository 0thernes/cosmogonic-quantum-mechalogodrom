/**
 * ALIEN FLORA — a living vegetal ecology for the dead arena floor.
 *
 * The ground was barren. This grows 60,000 plants drawn from 50 deterministic SPECIES across
 * nine structural FAMILIES, distributed in biome PATCHES
 * with bare PATHS, open GLADES, and a clear CENTER so the temple/cosmic-crown stay framed — the
 * spacing of a real world, not a uniform lawn. Plants are NOT neural (no brain, no rng draws) —
 * they are a substrate the fauna reads through {@link EntityManager.attachFloraComfort}: creatures
 * find dense cover for rest / camouflage / mating / gathering using this module's {@link comfortAt}
 * spatial readout. They are FOOD with operational fields: biomass, edaphic capacity/quality,
 * and overgraze pressure. Creatures graze to stubs; cells REGENERATE toward capacity under
 * neighbor seed, climate stress, and pressure debt. Chemotaxis climbs foodAt (not paint).
 *
 * RENDER: each family is ONE `InstancedMesh` (≤9 draw calls for 60k plants) sharing one
 * `ShaderMaterial`. Skins/motion read the same ecology fields. CPU hot path is O(grid cells)
 * + O(4 contacts), independent of plant count.
 *
 * CONTACT (USER fix): NEVER one gigantic solid patch. Up to 4 local contact seeds with a tight
 * falloff (~16u). Each plant desyncs by phase/stiffness/rarity so neighbors thrash differently —
 * proximity to living beings AND to dense biomass, ragdoll-but-weirder (tip lag, mid twist,
 * root anchor, mycelial whip).
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

// ── USER ecology: plants offer FOOD, get grazed to nibbled stubs, and REGROW. All deterministic. ──
/** Biomass eaten per second by a full-pressure graze on one cell. */
const GRAZE_RATE = 0.9;
/** Energy (on the 0..100 creature scale) yielded per unit of biomass eaten. */
const GRAZE_YIELD = 22;
/** Logistic regrowth speed toward a cell's carrying capacity. */
const REGROW_RATE = 0.22;
/** Reseed floor so a fully-eaten (dead) cell slowly regenerates from nothing. */
const REGROW_SEED = 0.015;
/** Neighbor diffusion assist — dense live neighbors speed recovery of depleted cells. */
const REGROW_NEIGHBOR = 0.08;
/** Overgraze residual decay rate (1/s) — PRESSURE is real recovery suppression, not a paint flag. */
const PRESSURE_DECAY = 0.18;
/** How hard grazing stamps residual pressure (dimensionless, eaten/capacity). */
const PRESSURE_STAMP = 0.9;
/** Max simultaneous local contact seeds (multi-point; kills the single giant-patch slide). */
export const FLORA_CONTACT_SLOTS = 4;
/** Local contact radius (world units). Old falloff was ~72u — that moved entire lawn slabs. */
const CONTACT_RADIUS = 16;
/** Squared radius for GPU falloff — must match `smoothstep` edge in the vertex shader. */
const CONTACT_RADIUS2 = CONTACT_RADIUS * CONTACT_RADIUS;

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

/**
 * Edaphic nutrient quality 0..1 from continuous zonation (same fields as biomeAt).
 * Falsifiable: different (x,z) return different values; independent of live biomass.
 */
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

/** How deep the instance origin sits below the analytic surface so roots bury and no coplanar z-fight. */
const ROOT_SINK = 0.72;

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
  uniform float uTime;
  uniform float uWind;
  uniform float uChaos;
  uniform float uTerrainEntropy;
  uniform vec2 uTerrainWind;
  // MULTI-POINT local contact (4 seeds) — purposeful contact physics, not lawn slabs.
  uniform vec4 uContactX;
  uniform vec4 uContactZ;
  uniform vec4 uContactS;
  // R = live biomass (food/health), G = local plant density (adaptive bracing vs crossover)
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
  varying float vDensity;
  varying float vStress; // chaos + contact + hunger — drives skin mutation
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying vec3 vWorldP;
  ${TERRAIN_DEFORMATION_GLSL}

  float localContact(vec2 base, float cx, float cz, float strength, float phase, float stiff, float react) {
    if (strength < 0.001) return 0.0;
    vec2 d = base - vec2(cx, cz);
    float d2 = dot(d, d);
    float fall = smoothstep(${CONTACT_RADIUS2.toFixed(1)}, 25.0, d2);
    if (fall <= 0.0) return 0.0;
    float personal = 0.42 + 0.58 * sin(phase * 2.7 + stiff * 5.1 + base.x * 0.31 + base.y * 0.29);
    float wobble = 0.75 + 0.35 * sin(uTime * (3.2 + stiff * 4.0) + phase * 1.9);
    return strength * fall * personal * react * wobble;
  }

  // Full multi-axis morph: continuous spin + counter-spin + lean + roll. Root collar stays fixed.
  vec3 multiAxisMorph(
    vec3 p, float up, float rootPin, float phase, float freq,
    float twistWave, float spinRate, float counterSpin, float leanX, float leanZ, float roll
  ) {
    float u2 = up * up * rootPin;
    // Primary yaw spin (continuous) + oscillating twist + counter-axis spin (weird).
    float ang = (twistWave * up + spinRate * uTime * u2 + counterSpin * uTime * up + phase * 0.2) * rootPin;
    float ca = cos(ang);
    float sa = sin(ang);
    vec3 q = vec3(ca * p.x + sa * p.z, p.y, -sa * p.x + ca * p.z);
    // Roll around lean axis (multi-axis vectorized).
    float cr = cos(roll * u2);
    float sr = sin(roll * u2);
    float qy = q.y * cr - q.z * sr;
    float qz = q.y * sr + q.z * cr;
    q.y = qy;
    q.z = qz;
    // Tip lean + precession (no amplitude kill).
    q.x += leanX * u2;
    q.z += leanZ * u2;
    float pre = 0.55 * sin(uTime * freq * 0.65 + phase * 1.7) * u2;
    float pre2 = 0.4 * cos(uTime * freq * 0.41 + phase * 2.3) * rootPin * up;
    float pre3 = 0.28 * sin(uTime * freq * 1.15 + phase * 0.5) * u2;
    q.x += pre * cos(phase) + pre2 * sin(phase * 0.7) + pre3 * cos(phase * 2.1);
    q.z += pre * sin(phase * 1.3) + pre2 * cos(phase * 1.1) + pre3 * sin(phase * 1.9);
    return q;
  }

  void main() {
    vColor = aColor;
    vGlow = aParams.z;
    vRarity = aMeta.x;
    vSecHue = aMeta.z;
    float up = clamp(position.y / max(aParams.w, 0.001), 0.0, 1.0);
    vUp = up;
    // HARD root pin — ONLY structural seating, not a thrash cap.
    float rootPin = smoothstep(0.0, 0.2, up);
    vRoot = 1.0 - rootPin;

    // Spatial desync: neighbors never phase-lock (purpose: reduce lockstep crossover without caps).
    vec2 bmBase = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
    float spatialPhase = bmBase.x * 0.13 + bmBase.y * 0.17 + sin(bmBase.x * 0.07 - bmBase.y * 0.09) * 1.7;
    float phase = aParams.x + spatialPhase;
    float freq = aParams.y * (0.85 + 0.35 * fract(sin(bmBase.x * 12.9898 + bmBase.y * 78.233) * 43758.5453));
    float stiff = clamp(aMeta.y, 0.1, 1.6);
    float react = clamp(aMeta.w, 0.25, 2.4);
    float rarity = aMeta.x;

    // Operational fields: R=food, G=crowd density, B=overgraze debt.
    vec4 field = texture2D(uBiomass, (bmBase + 0.5 * uGridExtent) / uGridExtent);
    float biomass = field.r;
    float density = field.g;
    float overgraze = field.b;
    vBiomass = biomass;
    vDensity = density;

    // Finite-difference density gradient — PURPOSEFUL separation (seek open canopy space).
    // Not a motion cap: thrash stays full; we ADD a desync/avoidance bias from real crowding.
    float eps = 6.0;
    float dE = texture2D(uBiomass, (bmBase + vec2(eps, 0.0) + 0.5 * uGridExtent) / uGridExtent).g;
    float dW = texture2D(uBiomass, (bmBase + vec2(-eps, 0.0) + 0.5 * uGridExtent) / uGridExtent).g;
    float dN = texture2D(uBiomass, (bmBase + vec2(0.0, eps) + 0.5 * uGridExtent) / uGridExtent).g;
    float dS = texture2D(uBiomass, (bmBase + vec2(0.0, -eps) + 0.5 * uGridExtent) / uGridExtent).g;
    vec2 avoid = vec2(dW - dE, dS - dN); // toward lower density
    float avoidLen = length(avoid);
    if (avoidLen > 1e-5) avoid /= avoidLen;

    float soft = 1.0 / stiff;
    float health = clamp(biomass, 0.0, 1.0);
    float hunger = 1.0 - health;
    // Food quality proxy for motion energy (rich/live plants thrash harder — operational).
    float vigor = 0.55 + 0.65 * health + 0.35 * rarity - 0.25 * overgraze;

    float bend = rootPin * rootPin * (0.85 + uWind * 1.55 + uChaos * 1.45) * soft * (1.2 + rarity * 0.85) * vigor;
    float turb = rootPin * rootPin * (0.45 + uChaos * 1.15) * soft * vigor;
    vec3 p = position;

    // ── TWIST / SPIN / COUNTER-SPIN / LEAN — full power, spatially desynced ──
    float twistWave = (1.7 + rarity * 2.1 + uChaos * 1.2) * sin(uTime * freq * 0.95 + phase)
                    + (0.95 + hunger * 0.7) * sin(uTime * freq * 2.15 + phase * 2.0)
                    + 0.55 * sin(uTime * freq * 3.4 + phase * 0.4);
    float spinRate = (0.95 + freq * 1.35 + rarity * 1.5 + uChaos * 0.95 + health * 0.5) * soft * vigor;
    float counterSpin = (0.35 + rarity * 0.55 + uChaos * 0.4) * soft
                      * sin(uTime * 0.17 + phase) * (0.6 + density * 0.5);
    float leanX = sin(uTime * freq + phase) * bend * 3.6
                + sin(uTime * freq * 3.1 + phase * 1.4) * turb * 2.0
                + sin(uTime * freq * 5.5 + phase * 0.5) * turb * 0.9
                + avoid.x * density * rootPin * up * up * (1.2 + vigor); // canopy separation
    float leanZ = cos(uTime * freq * 0.88 + phase * 1.2) * bend * 3.4
                + cos(uTime * freq * 2.7 + phase * 1.6) * turb * 1.85
                + cos(uTime * freq * 5.0 + phase * 0.9) * turb * 0.85
                + avoid.y * density * rootPin * up * up * (1.2 + vigor);
    float roll = (0.7 + rarity * 0.9) * sin(uTime * freq * 0.5 + phase * 1.5)
               + (0.4 + uChaos * 0.5) * cos(uTime * freq * 1.3 + phase);
    p = multiAxisMorph(p, up, rootPin, phase, freq, twistWave, spinRate, counterSpin, leanX, leanZ, roll);

    // ── UP/DOWN + EXPAND/CONTRACT + DEGRADE + MORPH ──
    // Heave/expand stay lateral-heavy so plants don't look like endless poles.
    float heave = sin(uTime * freq * 0.9 + phase) * rootPin * (0.1 + 0.12 * health) * (0.55 + uWind * 0.5 + uChaos * 0.35);
    float pulse = 0.5 + 0.5 * sin(uTime * (1.4 + freq * 0.4) + phase + rarity * 2.2);
    float expand = rootPin * (0.07 + 0.14 * health) * pulse * vigor
                 - rootPin * hunger * 0.12
                 - rootPin * overgraze * 0.08;
    float squash = 1.0 + expand * (0.85 + 0.4 * up) + 0.14 * sin(uTime * freq * 0.6 + phase) * rootPin * up;
    float stretch = 1.0 + expand * (0.7 + 0.35 * up) - 0.12 * sin(uTime * freq * 0.6 + phase + 1.1) * rootPin * up;
    p.y += heave * up;
    p.x *= squash;
    p.z *= stretch;
    // Hunger degrades a little height — no vertical stretch morph.
    p.y *= mix(1.0, 0.88 + 0.12 * health, rootPin * 0.7);

    // Biomass graze scale (above collar).
    float grow = 0.12 + 0.88 * health;
    if (uScorchRadius > 0.0) {
      float scorchD = length(bmBase - uScorchCenter);
      grow *= smoothstep(uScorchRadius * 0.82, uScorchRadius, scorchD);
    }
    float gRoot = mix(0.92 + 0.08 * grow, grow, rootPin);
    p.x *= gRoot;
    p.z *= gRoot;
    p.y = position.y < 0.0 ? p.y * (0.9 + 0.1 * grow) : p.y * mix(1.0, grow, rootPin);
    vGlow *= 0.25 + 0.75 * health;

    vec4 worldPosition = instanceMatrix * vec4(p, 1.0);
    worldPosition.y += cqmTerrainDisplacement(
      vec3(bmBase.x, 0.0, bmBase.y),
      uTime,
      uChaos,
      uTerrainEntropy,
      uTerrainWind
    );

    // ── CONTACT PHYSICS (multi-point, tip-weighted, FULL reaction) ──
    float c0 = localContact(bmBase, uContactX.x, uContactZ.x, uContactS.x, phase, stiff, react);
    float c1 = localContact(bmBase, uContactX.y, uContactZ.y, uContactS.y, phase + 1.7, stiff, react);
    float c2 = localContact(bmBase, uContactX.z, uContactZ.z, uContactS.z, phase + 3.1, stiff, react);
    float c3 = localContact(bmBase, uContactX.w, uContactZ.w, uContactS.w, phase + 4.9, stiff, react);
    float cSum = c0 + c1 + c2 + c3;
    vContactLive = clamp(cSum, 0.0, 2.5);
    vStress = clamp(uChaos * 0.4 + cSum * 0.5 + hunger * 0.3 + overgraze * 0.45, 0.0, 1.5);

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
    push /= wsum;
    // Blend contact flee with canopy separation (both purposeful, neither is a thrash cap).
    push = normalize(push * 1.2 + avoid * density * 0.55 + vec2(0.0001));

    float tip = rootPin * rootPin * rootPin;
    float mid = rootPin * rootPin * (1.0 - up) * 4.0;
    float amp = (3.8 + uChaos * 3.4 + rarity * 2.0 + react * 1.2) * soft * vigor;
    float contactLat = cSum * tip * amp;
    worldPosition.xz += push * (contactLat + density * cSum * mid * 0.35);
    // Crowd-driven continuous tip bias toward open space (desyncs overlapping arcs).
    worldPosition.xz += avoid * density * tip * (0.8 + vigor * 0.6) * (0.5 + 0.5 * sin(uTime * freq + phase));
    vec2 ortho = vec2(-push.y, push.x);
    worldPosition.xz += ortho * sin(uTime * (7.5 + stiff * 4.2) + phase) * cSum * mid * amp * 0.9;
    // Contact turbo-spin + counter-spin.
    float cTwist = cSum * tip * (2.6 + react * 1.6) * (0.5 + 0.5 * sin(uTime * 5.2 + phase));
    float cTwist2 = cSum * mid * 0.7 * cos(uTime * 3.1 + phase * 1.3);
    float cca = cos(cTwist + cTwist2);
    float csa = sin(cTwist + cTwist2);
    vec2 rel = worldPosition.xz - bmBase;
    worldPosition.xz = bmBase + vec2(cca * rel.x - csa * rel.y, csa * rel.x + cca * rel.y);

    worldPosition.y += cSum * tip * (1.6 + uChaos * 1.8 + rarity * 1.15);
    worldPosition.y += sin(cSum * 11.0 + uTime * 3.8 + phase) * cSum * tip * 1.35;
    float invert = smoothstep(0.2, 0.95, cSum + uChaos * 0.55) * tip * (0.75 + rarity * 0.5);
    worldPosition.y -= invert * (0.85 + up * 1.6);
    worldPosition.xz += push * invert * 1.35;

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
  varying float vDensity;
  varying float vStress;
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

  // Soft domain-warped field (4D-ish: xyz + time) — living skin, not stripe paint.
  float field4(vec3 p, float t) {
    vec3 q = p * 0.11;
    q.x += 0.35 * sin(q.y * 1.7 + t * 0.31);
    q.y += 0.35 * cos(q.z * 1.5 - t * 0.27);
    q.z += 0.3 * sin(q.x * 1.9 + t * 0.23);
    float a = sin(q.x * 2.1 + t * 0.4) * cos(q.y * 1.8 - t * 0.33);
    float b = sin(q.y * 2.4 + q.z * 1.3 + t * 0.21);
    float c = cos(length(q.xy) * 3.1 - t * 0.29 + q.z);
    return a * 0.45 + b * 0.35 + c * 0.2;
  }

  void main() {
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(vViewDir);
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.0);

    float f = field4(vWorldP, uTime);
    float f2 = field4(vWorldP.yzx * 1.3 + 2.1, uTime * 0.7 + vStress);
    float tex = 0.58 + 0.28 * f + 0.14 * f2;

    // DYNAMIC SKIN: hue migrates with health, stress, contact, and time (mutating, purposeful).
    float health = clamp(vBiomass, 0.0, 1.0);
    float hunger = 1.0 - health;
    float contactFlash = clamp(vContactLive, 0.0, 1.5);
    // Healthy → cool-lush spectrum; hungry → warm/ash; stressed/contact → hot iridescent alarm.
    // Mutating skin — hue races with stress, contact, health, and continuous morph phase.
    float hueDrift = vSecHue
      + fres * 0.28
      + vUp * 0.12
      + f * 0.1
      + uTime * (0.055 + vRarity * 0.04 + vStress * 0.03 + contactFlash * 0.02)
      + hunger * 0.14
      + vStress * 0.22
      + contactFlash * 0.14
      + vDensity * 0.06
      + sin(uTime * 1.3 + vWorldP.x * 0.05 + vWorldP.z * 0.04) * 0.05;
    float viewHue = fract(hueDrift);
    float sat = clamp(0.55 + vRarity * 0.25 + health * 0.2 - hunger * 0.15 + contactFlash * 0.15, 0.25, 0.98);
    float lit = clamp(0.38 + fres * 0.15 + health * 0.18 - hunger * 0.12 + contactFlash * 0.1, 0.15, 0.78);
    vec3 iri = hsl2rgb(viewHue, sat, lit);
    vec3 iri2 = hsl2rgb(fract(viewHue + 0.18 + f * 0.04 + vDensity * 0.05), sat * 0.95, lit + 0.05);
    vec3 spectrum = mix(iri, iri2, 0.28 + fres * 0.35 + vRarity * 0.2 + vStress * 0.15);

    float key = 0.38 + 0.72 * clamp(dot(n, normalize(vec3(0.35, 0.8, 0.45))), 0.0, 1.0);
    // Base species color mutates toward living spectrum with stress/health.
    float skinMix = 0.28 + vRarity * 0.35 + fres * 0.18 + vStress * 0.2 + (1.0 - health) * 0.12;
    vec3 body = mix(vColor * tex, spectrum, clamp(skinMix, 0.0, 0.92)) * key;

    // Degraded (low biomass) skin desaturates + browns — food state, not paint.
    vec3 degrade = mix(body, hsl2rgb(fract(vSecHue + 0.05), 0.25, 0.28), hunger * 0.55 * (1.0 - vRoot));
    body = mix(body, degrade, hunger * 0.65);

    // Buried root: dark mycelial mat.
    vec3 rootCol = mix(vColor * 0.32, hsl2rgb(fract(vSecHue + 0.08), 0.4, 0.2), 0.55);
    body = mix(body, rootCol, vRoot * 0.88);

    float pulse = 0.45 + 0.55 * sin(uTime * 2.0 + vUp * 5.5 + f * 2.0 + vRarity * 1.5 + vStress);
    float glow = vGlow * (0.18 + 0.88 * vUp) * pulse
               * (0.5 + 0.85 * uChaos + contactFlash * 0.5 + health * 0.25)
               * (1.0 - vRoot * 0.75);
    vec3 glowCol = mix(vColor * vec3(1.25, 1.5, 2.0), spectrum * 1.4, 0.5 + vRarity * 0.35 + vStress * 0.2);

    vec3 rim = spectrum * fres * (0.65 + vRarity * 0.95 + contactFlash * 0.6 + vStress * 0.25) * (1.0 - vRoot * 0.55);
    float spore = pow(max(0.0, 0.5 + 0.5 * f2), 2.8) * (0.18 + vRarity * 0.65 + health * 0.2) * pulse * vUp;
    vec3 sporeCol = hsl2rgb(fract(viewHue + 0.12), 0.88, 0.6) * spore;

    // Contact alarm flash + density brace tint (crowded cells go cooler).
    vec3 col = body + glowCol * glow + rim + sporeCol;
    col += spectrum * contactFlash * 0.28 * vUp;
    col = mix(col, col * vec3(0.85, 1.05, 1.15), vDensity * 0.2);

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
  // ── USER ecology: LIVE mutable fields — food, capacity, overgraze pressure (not paint). ──
  private readonly biomass: Float32Array;
  /** Per-cell carrying capacity from edaphic quality (fixed at construction). */
  private readonly capacity: Float32Array;
  /** Overgraze residual 0..1 — suppresses regrowth until it decays (responsive debt). */
  private readonly pressure: Float32Array;
  /** Fixed edaphic nutrient quality 0..1 per cell (biome/position). */
  private readonly quality: Float32Array;
  private readonly biomassTex: THREE.DataTexture;
  private biomassTotal = 0;
  private biomassCells = 0;
  private biomassDirty = true;
  private texAccum = 0;
  /** Last climate scalars from update — drive regrowth (adaptive to chaos/entropy). */
  private climateChaos = 0;
  private climateEntropy = 0;

  // Multi-point ragdoll springs (one per contact slot).
  private readonly contactDisp = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactVel = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactTarget = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactPX = new Float32Array(FLORA_CONTACT_SLOTS);
  private readonly contactPZ = new Float32Array(FLORA_CONTACT_SLOTS);

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
      // Higher acceptance → denser living field (still thinned by paths/glades).
      const accept = 0.12 + 0.88 * Math.pow(clump, 1.45);
      if (hash(k * 3) > accept) continue;

      const biome = biomeAt(x, z);
      const sp = AlienFlora.pickSpecies(biome, k);
      const s = species[sp]!;
      const rRoll = hash(k * 41 + 77);
      const rarity =
        rRoll > 0.985
          ? 0.85 + hash(k * 43) * 0.15 // legendary ~1.5%
          : rRoll > 0.9
            ? 0.45 + hash(k * 43) * 0.35 // uncommon ~8.5%
            : s.rarityBias * (0.08 + hash(k * 47) * 0.3);
      // Compact stocky scale — cool motion, not "everything is longer."
      const giant = hash(k * 23 + 29) > 0.96 ? 1.45 + hash(k * 23 + 31) * 0.55 : 1;
      const scale = s.size * (0.55 + hash(k * 5 + 11) * 0.95) * giant * (1 + rarity * 0.18);
      const yaw = hash(k * 5 + 13) * TAU;
      // Modest lean only — roots stay seated; motion lives in the shader spin.
      const tilt = (hash(k * 5 + 17) - 0.5) * (0.1 + hash(k * 5 + 19) * 0.12);
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

    // Operational ecology grids: capacity + quality from edaphics; biomass starts at capacity.
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
      // Capacity 0.55..1.0 — richer edaphics hold more food (falsifiable vs barren cells).
      const cap = 0.55 + 0.45 * q;
      this.capacity[i] = cap;
      this.biomass[i] = cap;
      this.biomassTotal += cap;
      this.biomassCells++;
    }
    const texData = new Uint8Array(cells * 4);
    const densScale = this.maxDensity > 0 ? 1 / this.maxDensity : 0;
    for (let i = 0; i < cells; i++) {
      texData[i * 4] = Math.round((this.biomass[i] ?? 0) * 255); // R = food/health
      texData[i * 4 + 1] = Math.round((this.density[i] ?? 0) * densScale * 255); // G = crowd brace
      texData[i * 4 + 2] = Math.round((this.pressure[i] ?? 0) * 255); // B = overgraze debt
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
    for (let fam = 0; fam < FAMILY_COUNT; fam++) {
      const list = perFamily[fam]!;
      if (list.length === 0) continue;
      const fmly = this.families[fam]!;
      const geo = fmly.geo.clone();
      const n = list.length;
      const params = new Float32Array(n * 4);
      const meta = new Float32Array(n * 4);
      const colors = new Float32Array(n * 3);
      const mesh = new THREE.InstancedMesh(geo, this.material, n);
      mesh.frustumCulled = false;
      for (let i = 0; i < n; i++) {
        const pl = list[i]!;
        const s = species[pl.sp]!;
        // Seat origin into the soil so curved roots bury; GPU adds the same living-ground displacement.
        const gy = baseTerrainHeightAt(pl.x, pl.z) - ROOT_SINK;
        pos.set(pl.x, gy, pl.z);
        // Follow terrain slope gently so the collar kisses the land without extreme lean.
        const dhx = baseTerrainHeightAt(pl.x + 1, pl.z) - baseTerrainHeightAt(pl.x - 1, pl.z);
        const dhz = baseTerrainHeightAt(pl.x, pl.z + 1) - baseTerrainHeightAt(pl.x, pl.z - 1);
        const groundTiltX = Math.max(-0.35, Math.min(0.35, -dhz * 0.35));
        const groundTiltZ = Math.max(-0.35, Math.min(0.35, dhx * 0.35));
        e.set(
          groundTiltX + Math.sin(pl.yaw) * pl.tilt,
          pl.yaw,
          groundTiltZ + Math.cos(pl.yaw) * pl.tilt,
        );
        q.setFromEuler(e);
        scl.setScalar(pl.scale);
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
        // Wide phase + spatial salt so neighbors never lockstep-thrash through each other.
        params[o4] = hash(pl.sp * 13 + i * 7) * TAU + pl.x * 0.041 + pl.z * 0.037;
        params[o4 + 1] = s.swayFreq * (0.7 + hash(i * 73 + pl.sp) * 2.1);
        params[o4 + 2] = Math.min(1, s.glow + hash(i * 79 + pl.sp) * 0.4 + pl.rarity * 0.3);
        params[o4 + 3] = fmly.height;

        // aMeta: rarity, stiffness, secondaryHue, reactGain
        meta[o4] = pl.rarity;
        meta[o4 + 1] = 0.12 + hash(i * 83 + pl.sp) * 1.15; // stiffness — softer tips thrash more
        meta[o4 + 2] = (hueJit + 0.18 + pl.rarity * 0.25 + hash(i * 89) * 0.25) % 1;
        meta[o4 + 3] = 0.7 + hash(i * 91 + pl.sp) * 1.1 + pl.rarity * 0.85; // contact react

        const o3 = i * 3;
        colors[o3] = col.r;
        colors[o3 + 1] = col.g;
        colors[o3 + 2] = col.b;
      }
      geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
      geo.setAttribute('aMeta', new THREE.InstancedBufferAttribute(meta, 4));
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  /** Map world (x,z) → density-grid index, or −1 if outside. */
  private gridIndex(x: number, z: number): number {
    const ix = Math.floor((x + this.gridHalf) / this.cell);
    const iz = Math.floor((z + this.gridHalf) / this.cell);
    if (ix < 0 || iz < 0 || ix >= this.gridN || iz >= this.gridN) return -1;
    return iz * this.gridN + ix;
  }

  /**
   * Nine curved silhouettes + buried roots. Compact heights (stocky, not tall poles).
   * Motion lives in the shader; base meshes stay short and connected.
   */
  private static buildFamilies(): Family[] {
    const fams: Family[] = [];

    // 0 SPIRE — short curved needle + crown
    {
      const stem = lathe(
        [
          [0.02, 0.0],
          [0.32, 0.25],
          [0.4, 0.85],
          [0.34, 1.6],
          [0.22, 2.4],
          [0.1, 3.0],
          [0.04, 3.35],
        ],
        16,
      );
      const crown = new THREE.SphereGeometry(0.38, 12, 10);
      crown.scale(1.35, 0.65, 1.35);
      crown.translate(0, 3.25, 0);
      const geo = adoptMerged([stem, crown, rootBulb(0.4, 0.5)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 1 WHIP — compact helix + nodules
    {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const t = i / 36;
        const y = t * 3.5;
        const a = t * Math.PI * 4.0;
        const r = 0.28 * (1 - t * 0.7) + 0.06;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.11, 7, false);
      const n1 = new THREE.SphereGeometry(0.3, 10, 8);
      n1.scale(1.3, 0.7, 1.3);
      n1.translate(0.25, 1.1, 0.05);
      const n2 = new THREE.SphereGeometry(0.24, 10, 8);
      n2.scale(1.2, 0.65, 1.2);
      n2.translate(-0.2, 2.15, 0.1);
      const n3 = new THREE.SphereGeometry(0.18, 9, 7);
      n3.translate(0.08, 3.15, -0.06);
      const geo = adoptMerged([tube, n1, n2, n3, rootBulb(0.34, 0.48)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 2 POD — low urn fruiting body
    {
      const body = lathe(
        [
          [0.15, 0.0],
          [0.65, 0.2],
          [0.88, 0.55],
          [0.95, 0.9],
          [0.75, 1.2],
          [0.4, 1.4],
          [0.18, 1.55],
        ],
        18,
      );
      const lip = new THREE.TorusGeometry(0.38, 0.06, 8, 16);
      lip.rotateX(Math.PI / 2);
      lip.translate(0, 1.48, 0);
      const geo = adoptMerged([body, lip, rootBulb(0.5, 0.45)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 3 BLADE — short soft sail
    {
      const sail = lathe(
        [
          [0.02, 0.0],
          [0.18, 0.3],
          [0.5, 0.9],
          [0.72, 1.6],
          [0.78, 2.2],
          [0.55, 2.7],
          [0.2, 3.05],
          [0.02, 3.2],
        ],
        14,
      );
      sail.scale(0.4, 1, 1.0);
      const geo = adoptMerged([sail, rootBulb(0.32, 0.48)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 4 CORAL — squat torus-knot + bulbs
    {
      const core = new THREE.TorusKnotGeometry(0.48, 0.14, 56, 8, 2, 3);
      core.scale(0.95, 1.15, 0.95);
      core.translate(0, 1.55, 0);
      const s1 = new THREE.SphereGeometry(0.26, 10, 8);
      s1.translate(0.48, 1.0, 0.12);
      const s2 = new THREE.SphereGeometry(0.22, 9, 7);
      s2.translate(-0.4, 1.9, -0.15);
      const s3 = new THREE.SphereGeometry(0.18, 9, 7);
      s3.translate(0.15, 2.55, 0.22);
      const geo = adoptMerged([core, s1, s2, s3, rootBulb(0.38, 0.5)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 5 SHARD — short curved crystal
    {
      const crystal = lathe(
        [
          [0.05, 0.0],
          [0.42, 0.35],
          [0.5, 0.95],
          [0.38, 1.7],
          [0.48, 2.35],
          [0.28, 2.9],
          [0.07, 3.3],
        ],
        12,
      );
      const tip = new THREE.SphereGeometry(0.16, 10, 8);
      tip.scale(0.75, 1.2, 0.75);
      tip.translate(0, 3.35, 0);
      const geo = adoptMerged([crystal, tip, rootBulb(0.36, 0.48)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 6 HELIX — short coil + orbs
    {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const t = i / 36;
        const y = t * 3.2;
        const a = t * Math.PI * 5.0;
        const r = 0.42 * (1 - t * 0.65) + 0.1;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.14, 8, false);
      const orb1 = new THREE.SphereGeometry(0.28, 10, 8);
      orb1.translate(0.35, 0.95, 0.08);
      const orb2 = new THREE.SphereGeometry(0.24, 10, 8);
      orb2.translate(-0.28, 1.85, 0.14);
      const orb3 = new THREE.SphereGeometry(0.2, 9, 7);
      orb3.translate(0.15, 2.75, -0.1);
      const geo = adoptMerged([tube, orb1, orb2, orb3, rootBulb(0.38, 0.48)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 7 BUBBLE — low fruiting cluster
    {
      const main = new THREE.SphereGeometry(0.65, 14, 12);
      main.scale(1.2, 0.85, 1.2);
      main.translate(0, 0.7, 0);
      const a = new THREE.SphereGeometry(0.38, 12, 10);
      a.translate(0.5, 0.45, 0.18);
      const b = new THREE.SphereGeometry(0.34, 12, 10);
      b.translate(-0.45, 0.55, 0.3);
      const c = new THREE.SphereGeometry(0.3, 11, 9);
      c.translate(0.1, 1.1, -0.4);
      const ring = new THREE.TorusGeometry(0.44, 0.055, 8, 18);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, 1.15, 0);
      const geo = adoptMerged([main, a, b, c, ring, rootBulb(0.48, 0.42)]);
      fams.push({ geo, height: peakHeight(geo) });
    }

    // 8 FAN — short mineral sail
    {
      const sail = lathe(
        [
          [0.02, 0.0],
          [0.22, 0.25],
          [0.7, 0.75],
          [1.0, 1.4],
          [1.05, 2.0],
          [0.75, 2.5],
          [0.3, 2.85],
          [0.02, 3.0],
        ],
        16,
      );
      sail.scale(0.32, 1, 1);
      const jewel = new THREE.SphereGeometry(0.2, 10, 8);
      jewel.translate(0, 2.9, 0);
      const geo = adoptMerged([sail, jewel, rootBulb(0.34, 0.45)]);
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
        // Compact base size — thrash/spin live in the shader, not vertical stretch.
        size: 0.55 + hash(i * 31 + 7) * 1.25,
        swayFreq: 0.45 + hash(i * 37 + 11) * 2.6,
        glow: 0.45 + hash(i * 41 + 13) * 0.55,
        rarityBias: hash(i * 59 + 17) * 0.45,
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
    // Full ambient drive — field keeps spinning/thrashing hard.
    u['uWind']!.value = 0.7 + 1.0 * c + 0.15 * Math.sin(t * 0.41);
    u['uChaos']!.value = c;
    u['uTerrainEntropy']!.value = e;
    (u['uTerrainWind']!.value as THREE.Vector2).set(terrainWindX, terrainWindZ);

    // Per-slot underdamped springs — local thrash, not one global slab.
    const h = dt > 0.05 ? 0.05 : dt > 0 ? dt : 0;
    const K = 34;
    const DAMP = 6.5;
    const cx = u['uContactX']!.value as THREE.Vector4;
    const cz = u['uContactZ']!.value as THREE.Vector4;
    const cs = u['uContactS']!.value as THREE.Vector4;
    for (let i = 0; i < FLORA_CONTACT_SLOTS; i++) {
      this.contactTarget[i]! *= 0.84;
      this.contactVel[i]! +=
        (this.contactTarget[i]! - this.contactDisp[i]!) * K * h - this.contactVel[i]! * DAMP * h;
      this.contactDisp[i]! += this.contactVel[i]! * h;
      if (!Number.isFinite(this.contactDisp[i]!) || !Number.isFinite(this.contactVel[i]!)) {
        this.contactDisp[i] = 0;
        this.contactVel[i] = 0;
      }
      const d = this.contactDisp[i]!;
      this.contactDisp[i] = d < -1.2 ? -1.2 : d > 1.6 ? 1.6 : d;
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
        const bm = this.biomass;
        const densScale = this.maxDensity > 0 ? 1 / this.maxDensity : 0;
        for (let i = 0; i < bm.length; i++) {
          data[i * 4] = Math.round((bm[i] ?? 0) * 255);
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
   * Effective food field for chemotaxis: biomass × edaphic quality × (1 − overgraze penalty).
   * Falsifiable vs biomassAt: foodAt ≤ biomassAt; richer biomes rank higher at equal biomass.
   * Bilinear, O(1), pure.
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
    const fx0 = f00 + (f10 - f00) * tx;
    const fx1 = f01 + (f11 - f01) * tx;
    return fx0 + (fx1 - fx0) * tz;
  }

  /** Read-only overgraze residual at cell containing (x,z). O(1). */
  pressureAt(x: number, z: number): number {
    const gi = this.gridIndex(x, z);
    if (gi < 0) return 0;
    return this.pressure[gi] ?? 0;
  }

  /** Read-only edaphic quality at cell containing (x,z). O(1). */
  qualityAt(x: number, z: number): number {
    const gi = this.gridIndex(x, z);
    if (gi < 0) return 0;
    return this.quality[gi] ?? 0;
  }

  /** Read-only carrying capacity at cell containing (x,z). O(1). */
  capacityAt(x: number, z: number): number {
    const gi = this.gridIndex(x, z);
    if (gi < 0) return 0;
    return this.capacity[gi] ?? 0;
  }

  /**
   * USER ecology — graze: biomass → food energy. Yield scales with edaphic quality (richer biomes
   * feed more per unit biomass). Stamps overgraze pressure that slows later recovery. Deterministic.
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
    // Overgraze debt — real recovery suppression (not a visual flag).
    const cap = Math.max(0.05, this.capacity[gi] ?? 1);
    const stamp = (eaten / cap) * PRESSURE_STAMP;
    const pr = (this.pressure[gi] ?? 0) + stamp;
    this.pressure[gi] = pr > 1 ? 1 : pr;
    this.biomassDirty = true;
    // Richer edaphics yield more energy per unit eaten (falsifiable: qualityAt ↑ ⇒ yield ↑).
    const q = this.quality[gi] ?? 0.5;
    return eaten * GRAZE_YIELD * (0.65 + 0.55 * q);
  }

  /**
   * Regrow toward per-cell CAPACITY with: logistic growth, neighbor seed, overgraze debt,
   * climate (chaos/entropy), and organism-intelligence adaptive gain. Deterministic O(cells).
   */
  private regrow(dt: number): void {
    const h = dt > 0.05 ? 0.05 : dt > 0 ? dt : 0;
    if (h <= 0) return;
    const bm = this.biomass;
    const den = this.density;
    const capArr = this.capacity;
    const press = this.pressure;
    const n = this.gridN;
    const intelligence = this.intelligence;
    const adaptiveGain = intelligence?.enabled
      ? 1 +
        Math.min(
          0.35,
          intelligence.resourcePressure * 0.2 +
            intelligence.forecast * 0.1 +
            intelligence.confidence * 0.05,
        )
      : 1;
    // Climate: entropy throttles recovery; high chaos stresses regrowth (defensible stress model).
    const climateGain =
      (1 - 0.45 * this.climateEntropy) *
      (1 - 0.28 * Math.max(0, this.climateChaos - 0.25));
    const climate = climateGain < 0.2 ? 0.2 : climateGain > 1.2 ? 1.2 : climateGain;
    const decay = Math.exp(-PRESSURE_DECAY * h);
    for (let i = 0; i < bm.length; i++) {
      if ((den[i] ?? 0) <= 0) continue;
      // Pressure residual decays every frame even at full capacity.
      const p0 = press[i] ?? 0;
      if (p0 > 1e-6) {
        press[i] = p0 * decay;
        this.biomassDirty = true;
      }
      const cap = capArr[i] ?? 1;
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
      const pDebt = 1 - 0.55 * (press[i] ?? 0);
      const raw =
        (REGROW_SEED * cap + REGROW_RATE * b * room + REGROW_NEIGHBOR * nMean * room) *
        h *
        adaptiveGain *
        climate *
        pDebt;
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
      if (str > this.contactTarget[i]!) {
        this.contactVel[i]! += (str - this.contactTarget[i]!) * 6;
        this.contactTarget[i] = str;
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
