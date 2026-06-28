/**
 * Instanced entity renderer (CONTRACTS V3.1, PANTHEON).
 *
 * Above the phone tier the per-entity `THREE.Mesh` draw path (1 draw call per
 * organism — fatal at 10,000) is replaced by InstancedMesh POOLS: one pool per
 * (cached geometry, transparency) pair, ≤ 80 pools total, each drawn in a single
 * call. The EntityManager facade is unchanged — every entity stays a real
 * `THREE.Mesh` carrying its own material and userData, it is simply never added
 * to the scene; this renderer mirrors the logical population into the pools once
 * per frame, AFTER every system that mutates entity visuals has run.
 *
 * Per-instance channels:
 * - **matrix** — composed from the data-mesh position/quaternion/scale
 *   (`updateMatrix()`; Euler→quaternion stays synced by three's onChange hooks).
 * - **color** — `instanceColor` (three built-in) from `material.color`.
 * - **emissive+alpha** — custom vec4 `instEmissive` attribute
 *   (rgb = `material.emissive · emissiveIntensity`, a = opacity), patched into
 *   the standard shader via `onBeforeCompile`: it REPLACES
 *   `totalEmissiveRadiance` and multiplies `diffuseColor.a`. Per-instance
 *   metalness/roughness are NOT representable — pools render at 0.5/0.5
 *   (documented visual compromise; emissive carries the identity anyway).
 *
 * Pool sizing: lazily constructed at `initialPoolCapacity` (uniform share ×
 * HEADROOM) and grown ×2 (event-driven, never per-frame churn) up to
 * `maxEntities` — a mutate-all collapsing the population into one pool is the
 * worst case and stays bounded. Rebuild is full each frame: O(2n) passes, zero
 * allocation in steady state, uploads clipped to the live instance range.
 *
 * Shadows: instanced pools cast none (the legacy path only ever shadowed the
 * first 120 organisms; at 5,000+ the map would drown). Environment shadows are
 * untouched.
 */
import * as THREE from 'three';
import { clamp01 } from '../math/scalar';
import { RENDER_MODES, RENDER_MODE_FX } from './constants';
import type { RenderMode } from './constants';
import type { Entity, SimContext } from '../types';

/** Capacity headroom multiplier over the uniform per-pool share. */
const HEADROOM = 4;

/** Pool-material base metalness/roughness (per-instance PBR is not representable — V3.1).
 *  Low metalness so the per-instance COLOR reads as pigment, not grey metal; moderate roughness
 *  for a glossy, saturated read. The reliquary shader overrides per material-class anyway. */
const POOL_METALNESS = 0.15;
const POOL_ROUGHNESS = 0.35;

/** Fixed translucent-pool blending opacity is carried per instance — this is the floor. */
const MIN_ALPHA = 0.05;

/**
 * Initial instance capacity for a pool: the uniform share of `maxEntities`
 * across `geoCount` geometries × {@link HEADROOM}, floored at 16. Pure — see
 * tests/instanced.test.ts. O(1).
 */
export function initialPoolCapacity(maxEntities: number, geoCount: number): number {
  if (geoCount < 1) return Math.max(16, maxEntities);
  return Math.max(16, Math.ceil((maxEntities / geoCount) * HEADROOM));
}

/**
 * Next pool capacity that fits `needed`: doubles from `current`, clamped to
 * `max`. Returns `current` when it already fits. Pure. O(log(max/current)).
 */
export function grownCapacity(current: number, needed: number, max: number): number {
  let c = Math.max(1, current);
  while (c < needed && c < max) c *= 2;
  return Math.min(Math.max(c, needed > max ? max : c), max);
}

/**
 * Pool slot key for a geometry index + transparency flag (two slots per
 * geometry: opaque, translucent). Pure. O(1).
 */
export function poolKey(geoIndex: number, transparent: boolean): number {
  return geoIndex * 2 + (transparent ? 1 : 0);
}

/** One InstancedMesh pool (lazily constructed). */
interface Pool {
  mesh: THREE.InstancedMesh;
  /** vec4 per instance: rgb = emissive·intensity, a = opacity. */
  emissive: THREE.InstancedBufferAttribute;
  /**
   * vec4 per instance: REAL packed vital signals driving the V-VITALS effect suite —
   * x = wealth (energy/100), y = senescence (age/life), z = neural firing (act), w = exertion
   * (speed). Written from {@link packVitals} in `sync`; each is a falsifiable readout, never decor.
   */
  vitals: THREE.InstancedBufferAttribute;
  /**
   * vec4 per instance: REAL social + quantum signals driving the V-VITALS2 suite — x = strategy
   * (coop/defect), y = payoff, z = community hue, w = quantum phase. Packed by {@link packVitals2}.
   */
  vitals2: THREE.InstancedBufferAttribute;
  capacity: number;
  /** Live instances written this frame (reset each sync). */
  used: number;
}

/** Shared per-frame shader uniforms (CONTRACTS V7-beyond). One bag linked into EVERY pool
 *  material's compiled shader, so a single per-frame write drives all pools — robust to pool
 *  growth/remorph (a new compile re-links the same uniform objects). */
interface ShaderUniforms {
  uTime: { value: number };
  uNightmare: { value: number };
  uChaos: { value: number };
  uBass: { value: number };
  /** Active render mode index (RENDER_MODES order) — drives the exotic fragment effects. */
  uMode: { value: number };
}

/** Speed→exertion normalizer: a damped-velocity magnitude of ~0.125 saturates the exertion lane. */
const VITAL_EXERTION_SCALE = 8;

/**
 * Pack an organism's REAL per-frame state into the `instVitals` vec4 that drives the V-VITALS GPU
 * effect suite — written allocation-free into `out[offset..offset+3]`:
 * - **x = wealth** `clamp01(energy/100)` (the market-behavior payoff) — phosphor gas + gilded shimmer;
 * - **y = senescence** `clamp01(age/life)` — ashen cataract + bit-glitch scramble;
 * - **z = neural firing** `clamp01(act)` (activation accumulator) — laser-dance synapse arcs + shardwarp;
 * - **w = exertion** `clamp01(speed × {@link VITAL_EXERTION_SCALE})` — hyperspace ionizing streaks.
 *
 * Every lane is finite and in `[0, 1]`: non-finite inputs and `life <= 0` are guarded (a bare
 * data-mesh without full `EntityData` packs zeros, never NaN), and each is clamped. Pure, no rng — so
 * the spectacle is a deterministic function of state, not decoration. O(1). See
 * tests/entity-vitals.test.ts.
 */
export function packVitals(
  out: Float32Array,
  offset: number,
  energy: number,
  age: number,
  life: number,
  act: number,
  speed: number,
): void {
  const a = Number.isFinite(age) ? age : 0;
  const l = Number.isFinite(life) && life > 0 ? life : 0;
  out[offset] = clamp01((Number.isFinite(energy) ? energy : 0) / 100); // x wealth
  out[offset + 1] = l > 0 ? clamp01(a / l) : 0; // y senescence
  out[offset + 2] = clamp01(Number.isFinite(act) ? act : 0); // z neural firing
  out[offset + 3] = clamp01((Number.isFinite(speed) ? speed : 0) * VITAL_EXERTION_SCALE); // w exertion
}

/** Golden-ratio hue hash → a stable, well-spread hue in [0,1) for each integer community index. */
const VITAL_COMMUNITY_HUE = 0.61803398875;
/** Prisoner's-Dilemma temptation payoff (T=5) — normalizes `payoff` into the [0,1] iridescence lane. */
const VITAL_PAYOFF_MAX = 5;
/** 1/2π — wraps the ever-advancing quantum phase `qP` into a [0,1) cycling lane. */
const VITAL_INV_TAU = 1 / (Math.PI * 2);

/**
 * Pack an organism's REAL social + quantum state into the `instVitals2` vec4 that drives the V-VITALS2
 * GPU effect suite — written allocation-free into `out[offset..offset+3]`:
 * - **x = strategy** `0|1` (the Prisoner's-Dilemma cooperator↔defector, flipped on a losing payoff) —
 *   cooperator halo vs defector barb-corona;
 * - **y = payoff** `clamp01(payoff / 5)` (last PD payoff in `{0,1,3,5}`) — payoff-swing iridescence;
 * - **z = community hue** `fract(setGroup × φ)` (the graph-mind louvain tribe index) — faction war-paint
 *   + in-tribe hive-resonance (same community ⇒ same hue ⇒ pulses in phase);
 * - **w = quantum phase** `fract(qP / 2π)` (advances every frame via the quantum behavior) —
 *   superposition probability shimmer.
 *
 * Every lane is finite and in `[0, 1]`: non-finite inputs and a negative community pack 0, and the
 * cyclic lanes wrap. Pure, no rng — the spectacle is a deterministic function of state. O(1). See
 * tests/entity-vitals2.test.ts.
 */
export function packVitals2(
  out: Float32Array,
  offset: number,
  strategy: number,
  payoff: number,
  setGroup: number,
  qP: number,
): void {
  out[offset] = strategy === 1 ? 1 : 0; // x strategy (defector = 1, cooperator/other = 0)
  out[offset + 1] = clamp01((Number.isFinite(payoff) ? payoff : 0) / VITAL_PAYOFF_MAX); // y payoff
  const g = Number.isFinite(setGroup) && setGroup >= 0 ? setGroup * VITAL_COMMUNITY_HUE : 0;
  out[offset + 2] = g - Math.floor(g); // z community hue (fract)
  const q = (Number.isFinite(qP) ? qP : 0) * VITAL_INV_TAU;
  out[offset + 3] = q - Math.floor(q); // w quantum phase (fract, wrapped)
}

/**
 * Patch a pool material with the per-instance emissive+alpha attribute (V3.1), the V7-beyond
 * shared-uniform block, the SIMULATION N(2) vertex-melt, AND the RELIQUARY SURFACE (V12) — a
 * procedural carved-mineral jewel BRDF that gives every organism the ornate, 4K-detailed look of
 * the NHI specimen plate without a single texture byte.
 *
 * The melt: displaces each instance along its surface normal by a time+position+instance warp,
 * gated on `uNightmare` (0 at N1 → branch skipped → vertices untouched → byte-identical). Phase
 * comes from `gl_InstanceID` (WebGL2 built-in — no extra attribute).
 *
 * The reliquary surface (fragment, ALWAYS on, every render mode):
 * - A 3-octave value-noise fBm over OBJECT space (`vObjPos`) is a static engraving — its
 *   tangent-plane gradient perturbs the *shading* normal BEFORE `<lights_fragment_begin>`, so the
 *   six real point-lights carve the filigree honestly (this is relief, not a flat decal).
 * - Groove self-shadowing (AO) darkens the diffuse in the engraved valleys for depth.
 * - Amber SUBSURFACE translucency glows from the thin shell of the grooves, pulsing with `uBass`
 *   (the cosmos hears itself sing and glows back — the philosophy's feedback law).
 * - Thin-film IRIDESCENCE rides the fresnel rim + ridge crests, its phase drifting with `uTime`
 *   and `uChaos`, so a turbulent cosmos shimmers hotter.
 * - A crisp wet-glass rim glint seals the jewel read.
 * All terms are real f(objPos, normal, view, time, audio) — deterministic, GPU-only, zero
 * per-entity CPU cost. The exotic HOLOGRAM/IRIDESCENT modes still layer on top, unchanged.
 */
function patchPoolMaterial(
  mat: THREE.MeshStandardMaterial,
  uniforms: ShaderUniforms,
  matClass: number,
): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = uniforms.uTime;
    shader.uniforms['uNightmare'] = uniforms.uNightmare;
    shader.uniforms['uChaos'] = uniforms.uChaos;
    shader.uniforms['uBass'] = uniforms.uBass;
    shader.uniforms['uMode'] = uniforms.uMode;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec4 instEmissive;\nattribute vec4 instVitals;\nattribute vec4 instVitals2;\nvarying vec4 vInstEmissive;\nvarying vec4 vVitals;\nvarying vec4 vVit2;\nvarying vec3 vObjPos;\nuniform float uTime;\nuniform float uNightmare;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
          'vInstEmissive = instEmissive;\n' +
          'vVitals = instVitals;\n' +
          'vVit2 = instVitals2;\n' +
          'vObjPos = position;\n' +
          'if (uNightmare > 0.0) {\n' +
          '  float ph = float(gl_InstanceID) * 0.6180339887;\n' +
          '  float warp = sin(position.y * 8.0 + uTime * 3.0 + ph) * 0.5 + sin(position.x * 6.0 - uTime * 2.0 + ph) * 0.5;\n' +
          '  transformed += objectNormal * (uNightmare * warp * 0.18);\n' +
          '}\n' +
          '// SHARDWARP (neural firing, vVitals.z): a firing body bristles with tiny shards along its\n' +
          '// normal; amplitude scales with real activation, so an idle organism is byte-identical.\n' +
          'transformed += objectNormal * (instVitals.z * sin(position.x * 31.0 + position.y * 27.0 - uTime * 11.0) * 0.04);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n#define RQ_MAT ${matClass}\n${RELIQUARY_FRAG_HEADER}`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse, opacity * vInstEmissive.a );',
      )
      .replace('#include <roughnessmap_fragment>', RELIQUARY_FRAG_ROUGH)
      .replace('#include <emissivemap_fragment>', RELIQUARY_FRAG_BODY);
  };
}

/**
 * Map a geometry-cache index to a material archetype (V27), pairing each SILHOUETTE family with a
 * distinct material LANGUAGE so a sphere-creature reads as pearl, a knot-creature as faceted crystal,
 * a box-creature as machined metal, a torus as warm amber, a deformed organic as chalky bone. The
 * geometry order is fixed in `geometry-cache.ts` (3 spheres, 3 ico, 3 octa, 3 tetra, 2 dodeca, 3 tori,
 * 6 knots, 5 cylinders, 4 cones, 5 boxes, 3 organics). 0 pearl · 1 crystal · 2 glass · 3 amber · 4
 * metal · 5 bone.
 */
function materialClassFor(gi: number): number {
  if (gi <= 2) return 0; // spheres → pearl
  if (gi <= 5) return 1; // icosahedra → crystal
  if (gi <= 11) return 2; // octahedra + tetrahedra → glass
  if (gi <= 13) return 1; // dodecahedra → crystal
  if (gi <= 16) return 3; // tori → amber
  if (gi <= 22) return 1; // torus knots → crystal
  if (gi <= 36) return 4; // cylinders + cones + boxes → metal
  return 5; // deformed organics → bone
}

/**
 * GLSL injected after the fragment `<common>` chunk: the per-instance/shared varyings+uniforms and
 * a cheap value-noise fBm. `rqHash`→`rqNoise`→`rqFbm` is the standard hash-lattice gradient-free
 * noise; 3 octaves is the measured cost/detail sweet spot for the small on-screen footprint of a
 * pooled organism. Defined at file scope so prettier/oxlint format it once, not per-build.
 */
const RELIQUARY_FRAG_HEADER = /* glsl */ `
varying vec4 vInstEmissive;
varying vec4 vVitals;
varying vec4 vVit2;
varying vec3 vObjPos;
uniform float uTime;
uniform float uBass;
uniform float uChaos;
uniform float uMode;
#define RQ_OCTAVES 3
float rqHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rqNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rqHash(i + vec3(0,0,0)), rqHash(i + vec3(1,0,0)), f.x),
                 mix(rqHash(i + vec3(0,1,0)), rqHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rqHash(i + vec3(0,0,1)), rqHash(i + vec3(1,0,1)), f.x),
                 mix(rqHash(i + vec3(0,1,1)), rqHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float rqFbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < RQ_OCTAVES; i++){ s += a * rqNoise(p); p *= 2.02; a *= 0.5; } return s; }

// Per-MATERIAL-CLASS surface profile (V27), a compile-time constant per pool so each of the six
// archetypes compiles its own specialised shader — distinct material LANGUAGE per silhouette family.
// RQ_FREQ relief frequency · RQ_RELIEF normal-engrave strength · RQ_ROUGH recess roughness ·
// RQ_METAL metalness · RQ_SSS subsurface tint · RQ_SSSAMT subsurface strength · RQ_FILM thin-film gain.
#ifndef RQ_MAT
#define RQ_MAT 3
#endif
#if RQ_MAT == 0 // PEARL — smooth, soft cool subsurface, low relief
  #define RQ_FREQ 4.0
  #define RQ_RELIEF 0.30
  #define RQ_ROUGH 0.42
  #define RQ_METAL 0.10
  #define RQ_SSS vec3(0.85, 0.80, 0.90)
  #define RQ_SSSAMT 0.28
  #define RQ_FILM 0.55
#elif RQ_MAT == 1 // CRYSTAL — sharp faceted ribs, prismatic, glossy
  #define RQ_FREQ 9.0
  #define RQ_RELIEF 0.62
  #define RQ_ROUGH 0.14
  #define RQ_METAL 0.12
  #define RQ_SSS vec3(0.75, 0.82, 0.95)
  #define RQ_SSSAMT 0.15
  #define RQ_FILM 0.95
#elif RQ_MAT == 2 // GLASS — transmissive, cool, razor rim
  #define RQ_FREQ 6.0
  #define RQ_RELIEF 0.35
  #define RQ_ROUGH 0.07
  #define RQ_METAL 0.0
  #define RQ_SSS vec3(0.70, 0.85, 0.95)
  #define RQ_SSSAMT 0.20
  #define RQ_FILM 0.75
#elif RQ_MAT == 4 // METAL — machined, sharp specular, ridged
  #define RQ_FREQ 7.0
  #define RQ_RELIEF 0.50
  #define RQ_ROUGH 0.26
  #define RQ_METAL 0.92
  #define RQ_SSS vec3(0.6, 0.6, 0.7)
  #define RQ_SSSAMT 0.05
  #define RQ_FILM 0.35
#elif RQ_MAT == 5 // BONE — matte, chalky, deep relief
  #define RQ_FREQ 8.0
  #define RQ_RELIEF 0.65
  #define RQ_ROUGH 0.70
  #define RQ_METAL 0.15
  #define RQ_SSS vec3(0.72, 0.65, 0.55)
  #define RQ_SSSAMT 0.10
  #define RQ_FILM 0.06
#else // RQ_MAT == 3 — AMBER, the warm default jewel
  #define RQ_FREQ 6.0
  #define RQ_RELIEF 0.50
  #define RQ_ROUGH 0.55
  #define RQ_METAL 0.06
  #define RQ_SSS vec3(0.95, 0.55, 0.28)
  #define RQ_SSSAMT 0.32
  #define RQ_FILM 0.40
#endif
`;

/**
 * GLSL replacing the fragment `<roughnessmap_fragment>` chunk: evaluate the carved-mineral relief
 * field ONCE here (it needs only `vObjPos`, not the normal) and reuse it downstream. The fBm is
 * sharpened into ornamental radiolaria-style ribs (`rqDetail`), then drives a worn-jewel roughness
 * BRDF — polished crests (low roughness → sharp glints), matte recesses (high roughness). `rqN0`,
 * `rqGrad`, `rqDetail` survive in `main()` scope for {@link RELIQUARY_FRAG_BODY}.
 */
const RELIQUARY_FRAG_ROUGH = /* glsl */ `#include <roughnessmap_fragment>
	vec3 rqQ = vObjPos * RQ_FREQ;
	float rqE = 0.085;
	float rqN0 = rqFbm(rqQ);
	float rqNx = rqFbm(rqQ + vec3(rqE, 0.0, 0.0));
	float rqNy = rqFbm(rqQ + vec3(0.0, rqE, 0.0));
	float rqNz = rqFbm(rqQ + vec3(0.0, 0.0, rqE));
	vec3 rqGrad = vec3(rqNx - rqN0, rqNy - rqN0, rqNz - rqN0) / rqE;
	// Ornamental ribbing: concentric striation (radiolaria ribs) blended into the fBm so detail
	// concentrates into vein-like ridges instead of pure mottle.
	float rqRib = 0.5 + 0.5 * sin(length(vObjPos) * 18.0 + rqN0 * 6.2831853);
	float rqDetail = mix(rqN0, rqRib, 0.28);
	// Worn-jewel roughness per material class: crests polish, recesses stay at the class's base.
	roughnessFactor = clamp(mix(RQ_ROUGH, RQ_ROUGH * 0.25, smoothstep(0.45, 0.95, rqDetail)), 0.03, 1.0);`;

/**
 * GLSL replacing the fragment `<emissivemap_fragment>` chunk: the reliquary surface proper, reusing
 * the relief field from {@link RELIQUARY_FRAG_ROUGH}. Engraves `normal` (→ carved by the real
 * lights), pulls `metalnessFactor` toward dielectric glass, sinks an amber translucency into the
 * grooves, and rides thin-film interference along the crests/rim — then the exotic
 * HOLOGRAM/IRIDESCENT mode layer (unchanged). All mutate state before `<lights_fragment_begin>`.
 */
const RELIQUARY_FRAG_BODY = /* glsl */ `#include <emissivemap_fragment>
	totalEmissiveRadiance = vInstEmissive.rgb;
	vec3 rqV = normalize(vViewPosition);
	// Engrave the relief into the shading normal so the six point-lights carve it honestly.
	vec3 rqTang = rqGrad - dot(rqGrad, normal) * normal;
	vec3 rqN = normalize(normal - rqTang * RQ_RELIEF);
	normal = rqN;
	// Pull metalness toward this material class (glass→dielectric, metal→conductor).
	metalnessFactor = mix(metalnessFactor, RQ_METAL, 0.8);
	// Groove self-shadow + the class subsurface tint settling into the recesses.
	float rqAO = mix(0.55, 1.15, smoothstep(0.12, 0.85, rqDetail));
	diffuseColor.rgb *= rqAO;
	float rqValley = 1.0 - smoothstep(0.3, 0.7, rqN0);
	diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * RQ_SSS, rqValley * 0.3);
	float rqRidge = smoothstep(0.6, 0.97, rqDetail);
	float rqFres = pow(1.0 - clamp(abs(dot(rqN, rqV)), 0.0, 1.0), 3.0);
	// Subsurface translucency from the thin grooves (class-tinted), breathing with the bass.
	vec3 rqSSS = diffuseColor.rgb * RQ_SSS;
	float rqThin = 1.0 - rqN0;
	float rqBack = pow(1.0 - clamp(dot(rqN, rqV), 0.0, 1.0), 1.5) * rqThin;
	totalEmissiveRadiance += rqSSS * rqBack * RQ_SSSAMT * (0.7 + 0.6 * uBass);
	// Thin-film interference riding the rim + ridge crests, phase drifting with time + chaos.
	vec3 rqFilm = 0.5 + 0.5 * cos(6.2831853 * (vec3(1.0, 0.85, 0.7) * rqFres * 2.2
		+ vec3(0.0, 0.18, 0.36) + rqDetail * 1.5 + uTime * 0.04 + uChaos * 0.015));
	totalEmissiveRadiance += rqFilm * (rqFres * 0.38 + rqRidge * 0.26) * RQ_FILM;
	// Wet-glass rim glint.
	totalEmissiveRadiance += vec3(0.95, 0.98, 1.0) * pow(rqFres, 1.4) * 0.14;

	// ══ V-VITALS REAL-BOUND EFFECT SUITE ══════════════════════════════════════════════════════
	// Every term's strength is a FALSIFIABLE readout of one packed per-entity signal (vVitals:
	// x=wealth energy, y=senescence age/life, z=neural firing act, w=exertion speed). The spectacle
	// IS the state: a poor, young, idle, still organism stays quiet; a rich, ancient, firing, sprinting
	// one blazes. GPU-only, zero per-entity CPU; reuses the relief/fresnel/normal already computed.
	float vWealth = vVitals.x, vSen = vVitals.y, vNeu = vVitals.z, vExe = vVitals.w;
	// PHOSPHOR GASEOUSNESS (wealth) — a slow roiling luminous gas wreathes the well-fed body.
	float rqGas = fract(rqDetail * 1.9 + uTime * 0.12); rqGas = rqGas * (1.0 - rqGas) * 4.0;
	totalEmissiveRadiance += vec3(0.30, 0.95, 0.72) * rqGas * vWealth * 0.5;
	// LASER-DANCE SYNAPSE ARCS (neural firing) — thin electric filaments race across the shell.
	float rqArc = pow(0.5 + 0.5 * sin(vObjPos.y * 24.0 + vObjPos.x * 15.0 + uTime * 9.0), 20.0);
	totalEmissiveRadiance += vec3(0.45, 0.85, 1.0) * rqArc * vNeu * 2.4;
	// ASHEN CATARACT (senescence) — pigment greys and a cold frost rim creeps in; the body ages on screen.
	float rqLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
	diffuseColor.rgb = mix(diffuseColor.rgb, vec3(rqLum * 0.72), vSen * 0.10);
	totalEmissiveRadiance += vec3(0.55, 0.62, 0.80) * pow(rqFres, 2.0) * vSen * 0.5;
	// HYPERSPACE IONIZING FLUTTER (exertion) — ion streaks band along the engraved normal as it sprints.
	float rqStreak = pow(0.5 + 0.5 * sin(rqN.y * 28.0 - uTime * 15.0), 7.0);
	totalEmissiveRadiance += vec3(0.30, 0.60, 1.0) * rqStreak * vExe * 1.4;
	// GILDED BUFFER SHIMMER (wealth) — a high-frequency sparkle gilds the fresnel rim of the rich.
	float rqSpk = step(0.85, rqFbm(vObjPos * 21.0 + uTime * 0.6)) * pow(rqFres, 1.5);
	totalEmissiveRadiance += vec3(1.0, 0.85, 0.45) * rqSpk * vWealth * 1.4;
	// SINGULROSITY BLOOM (vitality = wealth × firing) — the most alive bodies bloom a hot core halo.
	totalEmissiveRadiance += vec3(1.0, 0.70, 1.0) * pow(rqFres, 0.6) * (vWealth * vNeu) * 1.5;
	// BIT-GLITCH CHAOS CORE (global chaos × senescence) — the shell quantizes into flickering data blocks,
	// scrambling harder on stressed, aged bodies; ties the body to the real world-chaos system.
	float rqGlitch = floor((rqN0 + sin(uTime * 11.0) * 0.25) * 6.0) / 6.0;
	totalEmissiveRadiance += vec3(0.10, 1.0, 0.40) * rqGlitch * uChaos * (0.25 + 0.75 * vSen) * 0.4;

	// ══ V-VITALS2 SOCIAL + QUANTUM SUITE ══════════════════════════════════════════════════════════
	// Bound to the second packed lane (vVit2: x=strategy coop/defect, y=payoff, z=community hue,
	// w=quantum phase) — game-theory allegiance, fortunes, tribe, and quantum state made legible.
	float sStrat = vVit2.x, sPay = vVit2.y, sComm = vVit2.z, sQ = vVit2.w;
	// COOPERATOR HALO vs DEFECTOR BARB-CORONA (strategy) — allegiance reads off the body.
	vec3 sAlleg = mix(vec3(0.25, 1.0, 0.55), vec3(1.0, 0.30, 0.20), sStrat); // green coop ↔ red defect
	float sHalo = pow(rqFres, 2.2) * (1.0 - sStrat); // cooperators wear a soft broad halo
	float sBarb = pow(0.5 + 0.5 * sin(atan(rqN.z, rqN.x) * 16.0 + uTime * 3.0), 18.0) * pow(rqFres, 1.3) * sStrat; // defectors a spiked corona
	totalEmissiveRadiance += sAlleg * (sHalo * 0.45 + sBarb * 1.8);
	// PAYOFF-SWING IRIDESCENCE (payoff, phase-drifted by the quantum lane) — winners flare iridescent.
	vec3 sIris = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + rqFres * 8.0 + sQ * 6.2831853);
	totalEmissiveRadiance += sIris * sPay * pow(rqFres, 1.5) * 1.2;
	// FACTION WAR-PAINT (community hue) — same louvain tribe ⇒ same hue + banded sigil.
	vec3 sTribe = 0.5 + 0.5 * cos(6.2831853 * (sComm + vec3(0.0, 0.33, 0.67)));
	float sSigil = step(0.62, fract(rqDetail * 3.0 + sComm * 7.0));
	diffuseColor.rgb = mix(diffuseColor.rgb, sTribe, sSigil * 0.45);
	totalEmissiveRadiance += sTribe * sSigil * 0.4;
	// HIVE-RESONANCE (community) — a tribe breathes in phase: same hue ⇒ same pulse offset.
	float sHive = 0.5 + 0.5 * sin(uTime * 2.0 + sComm * 6.2831853);
	totalEmissiveRadiance += sTribe * sHive * 0.18;
	// SUPERPOSITION PROBABILITY SHIMMER (quantum phase) — an interference shimmer cycles with qP.
	float sShim = 0.5 + 0.5 * sin(vObjPos.x * 10.0 + vObjPos.y * 8.0 + sQ * 12.566370);
	totalEmissiveRadiance += vec3(0.55, 0.40, 1.0) * pow(sShim, 6.0) * 0.45;

	// ══ V-VITALS3 KINETIC + ENVIRONMENTAL SUITE ═══════════════════════════════════════════════════
	// More named effects, each still bound to a REAL signal — the per-entity lanes already unpacked
	// above (vExe/vNeu/vSen/sQ) plus the world's real audio (uBass) and chaos (uChaos). Low-magnitude,
	// signal-gated, additive: detail not flood. GPU-only, no rng.
	// VORTEXICAL SWIRL (exertion) — a sprinting body twists a vortex into its rim.
	float v3ang = atan(rqN.z, rqN.x) + vExe * sin(length(vObjPos) * 5.0 - uTime * 6.0) * 3.0;
	totalEmissiveRadiance += (0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + v3ang * 3.0)) * vExe * pow(rqFres, 2.0) * 0.5;
	// HELIXOLOGY COSMOS (quantum phase) — twin bright strands wind the shell, advancing with qP.
	float v3hel = pow(0.5 + 0.5 * sin(vObjPos.y * 12.0 + atan(rqN.z, rqN.x) * 2.0 + sQ * 12.566370), 10.0);
	totalEmissiveRadiance += vec3(0.7, 0.5, 1.0) * v3hel * 0.55;
	// ORBITAL PLASMOIDS (neural firing) — plasma blobs orbit a firing body.
	float v3orb = pow(0.5 + 0.5 * sin(atan(rqN.z, rqN.x) * 5.0 + uTime * 4.0) * sin(rqN.y * 6.0 - uTime * 3.0), 16.0);
	totalEmissiveRadiance += vec3(1.0, 0.6, 0.3) * v3orb * vNeu * 1.6;
	// LAPSE-COLLAPSE BREATH (senescence × audio) — an aged body's glow expands/contracts with the bass.
	float v3breath = 0.5 + 0.5 * sin(uTime * 1.5 + length(vObjPos) * 6.0 - uBass * 6.2831853);
	totalEmissiveRadiance += vec3(0.6, 0.3, 0.5) * v3breath * vSen * (0.3 + 0.7 * uBass) * 0.4;
	// STORM THERMAL RADIANCE (world chaos × firing) — a chaotic, firing body glows blackbody-hot.
	totalEmissiveRadiance += vec3(1.0, 0.45, 0.12) * uChaos * vNeu * (0.5 + 0.5 * rqGlitch) * 0.7;
	// CYMATIC RIPPLES (audio) — concentric standing waves ride the surface with the bass.
	float v3cym = 0.5 + 0.5 * sin(length(vObjPos) * 22.0 - uTime * 5.0);
	totalEmissiveRadiance += vec3(0.3, 0.8, 0.9) * pow(v3cym, 4.0) * uBass * 0.5;

	// Exotic render modes layer on top (V7-beyond, unchanged).
	if (uMode > 5.5) {
		float ct = abs(dot(normalize(vNormal), rqV));
		vec3 irid = 0.5 + 0.5 * cos(6.28318 * (vec3(1.0,0.9,0.8) * ct + vec3(0.0,0.33,0.67) + uTime * 0.1));
		totalEmissiveRadiance += irid * 0.4;
		diffuseColor.rgb = mix(diffuseColor.rgb, irid, 0.6);
	} else if (uMode > 4.5) {
		float fres = pow(1.0 - clamp(abs(dot(normalize(vNormal), rqV)), 0.0, 1.0), 3.0);
		float scan = 0.5 + 0.5 * sin(gl_FragCoord.y * 0.15 - uTime * 4.0);
		totalEmissiveRadiance = (totalEmissiveRadiance + vec3(0.1, 0.45, 0.6)) * fres * scan * (1.0 + uBass);
		diffuseColor.a *= clamp(fres + 0.2, 0.0, 1.0);
	}`;

/**
 * Owns the InstancedMesh pools and the per-frame mirror pass. Construct once in
 * world.ts when `quality.instanced`; call {@link sync} once per frame after all
 * entity mutations (just before render).
 */
export class InstancedEntityRenderer {
  private readonly scene: THREE.Scene;
  private readonly geos: readonly THREE.BufferGeometry[];
  private readonly maxEntities: number;
  /** Pool slots: `geoIndex * 2 + transparentBit`; null = never used. */
  private readonly pools: (Pool | null)[];
  /** geometry.id → cache index (remorph swaps geometry references at runtime). */
  private readonly geoIndex = new Map<number, number>();
  /** Per-slot live counts for the current sync pass (pass 1 → pass 2). */
  private readonly counts: Uint32Array;
  /** Per-slot write cursors for pass 2. */
  private readonly cursors: Uint32Array;
  /** Render mode last applied to pool materials (CONTRACTS V7.3). */
  private mode: RenderMode = 'solid';
  /** Shared shader uniforms (V7-beyond) — one bag linked into every pool, written once/frame. */
  private readonly shaderUniforms: ShaderUniforms = {
    uTime: { value: 0 },
    uNightmare: { value: 0 },
    uChaos: { value: 0 },
    uBass: { value: 0 },
    uMode: { value: 0 },
  };

  /** Stores references and builds the geometry-id lookup. No pools yet. O(geos). */
  constructor(ctx: SimContext) {
    this.scene = ctx.scene;
    this.geos = ctx.geos;
    this.maxEntities = ctx.quality.maxEntities;
    this.pools = Array.from<Pool | null>({ length: ctx.geos.length * 2 }).fill(null);
    this.counts = new Uint32Array(ctx.geos.length * 2);
    this.cursors = new Uint32Array(ctx.geos.length * 2);
    for (let i = 0; i < ctx.geos.length; i++) {
      const g = ctx.geos[i];
      if (g) this.geoIndex.set(g.id, i);
    }
  }

  /**
   * Mirror the logical population into the pools. Two O(n) passes (count, then
   * write), event-driven pool construction/growth only, GPU uploads clipped to
   * each pool's live range. Call once per frame after all entity mutations.
   */
  sync(list: readonly Entity[], mode: RenderMode, frame: InstanceFrame = ZERO_FRAME): void {
    // Drive the shared shader uniforms (V7-beyond) — one write reaches every pool. At N1
    // (nightmare 0) the GPU melt branch is skipped, so the scene is byte-identical.
    this.shaderUniforms.uTime.value = frame.t;
    this.shaderUniforms.uNightmare.value = frame.nightmare;
    this.shaderUniforms.uChaos.value = frame.chaos;
    this.shaderUniforms.uBass.value = frame.bass;
    this.shaderUniforms.uMode.value = RENDER_MODES.indexOf(mode);
    const counts = this.counts;
    const cursors = this.cursors;
    counts.fill(0);

    // Pass 1 — census per pool slot.
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const gi = this.geoIndex.get(e.geometry.id);
      if (gi === undefined) continue; // foreign geometry — never pooled
      const k = poolKey(gi, e.material.transparent);
      counts[k] = (counts[k] ?? 0) + 1;
    }

    // Ensure pools exist and fit (event-driven; steady state is a no-op).
    for (let k = 0; k < counts.length; k++) {
      const need = counts[k] ?? 0;
      if (need === 0) continue;
      const pool = this.pools[k];
      if (!pool) this.pools[k] = this.buildPool(k, need);
      else if (need > pool.capacity) this.growPool(k, pool, need);
    }

    // Pass 2 — write matrices/colors/emissive into the pools. The N(2) inverted palette
    // (CONTRACTS V7.6) is folded in HERE — it rewrites the per-instance attributes only, never
    // the morphotype base material, so flipping back to N(1) (nightmare→0) is automatic.
    const night = frame.nightmare;
    cursors.fill(0);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue; // invariant: list is dense
      const gi = this.geoIndex.get(e.geometry.id);
      if (gi === undefined) continue;
      const k = poolKey(gi, e.material.transparent);
      const pool = this.pools[k];
      if (!pool) continue; // invariant: ensured above
      const slot = cursors[k] ?? 0;
      if (slot >= pool.capacity) continue; // capacity clamp (growth hit maxEntities)
      cursors[k] = slot + 1;
      e.updateMatrix();
      pool.mesh.setMatrixAt(slot, e.matrix);
      const c = e.material.color;
      const em = e.material.emissive;
      const eI = e.material.emissiveIntensity;
      const a = pool.emissive.array as Float32Array;
      const o = slot * 4;
      if (night > 0) {
        // Inverted, channel-permuted ("glitched") colour: target = vec3(1) − c.bgr, then a
        // per-instance 3-way channel rotation by (i % 3) so the inversion is non-uniform. Mix
        // toward it by `night`. Pure arithmetic on the existing colour — no rng.
        const ir = 1 - c.b;
        const ig = 1 - c.g;
        const ib = 1 - c.r;
        const rot = i % 3;
        const tr = rot === 0 ? ir : rot === 1 ? ig : ib;
        const tg = rot === 0 ? ig : rot === 1 ? ib : ir;
        const tb = rot === 0 ? ib : rot === 1 ? ir : ig;
        NIGHT_COL.setRGB(
          c.r + (tr - c.r) * night,
          c.g + (tg - c.g) * night,
          c.b + (tb - c.b) * night,
        );
        pool.mesh.setColorAt(slot, NIGHT_COL);
        // Emissive inverted + hotter, so the glow goes wrong too.
        const eIn = eI * (1 + 0.6 * night);
        a[o] = (em.r + (1 - em.b - em.r) * night) * eIn;
        a[o + 1] = (em.g + (1 - em.g - em.g) * night) * eIn;
        a[o + 2] = (em.b + (1 - em.r - em.b) * night) * eIn;
      } else {
        pool.mesh.setColorAt(slot, c);
        a[o] = em.r * eI;
        a[o + 1] = em.g * eI;
        a[o + 2] = em.b * eI;
      }
      a[o + 3] = e.material.transparent ? Math.max(e.material.opacity, MIN_ALPHA) : 1;
      // V-VITALS: pack this organism's REAL state into the per-instance vitals lane that drives the
      // GPU effect suite. Defensive — a bare data-mesh lacking full EntityData packs zeros, never NaN.
      const ud = e.userData;
      const vel = ud.vel as THREE.Vector3 | undefined;
      packVitals(
        pool.vitals.array as Float32Array,
        o,
        ud.energy,
        ud.age,
        ud.life,
        ud.act,
        vel ? vel.length() : 0,
      );
      packVitals2(
        pool.vitals2.array as Float32Array,
        o,
        ud.strategy,
        ud.payoff,
        ud.setGroup,
        ud.qP,
      );
    }

    // Publish: live counts, clipped uploads, render mode (V7.3). Per-instance colour/emissive/
    // alpha already came from each entity material above; only the pool-level flags
    // (wireframe/metalness/roughness) need pushing, and only when the mode changes.
    const modeChanged = mode !== this.mode;
    this.mode = mode;
    for (let k = 0; k < this.pools.length; k++) {
      const pool = this.pools[k];
      if (!pool) continue;
      const used = cursors[k] ?? 0;
      pool.used = used;
      pool.mesh.count = used;
      if (used > 0) {
        pool.mesh.instanceMatrix.clearUpdateRanges();
        pool.mesh.instanceMatrix.addUpdateRange(0, used * 16);
        pool.mesh.instanceMatrix.needsUpdate = true;
        const ic = pool.mesh.instanceColor;
        if (ic) {
          ic.clearUpdateRanges();
          ic.addUpdateRange(0, used * 3);
          ic.needsUpdate = true;
        }
        pool.emissive.clearUpdateRanges();
        pool.emissive.addUpdateRange(0, used * 4);
        pool.emissive.needsUpdate = true;
        pool.vitals.clearUpdateRanges();
        pool.vitals.addUpdateRange(0, used * 4);
        pool.vitals.needsUpdate = true;
        pool.vitals2.clearUpdateRanges();
        pool.vitals2.addUpdateRange(0, used * 4);
        pool.vitals2.needsUpdate = true;
      }
      if (modeChanged) {
        this.applyModeToPool(pool.mesh.material as THREE.MeshStandardMaterial);
      }
    }
  }

  /**
   * Apply the current {@link RenderMode}'s pool-level flags to a pool material (CONTRACTS
   * V7.3). Pools carry uniform PBR (per-instance metalness/roughness is not representable),
   * so a mode's metalness/roughness/wireframe apply pool-wide; per-instance opacity/emissive
   * stay on the instance attributes. O(1).
   */
  private applyModeToPool(mat: THREE.MeshStandardMaterial): void {
    const fx = RENDER_MODE_FX[this.mode];
    mat.wireframe = fx.wireframe;
    mat.metalness = fx.metalness ?? POOL_METALNESS;
    mat.roughness = fx.roughness ?? POOL_ROUGHNESS;
    // Honor the mode's depthWrite (audit 13c): GHOST's x-ray look needs depthWrite OFF on the
    // pools too, or desktop/ultra GHOST over-draws and self-sorts differently than the
    // per-mesh phone path. Pool transparency itself stays structural (the opaque/translucent
    // pool split); per-instance opacity already flows through the instEmissive alpha lane.
    mat.depthWrite = fx.depthWrite ?? true;
  }

  /** Build a pool for slot `k` sized for `need` (event-driven). */
  private buildPool(k: number, need: number): Pool {
    const gi = k >> 1;
    const transparent = (k & 1) === 1;
    const capacity = grownCapacity(
      initialPoolCapacity(this.maxEntities, this.geos.length),
      need,
      this.maxEntities,
    );
    const geo = this.geos[gi];
    if (!geo) throw new Error(`InstancedEntityRenderer: missing geometry ${gi}`);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: POOL_METALNESS,
      roughness: POOL_ROUGHNESS,
      transparent,
      opacity: 1,
      side: transparent ? THREE.DoubleSide : THREE.FrontSide,
    });
    this.applyModeToPool(mat); // carry the current render mode onto a freshly built pool (V7.3)
    // V27: each geometry family wears a distinct material LANGUAGE (glass/amber/pearl/metal/crystal/
    // bone), baked as a compile-time class so the silhouette and its surface read as one biology.
    patchPoolMaterial(mat, this.shaderUniforms, materialClassFor(gi));
    const mesh = new THREE.InstancedMesh(geo, mat, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Instances roam the whole arena — per-pool sphere culling is meaningless.
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.count = 0;
    const emissive = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    emissive.setUsage(THREE.DynamicDrawUsage);
    // vec4 per-instance VITAL signals (V-VITALS) — same lifecycle as `emissive`: owned by the pool's
    // geometry clone, disposed on growth, re-uploaded clipped to the live range each sync.
    const vitals = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    vitals.setUsage(THREE.DynamicDrawUsage);
    // vec4 per-instance SOCIAL + QUANTUM signals (V-VITALS2) — same lifecycle as the lanes above.
    const vitals2 = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    vitals2.setUsage(THREE.DynamicDrawUsage);
    // The pool renders a per-pool CLONE of the cached geometry so the
    // `instEmissive` attribute never leaks onto the shared cache entry (entity
    // geometries are tiny — ≤80 small clones, boot/growth-time only). The clone
    // is owned by the pool and disposed on growth; the cache original never is.
    const instGeo = geo.clone();
    instGeo.setAttribute('instEmissive', emissive);
    instGeo.setAttribute('instVitals', vitals);
    instGeo.setAttribute('instVitals2', vitals2);
    mesh.geometry = instGeo;
    // Force instanceColor allocation now so sync() can assume it exists.
    mesh.setColorAt(0, WHITE);
    const ic = mesh.instanceColor;
    if (ic) ic.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    return { mesh, emissive, vitals, vitals2, capacity, used: 0 };
  }

  /** Replace a pool with a doubled-capacity successor (event-driven, rare). */
  private growPool(k: number, pool: Pool, need: number): void {
    const capacity = grownCapacity(pool.capacity, need, this.maxEntities);
    if (capacity <= pool.capacity) return; // already at the ceiling
    this.scene.remove(pool.mesh);
    pool.mesh.geometry.dispose(); // the per-pool CLONE owns its attribute container
    pool.mesh.dispose();
    (pool.mesh.material as THREE.MeshStandardMaterial).dispose();
    this.pools[k] = this.buildPool(k, need);
  }
}

/** Scratch color for the instanceColor warm-up write. */
const WHITE = new THREE.Color(0xffffff);
/** Scratch color for the N(2) inverted-palette write (reused per instance — no per-frame alloc). */
const NIGHT_COL = new THREE.Color();

/**
 * Per-frame scalars the integrator hands to {@link InstancedEntityRenderer.sync} (CONTRACTS
 * V7.6 / the V7-beyond shader block). A reused object — never allocated per frame.
 * `nightmare` 0..1 drives the inverted palette (and, in the GPU wave, the melt shader).
 */
export interface InstanceFrame {
  t: number;
  chaos: number;
  bass: number;
  nightmare: number;
}

/** Default zero frame — keeps the legacy `sync(list, mode)` call shape working unchanged. */
const ZERO_FRAME: InstanceFrame = { t: 0, chaos: 0, bass: 0, nightmare: 0 };
