/**
 * TITANS (CONTRACTS V3.3) — 20 colossal roaming intelligences running a global economy and
 * waging game-theoretic war over the cosmos.
 *
 * Each titan is a scaled shoggoth-class rig (distinct silhouette composited from the shared
 * geometry cache + one PointLight, decay 0) holding an economy state {energy, matter, entropy}:
 * it PRODUCES by harvesting organisms (`entities.disposeAt`), witnessing quantum collapses
 * (`onCollapseWitness`) and bathing in reaction-diffusion pattern density (`feedEntropy`);
 * CONSUMES size-scaled upkeep per economy tick; and WASTES entropy as ground scars exposed
 * through `wantsPerturb` / `drainPerturb` (routed to the injected rd facade).
 *
 * Diplomacy is an iterated prisoner's dilemma over all C(TITAN_COUNT, 2) unordered pairs, STAGGERED so at
 * most one pair plays (and one separate pair strike-checks) per frame — full matrix coverage
 * every 600-frame cycle with no frame spike. Recent-window defection counts derive the pair
 * relation (TRUCE/ALLIANCE/WAR); WAR acts on the half-cycle offset cadence as territory
 * strikes (burst + scatter near the rival plus conscription remorphs). Payoffs couple to the
 * actual energy ledger (zero-line at the matrix mean), and bankruptcy mutates the titan's
 * strategy via replicator dynamics over the 5-strategy population.
 *
 * Determinism: ctx.rng is drawn ONLY on frame cadences (boot, economy ticks, diplomacy slots,
 * strike slots), so the SEEDED DECISION stream (which strategy, which victim band, which war
 * fires) is reproducible per-tick. The roam integration itself is stateful Euler with a
 * per-frame `vel *= 0.985` damp and dt-scaled impulses (legacy-parity physics), so the exact
 * titan TRAJECTORY — and thus which entities a harvest/strike happens to catch — is
 * reproducible given an identical dt sequence (the fixed-timestep contract of ADR 0004), not
 * across arbitrary frame-rate jitter. Same seed + same dt stream ⇒ same cosmos. Hot path is
 * allocation-free (module scratch vectors; ledger entries and the perturb request are REUSED
 * objects).
 */
import * as THREE from 'three';
import { TAU, clamp, dist2XZ } from '../math/scalar';
import { GROUND_EXTENT, PLATFORM_HALF, PLATFORM_CEIL, PLATFORM_FLOOR } from './constants';
import {
  HISTORY_WINDOW,
  PRISONERS_DILEMMA,
  STRATEGIES,
  createHistory,
  defections,
  meanPayoff,
  playRound,
  pushHistory,
  replicatorStep,
} from '../math/games';
import type { PairHistory } from '../math/games';
import type { SimContext } from '../types';
import type { EntityManager } from './entities';
import type { SingularitySystem } from './singularities';
import { PORTAL_RESPAWN_DELAY, portalReappearSpot } from './portal-death-fauna';
import type { DomeFeeder } from './dome-feeding';

/** Number of titans: 10 territorial colossi + 10 central social/procreative colossi. */
const TITAN_COUNT = 20;
/** Unordered titan pairs: C(TITAN_COUNT, 2). */
const PAIR_COUNT = (TITAN_COUNT * (TITAN_COUNT - 1)) / 2;

/**
 * Colossal-scale multiplier on the silhouette size (V3.6 integration): the drafted rigs
 * were authored against the 1× world; ×3 lifts them to 40-60u against 100-220u monoliths.
 */
const COLOSSAL = 3;
/**
 * Local light gain for the per-titan PointLight (decay 0). environment.ts was being reworked
 * by the audit swarm at write time, so this is NOT calibrated against the final light rig —
 * integrator: nudge this single constant against the ambient/key lights (target: a titan
 * reads as a glow source at ~80u without blowing out the ground).
 */
const TITAN_LIGHT_GAIN = 6;

/** Frames between economy ticks per titan; one titan ticks per stagger inside the period. */
const ECON_PERIOD = 120;
const ECON_STAGGER = ECON_PERIOD / TITAN_COUNT;
/** Diplomacy cycle length; pair `p` plays at `frame % 1200 === p * 6` (190·6 = 1140 < 1200). */
const DIPLO_PERIOD = 1200;
const DIPLO_STRIDE = 6;

/** Hard cap on every economy resource (overflow seal). */
const RESOURCE_CAP = 1000;
/** Harvest reach in the XZ plane (squared) and per-tick limits. */
const HARVEST_REACH2 = 20 * 20;
const HARVEST_MAX = 3;
/** Never graze the population below this count (mirrors the shoggoth feeding guard). */
const HARVEST_MIN_POPULATION = 60;
const MATTER_PER_ENTITY = 4;
/** Matter→energy conversion per economy tick. */
const METABOLIZE_RATE = 6;
const METABOLIZE_EFF = 0.8;
/** Upkeep per economy tick: base + size-scaled term (CONSUME). */
const UPKEEP_BASE = 0.9;
const UPKEEP_PER_SIZE = 0.55;
/** Entropy accrual / relief / waste-scar parameters (WASTE). */
const ENTROPY_PER_TICK = 2.2;
const ENTROPY_PER_HARVEST = 1.5;
const ENTROPY_RELIEF = 8;
const ENTROPY_WASTE_THRESHOLD = 60;
const ENTROPY_WASTE_RETAIN = 0.35;
const WASTE_SCAR_RADIUS = 6;
/** Energy granted per witnessed quantum collapse (PRODUCE). */
const WITNESS_ENERGY = 2.5;

/** Diplomacy payoff→energy coupling: stake grows with the poorer party's wealth. */
const PAYOFF_STAKE_BASE = 0.4;
const PAYOFF_STAKE_SCALE = 0.004;
/** F-DIPLO-ECON V16: how strongly AURUM/UMBRA wealth disparity emboldens the richer titan to defect
 *  (raid), coupling the economy into PD diplomacy. 0 ⇒ no coupling; the bias only fires when the
 *  composition root has wired an economy (tests leave it null → byte-identical PD behaviour). */
const WEALTH_AGGRESSION = 0.38;
/** EMA decay for per-strategy fitness fed into the bankruptcy replicator. */
const FITNESS_DECAY = 0.95;
const REPLICATOR_DT = 0.5;
const BANKRUPT_SEED_ENERGY = 25;

/** Territory-strike economics and entity effects. */
const STRIKE_COST = 12;
const RAID_LOSS = 9;
const LOOT_MATTER = 6;
const STRIKE_RADIUS = 18;
const STRIKE_REACH2 = STRIKE_RADIUS * STRIKE_RADIUS;
const SCATTER_KICK = 0.5;
const CONSCRIPT_MAX = 4;
const BURST_COUNT = 5;

/** War-matrix cell states (Uint8Array values). */
export const REL_TRUCE = 0;
export const REL_ALLIANCE = 1;
export const REL_WAR = 2;

/** Geometry-cache indices used by the silhouette compositor (mod-length defensive). */
const GEO_SPHERE = 2;
const GEO_ICO = 5;
const GEO_OCTA = 8;
const GEO_DODE = 13;
const GEO_TORUS_THIN = 15;
const GEO_TORUS_FAT = 16;
const GEO_KNOT = 18;
const GEO_CYL = 28;
const GEO_CONE = 29;
const GEO_BOX = 32;
const GEO_ORGANIC = 38;

// Module-level scratch vectors — reused every frame/event, never retained.
const VA = new THREE.Vector3();
const VB = new THREE.Vector3();
/** F-HOLES: scratch for the singularity body-force pull on a titan (never retained). */
const HOLE_F = new THREE.Vector3();

// ── V67 OMINOUS REDESIGN (freak-geometry titans) ───────────────────────────────
/** Subdivisions of the writhing fractal CORE icosahedron (enough verts for smooth 4D writhe). */
const CORE_DETAIL = 4;
/** Aura field: organisms within this reach are eddied + hue-stained (titan↔organism interaction). */
const AURA_R = 36;
const AURA_R2 = AURA_R * AURA_R;
const AURA_G = 120; // r⁻² eddy gain (capped) — social/electromagnetic wake, not a gravity well.
const AURA_CAP = 1.4;
/** Titan↔titan soft collision: they REPEL (no more silent pass-through) + flare on contact. */
const TITAN_TOUCH_K = 3.0; // touch distance = TITAN_TOUCH_K · (sizeA + sizeB)
const TITAN_CLASH_HEAT = 0.6; // entropy bump on contact → blazes the emissive + writhe
/** V69 world-physics warp: titans BEND reality — a clash fractures it, sustained wars destabilise it. */
const CLASH_CHAOS = 0.12; // chaos added per unit clash-overlap per frame (transient; the integrator decays it)
const WAR_CHAOS = 0.0016; // chaos added per active war (summed warCount) per frame (a persistent disturbance)
/** Titans destabilise the world strongly but never PEG it — they raise chaos only up to this ceiling,
 *  leaving headroom for the dedicated storm controls (Chaos Mode, singularities) to push higher. */
const TITAN_CHAOS_CEIL = 6.5;
/** Extra breeder titans must gather inside this center radius before procreation fires. */
const BREED_CENTER_R = 92;
const BREED_CENTER_R2 = BREED_CENTER_R * BREED_CENTER_R;
/** Frames between center procreation checks. */
const BREED_PERIOD = 180;
/** Minimum central breeder count for a NHI matrix birth event. */
const BREED_QUORUM = 7;
const AURA_SHOCK_R2_FRAC = 0.16; // inner-well fraction of AURA_R² where organisms RECOIL (a stun)
const AURA_SHOCK_DAMP = 0.9; // velocity retained per visit inside the shock zone

/** USER: titan bodies were smooth "blobs". Fractal CPU displacement → sharp crystalline ridges +
 *  occasional long spikes along the normal, turning any smooth primitive into a WILD faceted
 *  mathematical solid. Clones the base (never mutates the shared entity cache); deterministic (hash +
 *  trig of the vertex — no rng). Built once per geo-type at boot. */
function displaceTitanGeo(base: THREE.BufferGeometry, seed: number): THREE.BufferGeometry {
  const g = base.clone();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute | null;
  const arr = pos.array as Float32Array;
  const nr = nrm ? (nrm.array as Float32Array) : null;
  const hsh = (x: number, y: number, z: number): number => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 0.618) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i] ?? 0;
    const y = arr[i + 1] ?? 0;
    const z = arr[i + 2] ?? 0;
    const len = Math.hypot(x, y, z) || 1;
    const nx = nr ? (nr[i] ?? x / len) : x / len;
    const ny = nr ? (nr[i + 1] ?? y / len) : y / len;
    const nz = nr ? (nr[i + 2] ?? z / len) : z / len;
    const ridge =
      0.5 + 0.5 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 0.5) * Math.sin(z * 2.9);
    const spike = hsh(Math.round(nx * 5), Math.round(ny * 5), Math.round(nz * 5)) > 0.85 ? 0.55 : 0;
    const d = ridge * 0.18 + spike; // ridges everywhere + occasional long crystalline spikes
    arr[i] = x + nx * d;
    arr[i + 1] = y + ny * d;
    arr[i + 2] = z + nz * d;
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Shared writhing core — a WILD spiky crystalline fractal (was a smooth icosahedron); per-titan mesh.scale. */
const TITAN_CORE_GEO = displaceTitanGeo(new THREE.IcosahedronGeometry(1, CORE_DETAIL), 7);

/** Per-titan shader uniforms — ONE object reused by the body patch + cage + aura (drive once/frame). */
interface TitanUniforms {
  uTime: THREE.IUniform<number>;
  uMenace: THREE.IUniform<number>;
  uColor: THREE.IUniform<THREE.Color>;
  /** energy/RESOURCE_CAP ∈ [0,1] — drives the stellar-core forge glow (a fed titan burns like a star). */
  uEnergy: THREE.IUniform<number>;
  /** entropy/ENTROPY_WASTE_THRESHOLD ∈ [0,1] — drives the waste-rot ashen fissures (a wasteful titan cracks). */
  uEntropy: THREE.IUniform<number>;
  /** matter/RESOURCE_CAP ∈ [0,1] — drives the accretion mass-hoard molten-metal veins (a heavy titan). */
  uMatter: THREE.IUniform<number>;
  /** warCount/WAR_RAGE_CAP ∈ [0,1] — drives the battle-scar rage plasma (a warring titan erupts red). */
  uWar: THREE.IUniform<number>;
}
function makeTitanUniforms(): TitanUniforms {
  return {
    uTime: { value: 0 },
    uMenace: { value: 0 },
    uColor: { value: new THREE.Color() },
    uEnergy: { value: 0 },
    uEntropy: { value: 0 },
    uMatter: { value: 0 },
    uWar: { value: 0 },
  };
}

/** This many simultaneous wars ⇒ full battle-rage plasma (a titan can war at most TITAN_COUNT−1 rivals). */
const WAR_RAGE_CAP = 5;

/**
 * Normalize a titan's raw economy into the two shader vitality lanes, both clamped to `[0,1]` and
 * guarded against non-finite input: `energyN = energy/RESOURCE_CAP` (stellar-core forge brightness),
 * `entropyN = entropy/ENTROPY_WASTE_THRESHOLD` (waste-rot fissure depth). Pure, no rng. O(1). See
 * tests/titan-vitals.test.ts.
 */
export function titanVitalLanes(
  energy: number,
  entropy: number,
): { energyN: number; entropyN: number } {
  return {
    energyN: clamp((Number.isFinite(energy) ? energy : 0) / RESOURCE_CAP, 0, 1),
    entropyN: clamp((Number.isFinite(entropy) ? entropy : 0) / ENTROPY_WASTE_THRESHOLD, 0, 1),
  };
}

/**
 * Normalize a titan's raw diplomacy/economy into the two shader COMBAT lanes, both clamped to `[0,1]`
 * and non-finite-guarded: `matterN = matter/RESOURCE_CAP` (accretion mass-hoard molten veins),
 * `warN = warCount/WAR_RAGE_CAP` (battle-scar rage plasma). Pure, no rng. O(1). See
 * tests/titan-vitals.test.ts.
 */
export function titanCombatLanes(
  matter: number,
  warCount: number,
): { matterN: number; warN: number } {
  return {
    matterN: clamp((Number.isFinite(matter) ? matter : 0) / RESOURCE_CAP, 0, 1),
    warN: clamp((Number.isFinite(warCount) ? warCount : 0) / WAR_RAGE_CAP, 0, 1),
  };
}

/**
 * Build the 4D unit-tesseract edge geometry: a `pos4` (vec4) attribute carrying each corner's 4D
 * coordinate, plus a rest `position` (xyz) for sane bounds. 16 corners (±1)⁴, 32 edges (corners that
 * differ in exactly one axis). The cage material rotates pos4 in 4D each frame and projects to 3D —
 * a genuine hypercube shadow, not a faked wireframe. Built once at module load (CPU only, headless-safe).
 */
function buildTesseractGeo(): THREE.BufferGeometry {
  const corner = (m: number, c: number): number => ((m >> c) & 1 ? 1 : -1);
  const pos4: number[] = [];
  const pos3: number[] = [];
  for (let a = 0; a < 16; a++) {
    for (let b = a + 1; b < 16; b++) {
      let diff = 0;
      for (let c = 0; c < 4; c++) if (corner(a, c) !== corner(b, c)) diff++;
      if (diff !== 1) continue; // an edge connects corners one flip apart
      for (let e = 0; e < 2; e++) {
        const m = e === 0 ? a : b;
        const x = corner(m, 0);
        const y = corner(m, 1);
        const z = corner(m, 2);
        const w = corner(m, 3);
        pos4.push(x, y, z, w);
        pos3.push(x, y, z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos3, 3));
  g.setAttribute('pos4', new THREE.Float32BufferAttribute(pos4, 4));
  return g;
}
const TITAN_TESSERACT_GEO = buildTesseractGeo();

/**
 * Patch a titan body/accent {@link THREE.MeshStandardMaterial} into ominous freak-geometry — mirrors
 * the super-body `patchGodJewel` idiom (onBeforeCompile + #include replacement) so real scene lights
 * still carve the surface. VERTEX: a 4D rotor writhe (treat the surface as a 3-slice of a rotating 4D
 * solid) + Mandelbulb-flavoured fBm relief, amplitude scaling with `uMenace`. FRAGMENT: thin-film
 * iridescence + Fresnel rim + a HOT inner void-glow (values >1 — ACES rolls them off, so it blazes
 * without bloom). All titan materials share ONE program (constant cache key) since the GLSL is identical.
 */
function patchTitanBody(mat: THREE.MeshStandardMaterial, u: TitanUniforms): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = u.uTime;
    shader.uniforms['uMenace'] = u.uMenace;
    shader.uniforms['uColor'] = u.uColor;
    shader.uniforms['uEnergy'] = u.uEnergy;
    shader.uniforms['uEntropy'] = u.uEntropy;
    shader.uniforms['uMatter'] = u.uMatter;
    shader.uniforms['uWar'] = u.uWar;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObjP; uniform float uTime; uniform float uMenace;
        vec3 hyperWrithe(vec3 p){
          float w = sin(length(p) * 1.3 - uTime * 0.7);     // synthesize a 4th coordinate
          float a = uTime * 0.5, b = uTime * 0.37;
          float x = p.x * cos(a) + w * sin(a);
          float ww = -p.x * sin(a) + w * cos(a);
          float z = p.z * cos(b) + ww * sin(b);
          float proj = 1.7 / (1.7 - ww * 0.45);              // 4D -> 3D perspective project
          return vec3(x, p.y, z) * proj;
        }`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vObjP = position;
        float amp = 0.10 + 0.50 * uMenace;                   // warring titans writhe harder
        vec3 hp = hyperWrithe(normalize(position)) * length(position);
        transformed = mix(position, hp, amp);
        transformed += normal * amp * 0.5 * sin(position.x * 2.7 + uTime) * sin(position.z * 2.3 - uTime);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObjP; uniform float uTime; uniform float uMenace; uniform vec3 uColor;
        uniform float uEnergy; uniform float uEntropy; uniform float uMatter; uniform float uWar;
        float h31(vec3 p){return fract(sin(dot(p, vec3(27.17, 61.31, 11.71))) * 43758.5453);}
        float n31(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
        float fbm3(vec3 p){float a=.5,s=0.;for(int k=0;k<7;k++){s+=a*n31(p);p=p*2.03+7.1;a*=.5;}return s;}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float rq = fbm3(vObjP * 2.6 + uTime * 0.05);
        roughnessFactor = clamp(mix(0.45, 0.05, smoothstep(0.4, 0.9, rq)), 0.04, 1.0);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float relief = fbm3(vObjP * 6.5);
        float fres = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 3.0);
        float band = relief * 6.2831 + fres * 9.0 + uTime * 0.5;
        vec3 iris = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + band);  // thin-film hue cycle
        vec3 voidGlow = uColor * (0.4 + 3.0 * uMenace);               // HOT (>1) — ACES rolls it off
        totalEmissiveRadiance += voidGlow * pow(1.0 - fres, 3.0) * (0.3 + 0.7 * relief)
                               + iris * fres * (0.6 + 1.2 * uMenace);
        // USER: richer, sharper, WILDER skin — crystalline FACET ridges (abs-sin creases = sharp
        // mathematical structure) + subsurface groove glow (translucent depth), super-creature-class.
        float facets = pow(abs(sin(relief * 11.0) * sin(relief * 7.3 + uTime * 0.3)), 0.4);
        totalEmissiveRadiance += iris * facets * (0.22 + 0.5 * uMenace);
        vec3 subsurf = vec3(0.55, 0.22, 0.12) * (1.0 - fres) * (1.0 - relief) * (0.32 + 0.4 * uEnergy);
        totalEmissiveRadiance += subsurf;
        // STELLAR CORE FORGE (uEnergy = energy/RESOURCE_CAP) — a well-fed titan burns a pulsing star-core.
        float core = pow(1.0 - fres, 4.0) * (0.6 + 0.4 * sin(uTime * 3.0 + relief * 6.2831));
        totalEmissiveRadiance += uColor * core * uEnergy * 1.6;
        // WASTE-ROT ASHEN FISSURES (uEntropy = entropy/threshold) — a wasteful titan cracks; embers glow in the rot.
        float rot = smoothstep(0.62, 0.78, fbm3(vObjP * 4.0 + uTime * 0.02));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.03, 0.03), rot * uEntropy * 0.85);
        totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * rot * uEntropy * 1.3;
        // ── TITAN COLOSSAL SUITE: more named effects, each a FALSIFIABLE readout of a real titan signal
        //    (uMenace aggression · uEnergy resource · uEntropy waste). Additive, gated, no alloc. ──
        // VORTEXICAL MAELSTROM (menace): a swirling vortex winds a menacing colossus.
        float tVort = pow(0.5 + 0.5 * sin(atan(vObjP.z, vObjP.x) * 4.0 + length(vObjP) * 3.0 - uTime * 2.0), 6.0);
        totalEmissiveRadiance += uColor * tVort * uMenace * 0.7;
        // HELIXOLOGY VOID-STRANDS (energy): stellar helix strands wind a well-fed titan.
        float tHelix = pow(0.5 + 0.5 * sin(vObjP.y * 9.0 + atan(vObjP.z, vObjP.x) * 2.0 + uTime * 1.5), 12.0);
        totalEmissiveRadiance += vec3(0.6, 0.8, 1.0) * tHelix * uEnergy * 0.9;
        // NEURALMIMETIC FRACTURE-WEB (entropy): a cracked mimetic web spreads with waste.
        float tWeb = step(0.72, fbm3(vObjP * 9.0 + uTime * 0.03));
        totalEmissiveRadiance += vec3(1.0, 0.5, 0.2) * tWeb * uEntropy * (0.5 + 0.5 * fres) * 1.1;
        // SINGULROSITY EVENT-HORIZON (menace): a dark lensing ring blooms — a titan bends light around itself.
        float tHorizon = smoothstep(0.35, 0.5, fres) * (1.0 - smoothstep(0.5, 0.7, fres));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0), tHorizon * uMenace * 0.5);
        totalEmissiveRadiance += uColor * tHorizon * uMenace * 1.4;
        // BIT-GLITCH REALITY-TEAR (entropy): reality quantizes into glitch blocks as the titan decays.
        float tGlitch = floor((relief + sin(uTime * 8.0) * 0.2) * 5.0) / 5.0;
        totalEmissiveRadiance += vec3(0.2, 1.0, 0.5) * tGlitch * uEntropy * 0.5;
        // CENTRIFUGE ROCAILLE CUBOIDS (menace): rotating cuboid shards centrifuge around the colossus.
        vec3 tCell = floor(vObjP * 4.0 + vec3(uTime * 0.5, 0.0, uTime * 0.3));
        float tCube = step(0.6, h31(tCell)) * pow(fres, 1.5);
        totalEmissiveRadiance += iris * tCube * uMenace * 0.8;
        // IONIZING FLUTTER (energy): ion streaks band along the body as it charges.
        float tIon = pow(0.5 + 0.5 * sin(vObjP.y * 22.0 - uTime * 14.0), 8.0);
        totalEmissiveRadiance += vec3(0.3, 0.6, 1.0) * tIon * uEnergy * 0.8;
        // PLASMA STORM-THERMAL (menace × energy): plasma storm radiance on an angry, charged titan.
        float tPlasma = pow(0.5 + 0.5 * sin(fbm3(vObjP * 5.0 + uTime * 0.5) * 10.0 + uTime * 3.0), 6.0);
        totalEmissiveRadiance += vec3(1.0, 0.4, 0.9) * tPlasma * (uMenace * uEnergy) * 1.0;
        // ── COMBAT LANES (matter hoard · war rage) — new REAL signals, each a falsifiable readout. ──
        // ACCRETION MASS-HOARD (uMatter = matter/RESOURCE_CAP): a heavy titan accretes molten-metal veins.
        float tAccret = smoothstep(0.45, 0.9, fbm3(vObjP * 3.0 - uTime * 0.03));
        totalEmissiveRadiance += vec3(0.85, 0.6, 0.22) * tAccret * uMatter * 0.9;
        // BATTLE-SCAR RAGE PLASMA (uWar = warCount/WAR_RAGE_CAP): a warring titan erupts red rage-plasma spikes.
        float tRage = pow(0.5 + 0.5 * sin(vObjP.y * 17.0 + atan(vObjP.z, vObjP.x) * 3.0 + uTime * 7.0), 8.0);
        totalEmissiveRadiance += vec3(1.0, 0.10, 0.05) * tRage * uWar * 2.2;`,
      );
  };
  mat.customProgramCacheKey = () => 'titanBodyV69-combat';
}

/** The 4D tesseract cage — additive {@link THREE.LineSegments} that rotates pos4 in 4D + projects. */
function buildCageMaterial(u: TitanUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: u as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      attribute vec4 pos4;
      uniform float uTime;
      varying float vW;
      void main() {
        float a = uTime * 0.4, b = uTime * 0.27;
        vec4 q = pos4;
        float x = q.x * cos(a) - q.w * sin(a);
        float w1 = q.x * sin(a) + q.w * cos(a);
        float z = q.z * cos(b) - w1 * sin(b);
        float w2 = q.z * sin(b) + w1 * cos(b);
        float proj = 1.9 / (2.4 - w2);          // 4D -> 3D perspective
        vW = w2;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(vec3(x, q.y, z) * proj, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uMenace;
      uniform float uTime;
      varying float vW;
      vec3 hsv2rgb(vec3 c){ vec4 K=vec4(1.,2./3.,1./3.,3.); vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www); return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y); }
      void main() {
        float glow = 0.45 + 0.55 * (vW * 0.5 + 0.5);
        // USER: the cage was a static single-hue orange wireframe. Now the 4D tesseract COLOUR-CYCLES — hue
        // drifts with time + the 4th-dimension coordinate (vW), so it shimmers a living rainbow as the
        // hypercube rotates in 4D. Reads as an intentional dynamic mathematical lattice, not a noob wireframe.
        float hue = fract(uTime * 0.07 + vW * 0.33);
        vec3 col = hsv2rgb(vec3(hue, 0.88, 0.62)) * (0.55 + 1.3 * uMenace);
        gl_FragColor = vec4(col * glow, 0.72);
      }
    `,
  });
}

/** The ominous Fresnel aura shell — back-side additive halo that reads as light without postfx. */
function buildAuraMaterial(u: TitanUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: u as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; uniform float uMenace; uniform float uTime;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vV), normalize(vN)), 0.0), 2.2);
        float pulse = 0.7 + 0.3 * sin(uTime * 1.7);
        gl_FragColor = vec4(uColor * (0.5 + 1.6 * uMenace) * rim * pulse, rim * (0.35 + 0.5 * uMenace));
      }
    `,
  });
}

/** Pair index tables: pair p ⇔ (PAIR_A[p], PAIR_B[p]), i < j, row-major enumeration. */
const PAIR_A = new Uint8Array(PAIR_COUNT);
const PAIR_B = new Uint8Array(PAIR_COUNT);
{
  let p = 0;
  for (let i = 0; i < TITAN_COUNT; i++) {
    for (let j = i + 1; j < TITAN_COUNT; j++) {
      PAIR_A[p] = i;
      PAIR_B[p] = j;
      p++;
    }
  }
}

/** Zero line for diplomacy resource flows: payoffs above the matrix mean gain energy. */
const PD_MEAN = meanPayoff(PRISONERS_DILEMMA);

/** One row of the public ledger. REUSED — copy fields if you retain them across frames. */
export interface TitanLedgerEntry {
  name: string;
  energy: number;
  matter: number;
  entropy: number;
  /** Number of rivals this titan is currently at war with (0..9). */
  war: number;
}

/** Structural lore facade (satisfied by `LoreEngine` — methods are bivariant). */
export interface TitanLore {
  name(kind: string, i: number): string;
  epithet(kind: string, key: string): string;
}

/** Structural reaction-diffusion facade (satisfied by `ReactionDiffusionSystem`). */
export interface TitanRd {
  perturb(u: number, v: number, r?: number): void;
}

/** Pending waste-scar request. REUSED — see {@link TitanSystem.drainPerturb}. */
export interface PerturbRequest {
  u: number;
  v: number;
  r: number;
  pending: boolean;
}

/** Internal per-titan record (boot-time allocation only). */
interface Titan {
  group: THREE.Group;
  /** Sub-group holding the silhouette meshes — bobbed vertically each frame. */
  rig: THREE.Group;
  /** Counter-rotating satellite holder (empty for some silhouettes). */
  limbSpin: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
  vel: THREE.Vector3;
  ph: number;
  spin: number;
  bobF: number;
  bobA: number;
  /** Silhouette scale factor — drives upkeep and entropy accrual. */
  size: number;
  hue: number;
  name: string;
  epithet: string;
  /** Preferred morphotype base: titan i champions morphs [10i, 10i+5) (phyla alignment). */
  mi: number;
  /** The extra 10 titans are socially center-seeking breeders, not territorial gravity wells. */
  breeder: boolean;
  homeX: number;
  homeZ: number;
  energy: number;
  matter: number;
  entropy: number;
  /** Index into {@link STRATEGIES}. */
  strategy: number;
  warCount: number;
  /** V67: shader uniforms shared by the body patch + cage + aura (driven once per frame). */
  tu: TitanUniforms;
}

/** Derive a pair relation from the recent-window defection counts. O(1). */
function relationOf(h: PairHistory): number {
  const w = h.rounds < HISTORY_WINDOW ? h.rounds : HISTORY_WINDOW;
  if (w === 0) return REL_TRUCE;
  const dA = defections(h.movesA, h.rounds);
  const dB = defections(h.movesB, h.rounds);
  if (dA === 0 && dB === 0 && h.rounds >= 3) return REL_ALLIANCE;
  const half = (w + 1) >> 1;
  if (dA >= half || dB >= half) return REL_WAR;
  return REL_TRUCE;
}

/**
 * Owns the 20 titans: silhouettes, roaming, the {energy, matter, entropy} economy, the
 * staggered pairwise diplomacy, and war strikes. Construct once in world.ts after the
 * EntityManager; call `update(dt, t)` every frame AFTER `ctx.state.frame` is incremented
 * (all cadences key off it), and `drainPerturb()` once per frame after the RD step.
 */
export class TitanSystem implements DomeFeeder {
  /**
   * Latest waste-scar request (REUSED record). The integrator drains it to the rd facade via
   * {@link drainPerturb}; if two waste events land between drains the LATEST wins (scars are
   * cosmetic feedback, not conservation-critical).
   */
  readonly wantsPerturb: PerturbRequest = { u: 0.5, v: 0.5, r: WASTE_SCAR_RADIUS, pending: false };
  /**
   * 20×20 relation matrix, row-major `[i * 20 + j]`: 0 truce, 1 alliance, 2 war. Symmetric,
   * diagonal 0. Mutated in place on diplomacy cadences — treat as read-only outside.
   */
  readonly warMatrix = new Uint8Array(TITAN_COUNT * TITAN_COUNT);

  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  /** F-HOLES: singularity system attached by the composition root; an active hole tugs the titans. */
  private singularity: SingularitySystem | null = null;
  /** F-DIPLO-ECON V16: economic net-worth provider by titan index (null ⇒ no economy coupling). */
  private econWealth: ((titanIndex: number) => number) | null = null;
  private readonly rd: TitanRd;
  private readonly titans: Titan[] = [];
  /** PORTAL DEATH (USER): titans blasted by the portal, awaiting their 5 s respawn ELSEWHERE. */
  private readonly portalDowned: { ti: Titan; at: number }[] = [];
  private portalCullSeq = 0;
  /** Titan-specific fractal-displaced geometries (spiky crystalline bodies), cached per shared geo-type. */
  private readonly titanGeoCache = new Map<number, THREE.BufferGeometry>();
  /** PAIR_COUNT pair histories, indexed by the PAIR_A/PAIR_B tables. */
  private readonly histories: PairHistory[] = [];
  /** REUSED ledger rows backing the public `ledger` view. */
  private readonly led: TitanLedgerEntry[] = [];
  /** Scratch population shares for the bankruptcy replicator. */
  private readonly shares = new Float64Array(STRATEGIES.length);
  /** EMA payoff fitness per strategy (boots neutral at 1). */
  private readonly stratFitness = new Float64Array(STRATEGIES.length).fill(1);
  /** Last RD pattern density fed by the integrator (0..1). */
  private lastRd = 0;
  /** World-owned NHI birth hook; null in tests/headless sims. */
  private procreationSink: ((x: number, y: number, z: number) => void) | null = null;

  /** Builds the TITAN_COUNT colossi (boot-time allocation; ctx.rng draws are boot cadence). */
  constructor(ctx: SimContext, entities: EntityManager, lore: TitanLore, rd: TitanRd) {
    this.ctx = ctx;
    this.entities = entities;
    this.rd = rd;
    const root = new THREE.Group();
    ctx.scene.add(root);
    for (let i = 0; i < TITAN_COUNT; i++) {
      const t = this.buildTitan(i, lore);
      root.add(t.group);
      this.titans.push(t);
      this.led.push({
        name: t.name,
        energy: t.energy,
        matter: t.matter,
        entropy: t.entropy,
        war: 0,
      });
    }
    for (let p = 0; p < PAIR_COUNT; p++) this.histories.push(createHistory());
  }

  /** Number of titans (constant TITAN_COUNT — telemetry). */
  get count(): number {
    return this.titans.length;
  }

  /**
   * Free every titan's GPU resources on World teardown / HMR so VRAM never leaks across dev reloads.
   * Each titan owns per-instance MATERIALS (bodyMat, accentMat, cage + aura ShaderMaterials) — freed by a
   * material-only group traversal — plus a point light. The silhouette GEOMETRIES come from the
   * per-instance {@link titanGeoCache} (freed once via the map) and the MODULE-shared `TITAN_CORE_GEO` /
   * `TITAN_TESSERACT_GEO` (NEVER disposed — a fresh HMR World reuses them, and disposing them would break
   * the next boot). O(titans × parts). */
  /**
   * PORTAL DEATH (USER "everything else DIES"): blast any titan inside the portal kill-cylinder, hide it
   * (body + its own point light), and re-enter it ELSEWHERE {@link PORTAL_RESPAWN_DELAY} s later.
   * Determinism-neutral (no rng, post-ascension only). O(titans).
   */
  portalCull(
    ax: number,
    az: number,
    r2: number,
    t: number,
    onDeath: (x: number, y: number, z: number) => void,
  ): void {
    for (let k = this.portalDowned.length - 1; k >= 0; k--) {
      const d = this.portalDowned[k]!;
      if (t < d.at) continue;
      portalReappearSpot(this.portalCullSeq++, d.ti.group.position);
      d.ti.vel.set(0, 0, 0);
      d.ti.group.visible = true;
      d.ti.light.visible = true;
      this.portalDowned.splice(k, 1);
    }
    for (let i = 0; i < this.titans.length; i++) {
      const ti = this.titans[i];
      if (!ti || !ti.group.visible) continue;
      const p = ti.group.position;
      const dx = p.x - ax;
      const dz = p.z - az;
      if (dx * dx + dz * dz <= r2) {
        onDeath(p.x, p.y, p.z);
        ti.group.visible = false;
        ti.light.visible = false;
        this.portalDowned.push({ ti, at: t + PORTAL_RESPAWN_DELAY });
      }
    }
  }

  /** USER V127 (D): dome-wide feeding — visit each LIVE titan's position (DomeFeeding grazes plants +
   *  eats organisms there). Skips ones downed by the portal. See {@link DomeFeeder}. O(titans). */
  eachFeederPos(cb: (x: number, y: number, z: number) => void): void {
    for (const ti of this.titans) {
      if (!ti || !ti.group.visible) continue;
      const p = ti.group.position;
      cb(p.x, p.y, p.z);
    }
  }

  dispose(): void {
    for (const ti of this.titans) {
      ti.group.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) m.dispose();
      });
      ti.light.removeFromParent();
      ti.group.removeFromParent();
    }
    for (const geo of this.titanGeoCache.values()) geo.dispose();
    this.titanGeoCache.clear();
    this.titans.length = 0;
  }

  /** F-HOLES: wire in the singularity system so an active hole tugs the titans (or null to detach). */
  attachSingularity(singularity: SingularitySystem | null): void {
    this.singularity = singularity;
  }

  /**
   * F-DIPLO-ECON V16: wire in the AURUM/UMBRA economy so wealth disparity drives diplomacy — a titan
   * economically far richer than its rival is emboldened to defect (a wealth-funded raid), tilting the
   * pair toward WAR, while a poorer titan appeases. `wealthByIndex(i)` returns titan i's AURUM net
   * worth. Null (the default + every test) leaves PD diplomacy untouched, so the titan golden tests
   * stay byte-identical — only the wired live world feels the economy steer its wars.
   */
  attachEconomy(wealthByIndex: ((titanIndex: number) => number) | null): void {
    this.econWealth = wealthByIndex;
  }

  /** Wire the center-breeder titan event into the world-owned NHI birth pipeline. */
  attachProcreation(sink: ((x: number, y: number, z: number) => void) | null): void {
    this.procreationSink = sink;
  }

  /**
   * Global economy ledger: a REUSED array of REUSED rows, refreshed at the end of every
   * `update()`. Copy values if you retain them; never mutate. O(1) accessor.
   */
  get ledger(): readonly TitanLedgerEntry[] {
    return this.led;
  }

  /**
   * Integration/testing hook: pin titan `index` to strategy `s` (0..4, see STRATEGIES).
   * Deterministic scenarios (engineered payoffs) are built from this. O(1).
   */
  setStrategy(index: number, s: number): void {
    const t = this.titans[index];
    if (!t) return;
    // NaN seal (audit fix): Math.floor(NaN) = NaN passes straight through clamp's comparisons
    // (both false → returns NaN), and a NaN strategy permanently mutes the titan's diplomacy
    // (every STRATEGIES[strategy] lookup misses). Non-finite input falls back to strategy 0.
    const si = Math.floor(s);
    t.strategy = Number.isFinite(si) ? clamp(si, 0, STRATEGIES.length - 1) : 0;
  }

  /**
   * PRODUCE hook: the integrator calls this when the quantum register collapses
   * (qcircuit.lastCollapse changes). Every titan witnesses the global collapse and
   * banks {@link WITNESS_ENERGY}. O(TITAN_COUNT), allocation-free.
   */
  onCollapseWitness(): void {
    for (let i = 0; i < this.titans.length; i++) {
      const t = this.titans[i];
      if (!t) continue; // invariant: dense array
      t.energy = clamp(t.energy + WITNESS_ENERGY, 0, RESOURCE_CAP);
    }
  }

  /**
   * PRODUCE hook: integrator feeds the current RD pattern density `d` (0..1) on its own
   * cadence; it is applied as entropy relief on subsequent economy ticks. Non-finite
   * values are ignored. O(1).
   */
  feedEntropy(d: number): void {
    if (!Number.isFinite(d)) return;
    this.lastRd = clamp(d, 0, 1);
  }

  /**
   * Route the pending waste scar to the rd facade and clear it. Call once per frame after
   * the RD step; returns true when a perturb was emitted. O(1), allocation-free.
   */
  drainPerturb(): boolean {
    const w = this.wantsPerturb;
    if (!w.pending) return false;
    this.rd.perturb(w.u, w.v, w.r);
    w.pending = false;
    return true;
  }

  /**
   * Per-frame advance: roaming + animation for all TITAN_COUNT titans (pure trig, zero rng), then the
   * internally cadenced economy tick (one titan per {@link ECON_STAGGER} frames), one
   * diplomacy pair slot and one strike-check slot (never the same frame — the half-cycle
   * offset is coprime-safe), and an O(TITAN_COUNT) ledger refresh.
   * O(titans) per frame + O(n) on the single ticking titan's harvest scan; allocation-free
   * outside event-driven spawn/audit calls.
   */
  update(dt: number, t: number): void {
    const frame = this.ctx.state.frame;
    for (let i = 0; i < this.titans.length; i++) {
      const ti = this.titans[i];
      if (!ti) continue; // invariant: dense array
      this.roamAndAnimate(ti, dt, t);
      // F-HOLES: an active singularity tugs the colossi too. No-op when unattached/inactive (so
      // the determinism tests, which summon nothing, stay byte-identical); draws no rng.
      if (this.singularity) {
        const p = ti.group.position;
        if (this.singularity.bodyForce(p.x, p.y, p.z, dt, HOLE_F)) ti.vel.add(HOLE_F);
      }
    }
    // V67: the colossi now MATTER to the world — they soft-collide with each other (no more silent
    // pass-through; contact clashes + blazes) and drag/stain the organisms drifting through their aura
    // (no more passing through "like nothing"). Both are pure vector/colour math, no rng.
    this.titanClash();
    this.applyAura(dt);
    if (frame % BREED_PERIOD === 0) this.procreateAtCenter(frame);
    const econPh = frame % ECON_PERIOD;
    if (econPh % ECON_STAGGER === 0) {
      const k = econPh / ECON_STAGGER;
      if (k < TITAN_COUNT) this.economyTick(k);
    }
    const dPh = frame % DIPLO_PERIOD;
    if (dPh % DIPLO_STRIDE === 0) {
      const p = dPh / DIPLO_STRIDE;
      if (p < PAIR_COUNT) this.diplomacy(p);
    }
    const sPh = (frame + DIPLO_PERIOD / 2) % DIPLO_PERIOD;
    if (sPh % DIPLO_STRIDE === 0) {
      const p = sPh / DIPLO_STRIDE;
      if (p < PAIR_COUNT) this.strikeCheck(p);
    }
    this.refreshLedger();
  }

  /** Center social biology: the extra 10 titans periodically birth real NHIs when enough gather. */
  private procreateAtCenter(frame: number): void {
    if (!this.procreationSink) return;
    let breeders = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < this.titans.length; i++) {
      const ti = this.titans[i];
      if (!ti?.breeder) continue;
      const p = ti.group.position;
      const r2 = p.x * p.x + p.z * p.z;
      if (r2 > BREED_CENTER_R2) continue;
      breeders++;
      cx += p.x;
      cy += p.y;
      cz += p.z;
    }
    if (breeders < BREED_QUORUM) return;
    const births = 1 + ((frame / BREED_PERIOD) % 3);
    const inv = 1 / breeders;
    for (let b = 0; b < births; b++) {
      const a = this.ctx.rng() * TAU;
      const r = 5 + this.ctx.rng() * 18;
      this.procreationSink(
        cx * inv + Math.cos(a) * r,
        cy * inv + 8 + b * 3,
        cz * inv + Math.sin(a) * r,
      );
    }
    this.ctx.audit.record('titan-procreation', { breeders, births });
  }

  /** Boot-time titan factory: silhouette, light, lore identity, seeded economy. */
  private buildTitan(i: number, lore: TitanLore): Titan {
    const ctx = this.ctx;
    const rng = ctx.rng;
    const group = new THREE.Group();
    const rig = new THREE.Group();
    const limbSpin = new THREE.Group();
    const breeder = i >= 10;
    const size = (i < 5 ? 1 : i < 10 ? 1.45 : 1.22) * (1 + 0.12 * (i % 3)) * COLOSSAL;
    const hue = i / TITAN_COUNT;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.45, 0.13),
      emissive: new THREE.Color().setHSL(hue, 0.75, 0.1),
      emissiveIntensity: 0.9,
      metalness: 0.75,
      roughness: 0.25,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.8, 0.3),
      emissive: new THREE.Color().setHSL(hue, 0.9, 0.32),
      emissiveIntensity: 1.6,
      metalness: 0.4,
      roughness: 0.4,
    });
    // V67: per-titan shader uniforms + the freak-geometry patch on BOTH materials, so the silhouette
    // parts writhe + blaze ominously (driven by uMenace) instead of reading as dull toys.
    const tu = makeTitanUniforms();
    tu.uColor.value.setHSL(hue, 0.85, 0.5);
    patchTitanBody(bodyMat, tu);
    patchTitanBody(accentMat, tu);
    this.buildSilhouette(i, size, rig, limbSpin, bodyMat, accentMat);
    limbSpin.position.y = 7 * size;
    rig.add(limbSpin);

    // V67: the WRITHING FRACTAL CORE — a high-detail icosahedron driven by the 4D-writhe shader; the
    // ominous centrepiece that de-toys the silhouette. A 4D TESSERACT CAGE (additive, rotates in 4D
    // and projects to 3D — a real hypercube shadow) envelops it, and a Fresnel AURA shell halos it.
    const core = new THREE.Mesh(TITAN_CORE_GEO, bodyMat);
    core.scale.setScalar(3.4 * size);
    core.position.y = 7 * size;
    core.frustumCulled = false;
    rig.add(core);
    const cage = new THREE.LineSegments(TITAN_TESSERACT_GEO, buildCageMaterial(tu));
    cage.scale.setScalar(6.4 * size);
    cage.position.y = 7 * size;
    cage.frustumCulled = false;
    rig.add(cage);
    const aura = new THREE.Mesh(TITAN_CORE_GEO, buildAuraMaterial(tu));
    aura.scale.setScalar(5.2 * size);
    aura.position.y = 7 * size;
    aura.frustumCulled = false;
    rig.add(aura);
    group.add(rig);

    // One PointLight per titan, decay 0 per the V3.3 contract (see TITAN_LIGHT_GAIN note).
    const light = new THREE.PointLight(0xffffff, TITAN_LIGHT_GAIN, 70 * size, 0);
    light.color.setHSL(hue, 0.7, 0.5);
    light.position.y = 9 * size;
    group.add(light);

    // Patrol post: the original 10 hover over phylum home wedges; the extra 10 prefer a
    // small central social ring where they can meet/procreate without attracting all life.
    const angle = (i / TITAN_COUNT) * TAU + 0.31;
    // USER: distribute ALL titan homes across the WHOLE ±540 square (no central breeder ring — that read
    // as a racetrack) + up the full column. Each titan roams freely around its own scattered home.
    const radius = PLATFORM_HALF * (0.32 + ((i * 7) % 10) * 0.066); // 0.32..0.92 of the rim, well spread
    const homeX = Math.cos(angle) * radius;
    const homeZ = Math.sin(angle) * radius;
    group.position.set(homeX, PLATFORM_FLOOR + 24 + (i % 10) * 20, homeZ); // vary the vertical start 30..210

    const name = lore.name('tribe', 50 + i);
    return {
      group,
      rig,
      limbSpin,
      bodyMat,
      light,
      vel: new THREE.Vector3((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.04),
      ph: rng() * TAU,
      spin: 0.05 + rng() * 0.1,
      bobF: 0.4 + rng() * 0.5,
      bobA: 0.6 + rng() * 0.8,
      size,
      hue,
      name,
      epithet: lore.epithet('puppet', name),
      // Champion block: with contiguous 25-morph phylum blocks (V3.2), titan i
      // champions phylum i's morphs exactly; legacy 100-morph mode degrades to
      // stride-10 blocks. Derived from the LIVE morph table, never a constant.
      mi: i * Math.max(1, Math.floor(this.ctx.morphs.length / TITAN_COUNT)),
      breeder,
      homeX,
      homeZ,
      energy: 60 + rng() * 20,
      matter: 15 + rng() * 10,
      entropy: rng() * 10,
      strategy: Math.floor(rng() * STRATEGIES.length),
      warCount: 0,
      tu,
    };
  }

  /** Boot-time mesh helper: one cached-geometry part under `parent`. */
  private addPart(
    parent: THREE.Object3D,
    geoIdx: number,
    mat: THREE.MeshStandardMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rx = 0,
  ): void {
    const geos = this.ctx.geos;
    const gi = geoIdx % geos.length;
    // Titan-specific FRACTAL-DISPLACED geometry (spiky crystalline, not a smooth blob), cached per geo-type
    // so it's built once and shared across titans. Never touches the shared entity cache (we clone it).
    let geo = this.titanGeoCache.get(gi);
    if (!geo) {
      const base = geos[gi];
      if (!base) return; // invariant: cache has 40 entries — defensive only
      geo = displaceTitanGeo(base, gi + 3);
      this.titanGeoCache.set(gi, geo);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.x = rx;
    parent.add(mesh);
  }

  /** Five distinct silhouette archetypes × territorial/social roles = TITAN_COUNT distinguishable colossi. */
  private buildSilhouette(
    i: number,
    s: number,
    rig: THREE.Group,
    limbSpin: THREE.Group,
    body: THREE.MeshStandardMaterial,
    accent: THREE.MeshStandardMaterial,
  ): void {
    const HALF_PI = Math.PI / 2;
    switch (i % 5) {
      case 0: // COLOSSUS — towering pillar body, glowing head, twin shoulder masses.
        this.addPart(rig, GEO_CYL, body, 0, 6 * s, 0, 2.4 * s, 4.2 * s, 2.4 * s);
        this.addPart(rig, GEO_SPHERE, accent, 0, 13.5 * s, 0, 2.4 * s, 2.4 * s, 2.4 * s);
        this.addPart(rig, GEO_OCTA, body, -3.6 * s, 11 * s, 0, 1.6 * s, 1.6 * s, 1.6 * s);
        this.addPart(rig, GEO_OCTA, body, 3.6 * s, 11 * s, 0, 1.6 * s, 1.6 * s, 1.6 * s);
        break;
      case 1: // RING-LORD — horizontal halo around a writhing organic core, 4 satellites.
        this.addPart(rig, GEO_TORUS_FAT, body, 0, 7 * s, 0, 6 * s, 6 * s, 6 * s, HALF_PI);
        this.addPart(rig, GEO_ORGANIC, accent, 0, 7 * s, 0, 3.2 * s, 3.2 * s, 3.2 * s);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * TAU;
          this.addPart(
            limbSpin,
            GEO_SPHERE,
            accent,
            Math.cos(a) * 7.5 * s,
            0,
            Math.sin(a) * 7.5 * s,
            0.9 * s,
            0.9 * s,
            0.9 * s,
          );
        }
        break;
      case 2: // SPIRE — three stacked cones thinning upward, haloed at the tip.
        this.addPart(rig, GEO_CONE, body, 0, 2.5 * s, 0, 4 * s, 2.5 * s, 4 * s);
        this.addPart(rig, GEO_CONE, body, 0, 7 * s, 0, 2.6 * s, 2.2 * s, 2.6 * s);
        this.addPart(rig, GEO_CONE, accent, 0, 11.5 * s, 0, 1.4 * s, 2.6 * s, 1.4 * s);
        this.addPart(rig, GEO_TORUS_THIN, accent, 0, 14 * s, 0, 2.2 * s, 2.2 * s, 2.2 * s, HALF_PI);
        break;
      case 3: // TWIN — two icosahedral bodies bridged at the waist, one knot orbiter.
        this.addPart(rig, GEO_ICO, body, -3.2 * s, 6 * s, 0, 2.8 * s, 2.8 * s, 2.8 * s);
        this.addPart(rig, GEO_ICO, body, 3.2 * s, 6 * s, 0, 2.8 * s, 2.8 * s, 2.8 * s);
        this.addPart(rig, GEO_BOX, accent, 0, 6 * s, 0, 7 * s, 0.9 * s, 0.9 * s);
        this.addPart(limbSpin, GEO_KNOT, accent, 5 * s, 0, 0, 1.2 * s, 1.2 * s, 1.2 * s);
        break;
      default: {
        // CROWN — dodecahedral core wearing a five-spike cone crown.
        this.addPart(rig, GEO_DODE, body, 0, 6 * s, 0, 3.4 * s, 3.4 * s, 3.4 * s);
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU;
          this.addPart(
            rig,
            GEO_CONE,
            k % 2 === 0 ? accent : body,
            Math.cos(a) * 4.4 * s,
            10.5 * s,
            Math.sin(a) * 4.4 * s,
            0.9 * s,
            1.6 * s,
            0.9 * s,
          );
        }
        break;
      }
    }
  }

  /**
   * Per-frame roam (lorenz-flavored drift with a gentle core pull, contained at ±300) and
   * animation (spin, counter-spin, bob, economy-keyed light/emissive, war tint). Pure trig
   * of (t, phase) — NO rng — plus a finite seal that re-anchors a diverged titan.
   * O(1) per titan, allocation-free (module scratch only).
   */
  private roamAndAnimate(ti: Titan, dt: number, t: number): void {
    const g = ti.group;
    const p = g.position;
    const vel = ti.vel;

    // FREE ROAM (owner: titans must WANDER the whole ±540 square + full 6..240 column, NOT race a central
    // ring — the old curl term `vel += (-p.z·k, +p.x·k)` was a pure orbit around origin = the 'racetrack',
    // and the breeder centre-pull + territory spring pinned them to fixed spots). Each titan is a huge,
    // SLOW beast pursuing its OWN drifting Lissajous waypoint (per-id phase ⇒ the 20 fan across the whole
    // platform), with a gentle weave, a continuous height restore, and a soft square leash; the hard clamp
    // below guards the rim. Low seek accel + heavy damping keeps them majestic, not zippy. Pure trig of
    // (t, id, phase) — draws no rng, so the seeded stream is untouched. Applies to breeders AND roamers
    // alike (breeder status still governs mating elsewhere, just not this racetrack motion).
    const T_HOME_Y = 120;
    const tph = ti.mi * 0.37 + ti.ph; // per-titan phase (mi is distinct per titan) → the 20 spread out
    const trad = 180 + (ti.mi % 5) * 72; // 180..468 — its waypoint orbit sweeps most of the square
    const tdx = Math.cos(t * 0.11 + tph) * trad - p.x;
    const tdy = T_HOME_Y + Math.sin(t * 0.17 + tph) * 96 - p.y; // sweeps ~24..216 of the column
    const tdz = Math.sin(t * 0.13 + tph * 1.3) * trad - p.z;
    const tInv = 0.055 / (Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz) + 1e-6); // USER: faster (0.02→0.055) — visibly roams
    vel.x += tdx * tInv + Math.sin(t * 0.5 + ti.mi * 1.3) * 0.012;
    vel.y += tdy * tInv + Math.sin(t * 0.37 + ti.mi * 2.1) * 0.008;
    vel.z += tdz * tInv + Math.cos(t * 0.43 + ti.mi * 0.7) * 0.012;
    vel.y += (T_HOME_Y - p.y) * 0.0025; // height restore — no sky-float, no ground-crawl
    if (p.x > PLATFORM_HALF) vel.x -= 0.06;
    else if (p.x < -PLATFORM_HALF) vel.x += 0.06;
    if (p.z > PLATFORM_HALF) vel.z -= 0.06;
    else if (p.z < -PLATFORM_HALF) vel.z += 0.06;
    vel.multiplyScalar(0.97); // USER: livelier (0.985→0.97)
    VA.copy(vel).multiplyScalar(dt * 60);
    p.add(VA);
    // USER: square platform + up to the mechalogodrom (was a ROAM_RADIUS 300 circle capped at y90).
    // HARD clamp so a roaming/homing titan can never overshoot the rim (owner law: never off-platform).
    if (p.x > PLATFORM_HALF) {
      p.x = PLATFORM_HALF;
      if (vel.x > 0) vel.x = 0;
    } else if (p.x < -PLATFORM_HALF) {
      p.x = -PLATFORM_HALF;
      if (vel.x < 0) vel.x = 0;
    }
    if (p.z > PLATFORM_HALF) {
      p.z = PLATFORM_HALF;
      if (vel.z > 0) vel.z = 0;
    } else if (p.z < -PLATFORM_HALF) {
      p.z = -PLATFORM_HALF;
      if (vel.z < 0) vel.z = 0;
    }
    if (p.y < 12) {
      p.y = 12;
      if (vel.y < 0) vel.y = 0;
    } else if (p.y > PLATFORM_CEIL) {
      p.y = PLATFORM_CEIL;
      if (vel.y > 0) vel.y = 0;
    }
    // Finite seal: a diverged titan re-anchors home instead of spreading NaN.
    if (!Number.isFinite(p.x + p.y + p.z + vel.x + vel.y + vel.z)) {
      p.set(ti.homeX, 30, ti.homeZ);
      vel.set(0, 0, 0);
    }

    g.rotation.y += ti.spin * dt;
    ti.limbSpin.rotation.y -= ti.spin * 2.3 * dt;
    ti.rig.position.y = Math.sin(t * ti.bobF + ti.ph) * ti.bobA;
    const flick = Math.sin(t * 2.1 + ti.ph);
    const warHot = ti.warCount > 0;
    ti.light.intensity =
      TITAN_LIGHT_GAIN * (0.55 + 0.45 * (ti.energy / RESOURCE_CAP)) * (1 + 0.12 * flick);
    ti.light.color.setHSL(warHot ? 0.015 : ti.hue, 0.7, 0.5);
    ti.bodyMat.emissive.setHSL(warHot ? 0.015 : ti.hue, 0.75, 0.09 + 0.04 * flick);
    const entropyN = ti.entropy / ENTROPY_WASTE_THRESHOLD;
    ti.bodyMat.emissiveIntensity = 0.7 + 1.1 * (entropyN > 1 ? 1 : entropyN);
    // V67: drive the freak-geometry shaders — uTime advances the 4D writhe / tesseract cage / aura,
    // and uMenace (war + clash-heat entropy) makes warring + colliding titans writhe + blaze hardest.
    ti.tu.uTime.value = t;
    ti.tu.uColor.value.setHSL(warHot ? 0.015 : ti.hue, 0.85, 0.5);
    ti.tu.uMenace.value = Math.min(1, 0.18 * ti.warCount + 0.7 * (entropyN > 1 ? 1 : entropyN));
    // V-TITAN-VITALS: distinct REAL economy lanes — energy → stellar-core forge, entropy → waste-rot
    // fissures — so a fed titan blazes a star-core and a wasteful one cracks/rots (granular, not just
    // the blended menace). Pure f(state), no rng.
    const tvl = titanVitalLanes(ti.energy, ti.entropy);
    ti.tu.uEnergy.value = tvl.energyN;
    ti.tu.uEntropy.value = tvl.entropyN;
    // V-TITAN-COMBAT: matter → accretion mass-hoard veins, warCount → battle-scar rage plasma.
    const tcl = titanCombatLanes(ti.matter, ti.warCount);
    ti.tu.uMatter.value = tcl.matterN;
    ti.tu.uWar.value = tcl.warN;
  }

  /**
   * SUSPENDED-ANIMATION visual tick (USER pause redesign): keep every colossus ALIVE IN PLACE while
   * the world is paused — the bob, aura light, body emissive, and freak-geometry shader uniforms all
   * animate on the advancing visual clock `t`, but NOTHING travels and NO rng is drawn. It is a
   * render-only subset of {@link roamAndAnimate}: it deliberately omits the velocity accumulation +
   * position/spin integration (which would drift the seeded golden on resume) and the cadence-driven
   * economy/diplomacy/warfare in {@link update} (which DO draw rng). Reads only frozen titan state +
   * `t`; writes only render objects (rig offset, light, material, shader uniforms). O(titans), no alloc.
   */
  animateInPlace(t: number): void {
    for (let i = 0; i < this.titans.length; i++) {
      const ti = this.titans[i];
      if (!ti) continue; // invariant: dense array
      const flick = Math.sin(t * 2.1 + ti.ph);
      const warHot = ti.warCount > 0;
      ti.rig.position.y = Math.sin(t * ti.bobF + ti.ph) * ti.bobA;
      ti.light.intensity =
        TITAN_LIGHT_GAIN * (0.55 + 0.45 * (ti.energy / RESOURCE_CAP)) * (1 + 0.12 * flick);
      ti.light.color.setHSL(warHot ? 0.015 : ti.hue, 0.7, 0.5);
      ti.bodyMat.emissive.setHSL(warHot ? 0.015 : ti.hue, 0.75, 0.09 + 0.04 * flick);
      const entropyN = ti.entropy / ENTROPY_WASTE_THRESHOLD;
      ti.bodyMat.emissiveIntensity = 0.7 + 1.1 * (entropyN > 1 ? 1 : entropyN);
      ti.tu.uTime.value = t;
      ti.tu.uColor.value.setHSL(warHot ? 0.015 : ti.hue, 0.85, 0.5);
      ti.tu.uMenace.value = Math.min(1, 0.18 * ti.warCount + 0.7 * (entropyN > 1 ? 1 : entropyN));
      const tvl = titanVitalLanes(ti.energy, ti.entropy);
      ti.tu.uEnergy.value = tvl.energyN;
      ti.tu.uEntropy.value = tvl.entropyN;
      const tcl = titanCombatLanes(ti.matter, ti.warCount);
      ti.tu.uMatter.value = tcl.matterN;
      ti.tu.uWar.value = tcl.warN;
    }
  }

  /**
   * V67 AURA: organisms drifting within {@link AURA_R} of a colossus are caught in a tangential
   * wake and HUE-STAINED toward the titan's freak-geometry colour — so they no longer pass through
   * it "like nothing", but they are not dragged into a central gravity well. The
   * scan is strided (each organism visited every 3rd frame) to bound the O(n·titans) cost at the mega
   * tier. Pure vector + colour math, NO rng (determinism-neutral). O(n/3 · titans) with an early-out.
   */
  private applyAura(dt: number): void {
    const list = this.entities.list;
    const n = list.length;
    if (n === 0) return;
    const titans = this.titans;
    for (let idx = this.ctx.state.frame % 3; idx < n; idx += 3) {
      const e = list[idx];
      if (!e) continue;
      const ep = e.position;
      const v = e.userData.vel;
      for (let k = 0; k < titans.length; k++) {
        const tk = titans[k];
        if (!tk) continue;
        const tp = tk.group.position;
        const dx = tp.x - ep.x;
        const dy = tp.y - ep.y;
        const dz = tp.z - ep.z;
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 > AURA_R2 || r2 < 1e-3) continue;
        const r = Math.sqrt(r2);
        const inv = (Math.min(AURA_G / r2, AURA_CAP) * dt) / r; // capped r⁻² eddy → unit·accel·dt
        // Tangential wake only: organisms swirl, stain, recoil, and leave. This deliberately avoids
        // the previous "everything sucked into titan gravity" failure mode.
        v.x += -dz * inv;
        v.y += Math.sin(this.ctx.state.frame * 0.03 + k) * inv * 0.28;
        v.z += dx * inv;
        e.material.color.lerp(tk.tu.uColor.value, 0.02 * (1 - r / AURA_R)); // ontological hue-stain
        // V69 SHOCK: an organism that strays into the inner well RECOILS — a brief speed-sap (stun), so
        // it no longer drifts through "like nothing"; the colossus's freak-geometry physically rebukes
        // it. The inner zone overlaps the harvest reach, so the captured are soon consumed (economyTick).
        if (r2 < AURA_R2 * AURA_SHOCK_R2_FRAC) {
          v.x *= AURA_SHOCK_DAMP;
          v.y *= AURA_SHOCK_DAMP;
          v.z *= AURA_SHOCK_DAMP;
        }
      }
    }
  }

  /**
   * V67 CLASH: titans no longer silently overlap. Every frame the PAIR_COUNT pairs are distance-checked
   * (cheap); when two come within {@link TITAN_TOUCH_K}·(sizeA+sizeB) they SOFT-REPEL apart and the
   * contact spikes both titans' entropy by {@link TITAN_CLASH_HEAT}·overlap — which drives uMenace, so
   * the colliding colossi visibly WRITHE + BLAZE (the freak-geometry light show). No rng; O(PAIR_COUNT).
   */
  private titanClash(): void {
    const titans = this.titans;
    let fracture = 0; // accumulated clash overlap this frame — the reality-fracture energy
    for (let pi = 0; pi < PAIR_COUNT; pi++) {
      const a = titans[PAIR_A[pi] ?? 0];
      const b = titans[PAIR_B[pi] ?? 0];
      if (!a || !b) continue;
      const ap = a.group.position;
      const bp = b.group.position;
      const dx = ap.x - bp.x;
      const dy = ap.y - bp.y;
      const dz = ap.z - bp.z;
      const r2 = dx * dx + dy * dy + dz * dz;
      const touch = TITAN_TOUCH_K * (a.size + b.size);
      if (r2 >= touch * touch || r2 < 1e-3) continue;
      const r = Math.sqrt(r2);
      const overlap = (touch - r) / touch; // 0..1
      const inv = (overlap * 0.06) / r;
      a.vel.x += dx * inv;
      a.vel.z += dz * inv;
      b.vel.x -= dx * inv;
      b.vel.z -= dz * inv;
      const heat = TITAN_CLASH_HEAT * overlap;
      a.entropy = Math.min(RESOURCE_CAP, a.entropy + heat);
      b.entropy = Math.min(RESOURCE_CAP, b.entropy + heat);
      fracture += overlap;
      // A deep clash is logged — frame-gated so a sustained overlap can never spam the audit trail.
      if (overlap > 0.6 && this.ctx.state.frame % 45 === 0) {
        this.ctx.audit.record('titan-clash', {
          a: a.name,
          b: b.name,
          overlap: Math.round(overlap * 100) / 100,
        });
      }
    }
    // V69 WORLD-PHYSICS WARP: the ominous colossi don't just sit in the cosmos — they BEND it. Each
    // clash fractures reality and titans locked in WAR keep it destabilised, raising the world's chaos
    // scalar — which ripples through weather, the economy and entity jitter (all chaos-coupled). Pure
    // math (no rng); bounded + clamped, and the integrator decays chaos, so calm titans leave it be.
    let wars = 0;
    for (let i = 0; i < titans.length; i++) wars += titans[i]?.warCount ?? 0;
    const warp = fracture * CLASH_CHAOS + wars * WAR_CHAOS;
    const s = this.ctx.state;
    if (warp > 0 && s.chaos < TITAN_CHAOS_CEIL) {
      const next = s.chaos + warp;
      s.chaos = next < TITAN_CHAOS_CEIL ? next : TITAN_CHAOS_CEIL;
    }
  }

  /**
   * One titan economy tick (cadence: every {@link ECON_PERIOD} frames, staggered):
   * PRODUCE (harvest via `entities.disposeAt`, O(n) scan like the shoggoth feed),
   * metabolize matter→energy, accrue entropy (less RD relief), CONSUME upkeep (bankruptcy
   * mutates strategy via replicator), WASTE (queue a ground scar), then clamp + NaN-seal
   * all three resources into [0, RESOURCE_CAP].
   */
  private economyTick(k: number): void {
    const ti = this.titans[k];
    if (!ti) return; // invariant: k < TITAN_COUNT
    const list = this.entities.list;
    const p = ti.group.position;

    let harvested = 0;
    if (list.length > HARVEST_MIN_POPULATION) {
      for (
        let i = list.length - 1;
        i >= 0 && harvested < HARVEST_MAX && list.length > HARVEST_MIN_POPULATION;
        i--
      ) {
        const e = list[i];
        if (!e) continue; // invariant: list is dense
        // V122 (USER #3 root cause): NHI MATRIX beings are NOT biomass. They are age-immortal by
        // design, but a titan harvest silently disposed a launched NHI's body seconds after launch —
        // unregistering its mind and blanking the NHI observatory (FIRING/MEMORY "show nothing").
        if (e.userData.isNhi) continue;
        if (dist2XZ(p.x, p.z, e.position.x, e.position.z) < HARVEST_REACH2) {
          ti.matter += MATTER_PER_ENTITY * e.userData.sc;
          this.entities.disposeAt(i);
          harvested++;
        }
      }
    }

    const m = Math.min(ti.matter, METABOLIZE_RATE);
    ti.matter -= m;
    ti.energy += m * METABOLIZE_EFF;

    ti.entropy +=
      ENTROPY_PER_TICK * ti.size + harvested * ENTROPY_PER_HARVEST - this.lastRd * ENTROPY_RELIEF;
    if (ti.entropy < 0) ti.entropy = 0;

    ti.energy -= UPKEEP_BASE + UPKEEP_PER_SIZE * ti.size;
    if (ti.energy <= 0) this.bankrupt(k);

    if (ti.entropy >= ENTROPY_WASTE_THRESHOLD) {
      ti.entropy *= ENTROPY_WASTE_RETAIN;
      const w = this.wantsPerturb;
      w.u = clamp(0.5 + p.x / GROUND_EXTENT, 0, 1);
      w.v = clamp(0.5 - p.z / GROUND_EXTENT, 0, 1); // plane is X-rotated: v runs against +z
      w.r = WASTE_SCAR_RADIUS;
      w.pending = true;
    }

    ti.energy = clamp(Number.isFinite(ti.energy) ? ti.energy : 0, 0, RESOURCE_CAP);
    ti.matter = clamp(Number.isFinite(ti.matter) ? ti.matter : 0, 0, RESOURCE_CAP);
    ti.entropy = clamp(Number.isFinite(ti.entropy) ? ti.entropy : 0, 0, RESOURCE_CAP);
  }

  /**
   * Bankruptcy: replicator-dynamics strategy mutation. Population shares come from the live
   * TITAN_COUNT strategy census, fitness from the diplomacy payoff EMA; the new strategy is
   * sampled from the post-step distribution with one seeded draw. Mutation-free dynamics:
   * extinct strategies cannot respawn (corner states absorb — documented in games.ts).
   */
  private bankrupt(k: number): void {
    const ti = this.titans[k];
    if (!ti) return; // invariant: k < TITAN_COUNT
    const shares = this.shares;
    shares.fill(0);
    for (let i = 0; i < this.titans.length; i++) {
      const o = this.titans[i];
      if (!o) continue; // invariant: dense array
      shares[o.strategy] = (shares[o.strategy] ?? 0) + 1 / TITAN_COUNT;
    }
    replicatorStep(shares, this.stratFitness, REPLICATOR_DT);
    const r = this.ctx.rng();
    let acc = 0;
    let next = ti.strategy;
    for (let i = 0; i < shares.length; i++) {
      acc += shares[i] ?? 0;
      if (r < acc) {
        next = i;
        break;
      }
    }
    ti.strategy = next;
    ti.energy = BANKRUPT_SEED_ENERGY;
    this.ctx.audit.record('titan-bankruptcy', {
      name: ti.name,
      epithet: ti.epithet,
      strategy: STRATEGIES[next]?.name ?? '?',
    });
  }

  /**
   * One staggered diplomacy slot: pair `p` plays a PD round (stochastic strategies fed two
   * seeded draws), the result is pushed into the pair ring, payoffs flow into the energy
   * ledger (zero line at the matrix mean, stake scaled by the poorer party), per-strategy
   * fitness EMAs update, and the pair relation is re-derived (audited on change). O(1).
   */
  private diplomacy(p: number): void {
    const i = PAIR_A[p] ?? 0;
    const j = PAIR_B[p] ?? 0;
    const a = this.titans[i];
    const b = this.titans[j];
    const h = this.histories[p];
    if (!a || !b || !h) return; // invariant: tables sized for PAIR_COUNT
    const sa = STRATEGIES[a.strategy];
    const sb = STRATEGIES[b.strategy];
    if (!sa || !sb) return; // invariant: strategy clamped to registry range
    const rng = this.ctx.rng;
    const round = playRound(PRISONERS_DILEMMA, sa.move, sb.move, h, rng(), rng());
    pushHistory(h, round.a, round.b);

    // F-DIPLO-ECON V16: the AURUM/UMBRA economy steers diplomacy. When one titan is far richer than
    // its rival, its wealth emboldens a raid (an extra logged defection by the richer side) while the
    // poorer appeases — so economic dominance, not just the PD strategy, decides who marches to war.
    // Reads the deterministic economy + one ctx.rng draw, ONLY when an economy is wired (tests skip).
    if (this.econWealth) {
      const wi = this.econWealth(i);
      const wj = this.econWealth(j);
      const tot = wi + wj;
      if (tot > 0) {
        const dom = (wi - wj) / tot; // −1..+1; positive ⇒ titan i is the richer power
        if (Math.abs(dom) > 0.2 && rng() < Math.abs(dom) * WEALTH_AGGRESSION) {
          if (dom > 0)
            pushHistory(h, 1, 0); // i defects on j — a wealth-funded raid
          else pushHistory(h, 0, 1); // j defects on i
        }
      }
    }

    const stake = PAYOFF_STAKE_BASE + PAYOFF_STAKE_SCALE * Math.min(a.energy, b.energy);
    a.energy = clamp(a.energy + (round.payoffA - PD_MEAN) * stake, 0, RESOURCE_CAP);
    b.energy = clamp(b.energy + (round.payoffB - PD_MEAN) * stake, 0, RESOURCE_CAP);

    const fit = this.stratFitness;
    fit[a.strategy] = (fit[a.strategy] ?? 0) * FITNESS_DECAY + round.payoffA * (1 - FITNESS_DECAY);
    fit[b.strategy] = (fit[b.strategy] ?? 0) * FITNESS_DECAY + round.payoffB * (1 - FITNESS_DECAY);

    const rel = relationOf(h);
    const cell = i * TITAN_COUNT + j;
    const prev = this.warMatrix[cell] ?? REL_TRUCE;
    if (rel !== prev) {
      this.warMatrix[cell] = rel;
      this.warMatrix[j * TITAN_COUNT + i] = rel;
      if (prev === REL_WAR) {
        a.warCount--;
        b.warCount--;
      }
      if (rel === REL_WAR) {
        a.warCount++;
        b.warCount++;
        this.ctx.audit.record('titan-war', { a: a.name, b: b.name, omen: a.epithet });
      } else if (rel === REL_ALLIANCE) {
        this.ctx.audit.record('titan-alliance', { a: a.name, b: b.name, omen: b.epithet });
      }
    }
  }

  /**
   * One staggered strike slot (half a diplomacy cycle after pair `p` last negotiated): if the
   * pair is at WAR and the richer side can fund it, execute a territory strike at the rival's
   * position — energy raid, loot, burst spawn of the aggressor's champion morphs, scatter
   * impulse, and conscription remorphs via the grid query. Event-driven allocations only
   * (spawn/audit); the scatter path reuses module scratch. O(k) grid neighbors + O(BURST).
   */
  private strikeCheck(p: number): void {
    const i = PAIR_A[p] ?? 0;
    const j = PAIR_B[p] ?? 0;
    if ((this.warMatrix[i * TITAN_COUNT + j] ?? REL_TRUCE) !== REL_WAR) return;
    const a = this.titans[i];
    const b = this.titans[j];
    if (!a || !b) return; // invariant: tables sized for PAIR_COUNT
    const agg = a.energy >= b.energy ? a : b;
    const def = agg === a ? b : a;
    if (agg.energy < STRIKE_COST * 2) return;

    agg.energy -= STRIKE_COST;
    def.energy = Math.max(0, def.energy - RAID_LOSS);
    agg.matter = clamp(agg.matter + LOOT_MATTER, 0, RESOURCE_CAP);

    const ctx = this.ctx;
    const rng = ctx.rng;
    const dp = def.group.position;
    const nearby = ctx.grid.query(dp.x, dp.z, STRIKE_RADIUS);
    let conscripted = 0;
    for (let ni = 0; ni < nearby.length; ni++) {
      const en = nearby[ni];
      if (!en) continue; // noUncheckedIndexedAccess: ni < length
      const ep = en.position;
      if (dist2XZ(dp.x, dp.z, ep.x, ep.z) >= STRIKE_REACH2) continue;
      VA.copy(ep).sub(dp);
      VA.y += 0.5;
      VA.normalize().multiplyScalar(SCATTER_KICK);
      en.userData.vel.add(VA);
      if (conscripted < CONSCRIPT_MAX) {
        // Conscription remorphs into the aggressor's champion block (live table).
        this.entities.remorph(en, (agg.mi + Math.floor(rng() * 5)) % ctx.morphs.length);
        conscripted++;
      }
    }
    for (let s = 0; s < BURST_COUNT; s++) {
      VB.set(dp.x + (rng() - 0.5) * 8, dp.y + (rng() - 0.5) * 4, dp.z + (rng() - 0.5) * 8);
      this.entities.spawn(VB, (agg.mi + s) % ctx.morphs.length, 0.7);
    }
    ctx.audit.record('titan-strike', {
      aggressor: agg.name,
      target: def.name,
      omen: agg.epithet,
      conscripted,
    });
  }

  /** Refresh the REUSED ledger rows from titan state. O(TITAN_COUNT) field writes, allocation-free. */
  private refreshLedger(): void {
    for (let i = 0; i < this.titans.length; i++) {
      const ti = this.titans[i];
      const row = this.led[i];
      if (!ti || !row) continue; // invariant: parallel dense arrays
      row.name = ti.name;
      row.energy = ti.energy;
      row.matter = ti.matter;
      row.entropy = ti.entropy;
      row.war = ti.warCount;
    }
  }
}
