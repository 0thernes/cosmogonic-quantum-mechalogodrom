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
 * `ShaderMaterial`. Wind sway, bioluminescence, mineral iridescence, and LOCAL multi-point
 * ragdoll contact all run on the GPU. Per-frame CPU work is O(biomass-grid cells) + O(4 contacts)
 * and never scales with plant count.
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

const flora_vert = /* glsl */ `
  attribute vec4 aParams;   // x: phase, y: swayFreq, z: glow, w: localHeight
  attribute vec4 aMeta;     // x: rarity, y: stiffness, z: secondaryHue, w: reactGain
  attribute vec3 aColor;
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
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying vec3 vWorldP;
  ${TERRAIN_DEFORMATION_GLSL}

  // Local radial falloff — tight, not lawn-wide (CONTACT_RADIUS² injected from TS).
  float localContact(vec2 base, float cx, float cz, float strength, float phase, float stiff, float react) {
    if (strength < 0.001) return 0.0;
    vec2 d = base - vec2(cx, cz);
    float d2 = dot(d, d);
    // Hard stop past CONTACT_RADIUS; full only in the inner ~5u so individuals thrash, not whole regions.
    float fall = smoothstep(${CONTACT_RADIUS2.toFixed(1)}, 25.0, d2);
    if (fall <= 0.0) return 0.0;
    // Per-plant desync: phase + stiffness so neighbors never move as one solid plate.
    float personal = 0.42 + 0.58 * sin(phase * 2.7 + stiff * 5.1 + base.x * 0.31 + base.y * 0.29);
    // Weirder ragdoll impulse: underdamped wobble + delayed tip (handled outside via up²).
    float wobble = 0.75 + 0.35 * sin(uTime * (3.2 + stiff * 4.0) + phase * 1.9);
    return strength * fall * personal * react * wobble;
  }

  void main() {
    vColor = aColor;
    vGlow = aParams.z;
    vRarity = aMeta.x;
    vSecHue = aMeta.z;
    float up = clamp(position.y / max(aParams.w, 0.001), 0.0, 1.0);
    vUp = up;

    float phase = aParams.x;
    float freq = aParams.y;
    float stiff = clamp(aMeta.y, 0.08, 1.4);
    float react = clamp(aMeta.w, 0.2, 2.2);
    float rarity = aMeta.x;

    // Wind + chaos lean (tip-weighted). Stiffer plants resist; rare plants whip harder.
    float soft = 1.0 / stiff;
    float bend = up * up * (uWind + uChaos * 0.8) * soft * (0.85 + rarity * 0.55);
    float turb = up * up * uChaos * 0.6 * soft;
    vec3 p = position;
    // Multi-harmonic stalk thrash — SEM-spicule / crystal-fan energy, not a single sine.
    p.x += sin(uTime * freq + phase) * bend * 2.6
         + sin(uTime * freq * 3.7 + phase * 2.1) * turb * 1.2
         + sin(uTime * freq * 7.1 + phase * 0.4) * turb * 0.35 * rarity;
    p.z += cos(uTime * freq * 0.8 + phase * 1.3) * bend * 2.1
         + cos(uTime * freq * 2.9 + phase * 1.7) * turb * 1.0
         + cos(uTime * freq * 5.3 + phase * 1.1) * turb * 0.3 * rarity;
    p.y += sin(uTime * freq * 0.5 + phase) * up * 0.18 * (uWind + uChaos)
         + sin(uTime * freq * 4.3 + phase) * up * 0.05 * uChaos
         + sin(uTime * freq * 9.0 + phase * 2.0) * up * 0.04 * rarity;

    // Rare crystal morph: mid-stalk breathing / flare (still rooted at base).
    float morph = rarity * up * (0.06 + 0.1 * sin(uTime * (1.1 + freq * 0.4) + phase));
    p.x *= 1.0 + morph * 0.9;
    p.z *= 1.0 + morph * 0.9;
    p.y *= 1.0 + morph * 0.35;

    // USER ecology: shrink by cell BIOMASS — grazed stub vs regrown full.
    vec2 bmBase = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
    float biomass = texture2D(uBiomass, (bmBase + 0.5 * uGridExtent) / uGridExtent).r;
    float grow = 0.12 + 0.88 * biomass;
    // Neighbor density (biomass) modulates how "alive/coupled" the plant feels.
    float neighbor = biomass; // bilinear already; denser cells = more mycelial coupling later
    // PORTAL DEATH scorch.
    if (uScorchRadius > 0.0) {
      float scorchD = length(bmBase - uScorchCenter);
      grow *= smoothstep(uScorchRadius * 0.82, uScorchRadius, scorchD);
    }
    p *= grow;
    vGlow *= 0.3 + 0.7 * biomass;

    vec4 worldPosition = instanceMatrix * vec4(p, 1.0);
    worldPosition.y += cqmTerrainDisplacement(
      vec3(bmBase.x, 0.0, bmBase.y),
      uTime,
      uChaos,
      uTerrainEntropy,
      uTerrainWind
    );

    // ── MULTI-POINT LOCAL RAGDOLL (weirder than a single push) ──
    // Each seed contributes only nearby. Tip lags, mid twists, root mostly anchors.
    float c0 = localContact(bmBase, uContactX.x, uContactZ.x, uContactS.x, phase, stiff, react);
    float c1 = localContact(bmBase, uContactX.y, uContactZ.y, uContactS.y, phase + 1.7, stiff, react);
    float c2 = localContact(bmBase, uContactX.z, uContactZ.z, uContactS.z, phase + 3.1, stiff, react);
    float c3 = localContact(bmBase, uContactX.w, uContactZ.w, uContactS.w, phase + 4.9, stiff, react);
    float cSum = c0 + c1 + c2 + c3;
    vContactLive = clamp(cSum, 0.0, 2.5);

    // Direction: weighted push-away from active seeds (not one global centroid).
    vec2 push = vec2(0.0);
    float wsum = 0.001;
    if (c0 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.x, uContactZ.x);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c0;
      wsum += c0;
    }
    if (c1 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.y, uContactZ.y);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c1;
      wsum += c1;
    }
    if (c2 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.z, uContactZ.z);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c2;
      wsum += c2;
    }
    if (c3 > 0.0) {
      vec2 a = bmBase - vec2(uContactX.w, uContactZ.w);
      float inv = inversesqrt(max(dot(a, a), 1.0));
      push += a * inv * c3;
      wsum += c3;
    }
    push /= wsum;

    // Tip lag (up³) + mid twist (sin) + root damp (1-up) — ragdoll chain feel.
    float tip = up * up * up;
    float mid = up * up * (1.0 - up) * 4.0;
    float amp = (3.4 + uChaos * 4.0 + rarity * 2.2) * soft;
    // Dense neighbor biomass = mycelial network tug (plants lean with their grove, not as a slab).
    float grovePull = neighbor * cSum * 0.55 * mid;
    worldPosition.xz += push * (cSum * tip * amp + grovePull);
    // Orthogonal whip (stranger than pure radial flee).
    vec2 ortho = vec2(-push.y, push.x);
    worldPosition.xz += ortho * sin(uTime * (5.0 + stiff * 3.0) + phase) * cSum * mid * amp * 0.55;
    // Vertical: lift + delayed quiver (tip overshoots).
    worldPosition.y += cSum * tip * (1.1 + uChaos * 1.6 + rarity * 1.2);
    worldPosition.y += sin(cSum * 9.0 + uTime * 2.7 + phase) * cSum * tip * (0.9 + uChaos * 1.4);
    // Rare plants fling harder and hold a residual shimmer after contact.
    worldPosition.y += rarity * cSum * mid * 0.6 * sin(uTime * 11.0 + phase * 3.0);

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
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying vec3 vWorldP;

  // Cheap iridescent / mineral / SEM procedural — no textures, fully unique per fragment.
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

  void main() {
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(vViewDir);
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);

    // Procedural micro-texture: crystal striations + SEM pores + mycelial freckle.
    float stria = sin(vWorldP.y * 14.0 + vWorldP.x * 3.5) * sin(vWorldP.z * 11.0 - vWorldP.y * 6.0);
    float pores = sin(vWorldP.x * 37.0 + vWorldP.z * 41.0) * sin(vWorldP.y * 29.0);
    float freck = sin((vWorldP.x + vWorldP.z) * 53.0 + uTime * 0.7) * 0.5 + 0.5;
    float tex = 0.72 + 0.18 * stria + 0.12 * pores + 0.08 * freck * vRarity;

    // View-dependent iridescence (holographic / oil-slick mineral — not a flat solid).
    float viewHue = fract(vSecHue + fres * 0.22 + vUp * 0.08 + stria * 0.04 + uTime * 0.015);
    vec3 iri = hsl2rgb(viewHue, 0.55 + vRarity * 0.35, 0.48 + fres * 0.18);
    // Secondary band (rare plants carry twin-spectrum shimmer).
    vec3 iri2 = hsl2rgb(fract(viewHue + 0.33 + vRarity * 0.1), 0.7, 0.55);
    vec3 spectrum = mix(iri, iri2, fres * (0.35 + vRarity * 0.5));

    float key = 0.32 + 0.68 * clamp(dot(n, normalize(vec3(0.35, 0.8, 0.45))), 0.0, 1.0);
    vec3 base = mix(vColor * tex, spectrum, 0.22 + vRarity * 0.45 + fres * 0.25) * key;

    // Bioluminescence rides UP the stalk; chaos + contact excite it.
    float pulse = 0.55 + 0.45 * sin(uTime * 1.7 + vUp * 6.2831 + vRarity * 2.0);
    float contactFlash = clamp(vContactLive, 0.0, 1.5) * (0.25 + vRarity * 0.4);
    float glow = vGlow * (0.18 + 0.82 * vUp) * pulse * (0.5 + 0.9 * uChaos + contactFlash);
    vec3 glowCol = mix(vColor * vec3(1.25, 1.55, 1.95), spectrum * vec3(1.4, 1.2, 1.8), vRarity);
    glowCol += vec3(0.04, 0.10, 0.16);

    // Crystal-edge rim + rare golden spore dust (reference: iridescent organism + mineral fans).
    vec3 rim = spectrum * fres * (0.55 + vRarity * 0.9 + contactFlash * 0.5);
    float spore = pow(max(0.0, pores), 4.0) * vRarity * (0.4 + 0.6 * pulse);
    vec3 sporeCol = hsl2rgb(fract(vSecHue + 0.12), 0.85, 0.62) * spore;

    vec3 col = base + glowCol * glow + rim + sporeCol;
    // Contact makes plants briefly "wake" (brighter, more metallic) without solid color wash.
    col += spectrum * contactFlash * 0.18 * vUp;
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
  // ── USER ecology: the LIVE, mutable biomass life-cycle (grazed → eaten stub; regrows → full). ──
  private readonly biomass: Float32Array;
  private readonly biomassTex: THREE.DataTexture;
  private biomassTotal = 0;
  private biomassCells = 0;
  private biomassDirty = true;
  private texAccum = 0;

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
      const giant = hash(k * 23 + 29) > 0.965 ? 2.4 + hash(k * 23 + 31) * 2.8 : 1;
      // Rare plants slightly larger / more food-bearing silhouette.
      const scale = s.size * (0.44 + hash(k * 5 + 11) * 1.45) * giant * (1 + rarity * 0.35);
      const yaw = hash(k * 5 + 13) * TAU;
      const tilt = (hash(k * 5 + 17) - 0.5) * (0.28 + hash(k * 5 + 19) * 0.42);
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

    // Live BIOMASS field starts FULL wherever plants were placed.
    this.biomass = new Float32Array(this.gridN * this.gridN);
    for (let i = 0; i < this.biomass.length; i++) {
      const occupied = (this.density[i] ?? 0) > 0;
      this.biomass[i] = occupied ? 1 : 0;
      if (occupied) {
        this.biomassTotal += 1;
        this.biomassCells++;
      }
    }
    const texData = new Uint8Array(this.gridN * this.gridN * 4);
    for (let i = 0; i < this.biomass.length; i++) {
      texData[i * 4] = Math.round((this.biomass[i] ?? 0) * 255);
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
        const gy = baseTerrainHeightAt(pl.x, pl.z) - 0.6;
        pos.set(pl.x, gy, pl.z);
        const dhx = baseTerrainHeightAt(pl.x + 1, pl.z) - baseTerrainHeightAt(pl.x - 1, pl.z);
        const dhz = baseTerrainHeightAt(pl.x, pl.z + 1) - baseTerrainHeightAt(pl.x, pl.z - 1);
        const groundTiltX = -dhz * 0.45;
        const groundTiltZ = dhx * 0.45;
        e.set(
          groundTiltX + Math.sin(pl.yaw) * pl.tilt,
          pl.yaw,
          groundTiltZ + Math.cos(pl.yaw) * pl.tilt,
        );
        q.setFromEuler(e);
        scl.setScalar(pl.scale);
        m.compose(pos, q, scl);
        mesh.setMatrixAt(i, m);

        // Wild palettes — not lawn-green solids. Biome band + strong jitter + rarity spectral kick.
        const hueJit =
          (s.hue +
            (hash(pl.sp * 31 + i) - 0.5) * 0.22 +
            0.05 * Math.sin(pl.x * 0.009 + pl.z * 0.011) +
            pl.rarity * 0.12 +
            1) %
          1;
        const sat = Math.min(0.99, s.sat + (hash(i * 97 + pl.sp) - 0.5) * 0.28 + pl.rarity * 0.2);
        const light = Math.min(0.78, s.light + hash(i * 101 + pl.sp) * 0.22 + pl.rarity * 0.12);
        col.setHSL(hueJit, sat, light);
        // Legendary plants get a second-channel push toward holographic cyan/magenta/gold.
        if (pl.rarity > 0.8) {
          const kick = hash(i * 113 + pl.sp);
          if (kick < 0.33) col.lerp(new THREE.Color(0.3, 0.95, 1.0), 0.35);
          else if (kick < 0.66) col.lerp(new THREE.Color(1.0, 0.35, 0.85), 0.35);
          else col.lerp(new THREE.Color(1.0, 0.82, 0.25), 0.35);
        }

        const o4 = i * 4;
        params[o4] = hash(pl.sp * 13 + i * 7) * TAU; // phase
        params[o4 + 1] = s.swayFreq * (0.55 + hash(i * 73 + pl.sp) * 1.55);
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
   * Nine alien silhouettes — compound SEM-spicule / crystal-fan / mycelial-orb / holographic stalk
   * geometries. Bases sit at local y=0. Not single bland primitives.
   */
  private static buildFamilies(): Family[] {
    const fams: Family[] = [];

    // 0 SPIRE — needle with crystal side blades (mineral fan energy)
    {
      const stem = new THREE.ConeGeometry(0.42, 6.2, 7, 2);
      stem.translate(0, 3.1, 0);
      const bladeA = new THREE.BoxGeometry(0.08, 2.4, 1.1, 1, 3, 1);
      bladeA.translate(0.35, 3.8, 0);
      bladeA.rotateZ(0.35);
      const bladeB = bladeA.clone();
      bladeB.rotateY((Math.PI * 2) / 3);
      const bladeC = bladeA.clone();
      bladeC.rotateY((Math.PI * 4) / 3);
      const tip = new THREE.OctahedronGeometry(0.35, 0);
      tip.scale(0.6, 1.4, 0.6);
      tip.translate(0, 6.1, 0);
      fams.push({ geo: adoptMerged([stem, bladeA, bladeB, bladeC, tip]), height: 6.5 });
    }

    // 1 WHIP — tapered tendril + mid nodules (SEM organic)
    {
      const stem = new THREE.CylinderGeometry(0.04, 0.38, 8.2, 6, 4);
      stem.translate(0, 4.1, 0);
      const n1 = new THREE.SphereGeometry(0.28, 7, 5);
      n1.scale(1.2, 0.7, 1.2);
      n1.translate(0.15, 2.4, 0);
      const n2 = new THREE.SphereGeometry(0.22, 7, 5);
      n2.scale(1.1, 0.65, 1.1);
      n2.translate(-0.12, 4.6, 0.1);
      const n3 = new THREE.SphereGeometry(0.16, 6, 4);
      n3.translate(0.08, 6.5, -0.05);
      fams.push({ geo: adoptMerged([stem, n1, n2, n3]), height: 8.2 });
    }

    // 2 POD — knobby ground bulb cluster (SEM fruiting body)
    {
      const core = new THREE.IcosahedronGeometry(1.0, 1);
      core.scale(1.15, 1.05, 1.15);
      core.translate(0, 1.1, 0);
      const budA = new THREE.SphereGeometry(0.45, 8, 6);
      budA.translate(0.7, 0.55, 0.2);
      const budB = new THREE.SphereGeometry(0.38, 8, 6);
      budB.translate(-0.55, 0.7, 0.45);
      const budC = new THREE.SphereGeometry(0.32, 7, 5);
      budC.translate(0.15, 1.55, -0.55);
      const pore = new THREE.TorusGeometry(0.35, 0.08, 5, 10);
      pore.rotateX(Math.PI / 2);
      pore.translate(0, 1.9, 0);
      fams.push({ geo: adoptMerged([core, budA, budB, budC, pore]), height: 2.4 });
    }

    // 3 BLADE — thin tall leaf fan with striated plate (mineral sheet)
    {
      const plate = new THREE.BoxGeometry(0.12, 5.2, 1.55, 1, 5, 2);
      plate.translate(0, 2.6, 0);
      const rib = new THREE.BoxGeometry(0.22, 5.0, 0.18, 1, 4, 1);
      rib.translate(0, 2.5, 0);
      const fringe = new THREE.ConeGeometry(0.55, 1.2, 5, 1);
      fringe.translate(0, 5.5, 0);
      fams.push({ geo: adoptMerged([plate, rib, fringe]), height: 6.1 });
    }

    // 4 CORAL — spiky diamond with satellite crystals
    {
      const core = new THREE.OctahedronGeometry(1.5, 1);
      core.scale(0.65, 2.1, 0.65);
      core.translate(0, 3.6, 0);
      const s1 = new THREE.TetrahedronGeometry(0.55, 0);
      s1.scale(0.7, 1.6, 0.7);
      s1.translate(0.7, 2.4, 0.2);
      const s2 = new THREE.TetrahedronGeometry(0.45, 0);
      s2.scale(0.7, 1.5, 0.7);
      s2.translate(-0.6, 4.2, -0.25);
      const s3 = new THREE.TetrahedronGeometry(0.4, 0);
      s3.scale(0.65, 1.4, 0.65);
      s3.translate(0.25, 5.5, 0.45);
      fams.push({ geo: adoptMerged([core, s1, s2, s3]), height: 7.4 });
    }

    // 5 SHARD — crystal tetra stack (mineral lattice)
    {
      const a = new THREE.TetrahedronGeometry(1.5, 0);
      a.scale(0.85, 1.9, 0.85);
      a.translate(0, 2.8, 0);
      const b = new THREE.TetrahedronGeometry(0.9, 0);
      b.scale(0.7, 1.5, 0.7);
      b.translate(0.35, 4.6, 0.1);
      b.rotateY(0.7);
      const c = new THREE.OctahedronGeometry(0.35, 0);
      c.translate(0, 5.9, 0);
      fams.push({ geo: adoptMerged([a, b, c]), height: 6.3 });
    }

    // 6 HELIX — twisted shell stalk + spore orbs (mycelial network vibe)
    {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const y = (i / 36) * 5.8;
        const a = i * 0.58;
        const r = 0.42 * (1 - i / 36) + 0.08;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.14, 6, false);
      const orb1 = new THREE.SphereGeometry(0.28, 8, 6);
      orb1.translate(0.35, 2.0, 0.1);
      const orb2 = new THREE.SphereGeometry(0.22, 7, 5);
      orb2.translate(-0.25, 3.8, 0.2);
      const orb3 = new THREE.SphereGeometry(0.18, 7, 5);
      orb3.translate(0.15, 5.2, -0.15);
      fams.push({ geo: adoptMerged([tube, orb1, orb2, orb3]), height: 5.8 });
    }

    // 7 BUBBLE — clustered porous orbs (SEM fruiting cluster / mycelial nodes)
    {
      const main = new THREE.SphereGeometry(0.75, 10, 8);
      main.scale(1.1, 0.9, 1.1);
      main.translate(0, 0.85, 0);
      const a = new THREE.SphereGeometry(0.42, 8, 6);
      a.translate(0.65, 0.55, 0.15);
      const b = new THREE.SphereGeometry(0.38, 8, 6);
      b.translate(-0.5, 0.7, 0.4);
      const c = new THREE.SphereGeometry(0.32, 7, 5);
      c.translate(0.1, 1.35, -0.5);
      const d = new THREE.SphereGeometry(0.25, 7, 5);
      d.translate(-0.35, 1.2, -0.25);
      const ring = new THREE.TorusGeometry(0.55, 0.06, 5, 12);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, 1.55, 0);
      fams.push({ geo: adoptMerged([main, a, b, c, d, ring]), height: 2.0 });
    }

    // 8 FAN — broad curved sail with radial ribs (mineral radial crystal)
    {
      const sail = new THREE.CylinderGeometry(0.02, 1.75, 4.6, 5, 2, true);
      sail.scale(1, 1, 0.22);
      sail.translate(0, 2.3, 0);
      const rib1 = new THREE.BoxGeometry(0.06, 4.2, 0.12, 1, 3, 1);
      rib1.translate(0, 2.2, 0.05);
      const rib2 = new THREE.BoxGeometry(0.05, 3.6, 0.1, 1, 2, 1);
      rib2.translate(0.4, 2.0, 0);
      rib2.rotateZ(-0.25);
      const rib3 = new THREE.BoxGeometry(0.05, 3.6, 0.1, 1, 2, 1);
      rib3.translate(-0.4, 2.0, 0);
      rib3.rotateZ(0.25);
      const base = new THREE.SphereGeometry(0.35, 7, 5);
      base.scale(1.2, 0.6, 0.8);
      base.translate(0, 0.25, 0);
      fams.push({ geo: adoptMerged([sail, rib1, rib2, rib3, base]), height: 4.7 });
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
        sat: 0.58 + hash(i * 23 + 3) * 0.4,
        light: 0.3 + hash(i * 29 + 5) * 0.34,
        size: 0.45 + hash(i * 31 + 7) * 2.4,
        swayFreq: 0.22 + hash(i * 37 + 11) * 2.2,
        glow: 0.25 + hash(i * 41 + 13) * 0.7,
        rarityBias: hash(i * 59 + 17) * 0.35,
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
    const u = this.material.uniforms;
    u['uTime']!.value = t;
    u['uWind']!.value = 0.32 + 0.7 * c + 0.08 * Math.sin(t * 0.31);
    u['uChaos']!.value = c;
    u['uTerrainEntropy']!.value = Math.max(0, Math.min(1, terrainEntropy));
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
        for (let i = 0; i < bm.length; i++) data[i * 4] = Math.round((bm[i] ?? 0) * 255);
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
   * USER ecology — a creature GRAZES the plants at world (x,z): biomass eaten → food energy.
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
    this.biomassDirty = true;
    return eaten * GRAZE_YIELD;
  }

  /**
   * USER ecology — regrow biomass: logistic + reseed floor + neighbor-assisted recovery.
   * Dense live neighbors accelerate depleted cells (mycelial / root-network metaphor). Deterministic.
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
          0.35,
          intelligence.resourcePressure * 0.2 +
            intelligence.forecast * 0.1 +
            intelligence.confidence * 0.05,
        )
      : 1;
    for (let i = 0; i < bm.length; i++) {
      if ((den[i] ?? 0) <= 0) continue;
      const b = bm[i]!;
      if (b >= 1) continue;
      // Neighbor mean biomass (4-connected) — dense live neighbors seed recovery.
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
      const nb =
        b +
        (REGROW_SEED + REGROW_RATE * b * (1 - b) + REGROW_NEIGHBOR * nMean * (1 - b)) *
          h *
          adaptiveGain;
      const next = nb > 1 ? 1 : nb;
      bm[i] = next;
      this.biomassTotal += (bm[i] ?? 0) - b;
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
