/**
 * Leviathans (F-BEINGS) — a fourth order of colossal non-human intelligence beyond the shoggoths,
 * puppet-masters, and titans: serpentine drifters that sail the mid-field on slow sinusoidal
 * currents, undulating and pulsing with an inner glow. They are majestic scenery-scale life — and as
 * of V1.3 they are no longer pure scenery: as they roam they STIR the primordial reaction-diffusion
 * substrate beneath them (via {@link ReactionDiffusionSystem.seedDeterministic}, opt-in), a genuine
 * reciprocal ecological effect on the world the organisms grow in.
 *
 * Determinism: the constructor draws NO rng and `update()` draws none either — every position, hue,
 * undulation, AND substrate stir is a pure function of the leviathan's index and the sim clock. So the
 * system is boot-stream-neutral (the composition root may construct it anywhere without shifting the
 * seeded stream) and its motion is identical for a given seed. World coupling: it READS an active
 * singularity through {@link SingularitySystem.bodyForce} (F-HOLES) and WRITES a deterministic (rng-free)
 * disturbance into the RD ground — neither draws rng, so bit-reproducibility is preserved.
 */
import * as THREE from 'three';
import { ARENA_MID, GROUND_EXTENT, HABITAT_MID, HABITAT_Y_SCALE, MID_RADIUS2 } from './constants';
import { POINT_LIGHT_GAIN } from './environment';
import type { SimContext } from '../types';
import type { SingularitySystem } from './singularities';
import type { ReactionDiffusionSystem } from './reaction-diffusion';
import {
  PORTAL_RESPAWN_DELAY,
  portalReappearSpot,
  type PortalCullable,
} from './portal-death-fauna';
import type { DomeFeeder } from './dome-feeding';

/** How many leviathans sail the world (fixed — telemetry-friendly, cheap). */
const COUNT = 4;
/** Silhouette scale — large enough to read as colossal against the monoliths. */
const COLOSSAL = 4;
/** Roam ring radius (mid-field, inside the shoggoth/quantum containment). */
const ROAM_R = 48 * HABITAT_MID;
/** Per-leviathan additive base hues (cold abyssal palette), indexed by id. */
const HUES = [0.55, 0.62, 0.48, 0.7] as const;
/** V1.3 ECOLOGY: a leviathan stirs the RD substrate every STIR_EVERY frames (slow, deterministic, rng-free). */
const STIR_EVERY = 45;

/** Module scratch — `update()` never allocates per frame. */
const HOLE_F = new THREE.Vector3();
const V1 = new THREE.Vector3();

/** Internal per-leviathan record. */
/** Speed→surge gain: a leviathan velocity magnitude of ~1.25 world-units/frame saturates the surge. */
const LEVIATHAN_SURGE_SCALE = 0.8;

/**
 * Map a leviathan's REAL speed (velocity magnitude) to a `[0,1]` surge — a diving/accelerating colossus
 * blazes, a gliding one dims. Replaces the old clock-driven `sin(t)` glow pulse so the body reads its
 * actual motion, not a metronome. Finite-guarded, clamped. Pure, no rng. O(1). See
 * tests/leviathan-surge.test.ts.
 */
export function leviathanSurge(speed: number): number {
  const v = (Number.isFinite(speed) ? speed : 0) * LEVIATHAN_SURGE_SCALE;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Depth span (world Y) over which a leviathan reads from surface (0) to deepest (1) — its roam column. */
const LEVIATHAN_DEPTH_SPAN = 28 * HABITAT_Y_SCALE;

/**
 * Map a leviathan's REAL height (world Y) to a `[0,1]` descent signal — high in the column → 0, deep
 * near the floor → 1 — driving the helix + phosphor-gas deep-sea effects. Finite-guarded, clamped.
 * Pure, no rng. O(1). See tests/leviathan-surge.test.ts.
 */
export function leviathanDepth(y: number): number {
  const d =
    (LEVIATHAN_DEPTH_SPAN - (Number.isFinite(y) ? y : LEVIATHAN_DEPTH_SPAN)) / LEVIATHAN_DEPTH_SPAN;
  return d < 0 ? 0 : d > 1 ? 1 : d;
}

/** Per-leviathan shader uniforms driven from real state each frame (surge = speed, depth = height). */
interface LeviathanUniforms {
  uTime: THREE.IUniform<number>;
  uSurge: THREE.IUniform<number>;
  uDepth: THREE.IUniform<number>;
}

/** GLSL header injected after the leviathan body's fragment `<common>` — varyings, uniforms, fBm. */
const LEVIATHAN_FRAG_HEADER = /* glsl */ `
varying vec3 vLObjP;
uniform float uTime; uniform float uSurge; uniform float uDepth;
float lHash(vec3 p){ return fract(sin(dot(p, vec3(27.17, 61.31, 11.71))) * 43758.5453); }
float lNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(lHash(i), lHash(i + vec3(1,0,0)), f.x), mix(lHash(i + vec3(0,1,0)), lHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(lHash(i + vec3(0,0,1)), lHash(i + vec3(1,0,1)), f.x), mix(lHash(i + vec3(0,1,1)), lHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float lFbm(vec3 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++){ s += a * lNoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
`;

/**
 * Patch a leviathan body material with the V-LEVIATHAN-EXPANDED named-effect suite: 7 GPU effects,
 * each a FALSIFIABLE readout of the colossus's REAL motion — surge (speed) drives plasma / storm-thermal
 * / vortexical-wake / singulrosity-bloom, depth (height) drives helixology + phosphor-gas, and a
 * milky-brushed nacre sheen rides the fresnel always. GPU-only, no per-frame CPU, no rng: a gliding
 * leviathan is calm, a diving one blazes.
 */
function patchLeviathanBody(mat: THREE.MeshStandardMaterial, u: LeviathanUniforms): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = u.uTime;
    shader.uniforms['uSurge'] = u.uSurge;
    shader.uniforms['uDepth'] = u.uDepth;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLObjP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLObjP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>${LEVIATHAN_FRAG_HEADER}`)
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        float lFres = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 3.0);
        float lF = lFbm(vLObjP * 0.5);
        // PLASMA EXPANDED (surge) — plasma discharge veins race a fast-diving colossus.
        float lPlasma = pow(0.5 + 0.5 * sin(vLObjP.x * 8.0 + vLObjP.y * 5.0 + uTime * 6.0 + lF * 6.2831), 6.0);
        totalEmissiveRadiance += vec3(0.5, 0.7, 1.0) * lPlasma * uSurge * 1.6;
        // STORM THERMAL RADIANCE (surge) — a thermal bloom rims an accelerating body.
        totalEmissiveRadiance += vec3(1.0, 0.5, 0.2) * pow(lFres, 2.0) * uSurge * 0.8;
        // HELIXOLOGY COSMOS (depth) — bioluminescent helix strands wind the serpent in the deep.
        float lHelix = pow(0.5 + 0.5 * sin(vLObjP.x * 3.0 + atan(vLObjP.z, vLObjP.y) * 2.0 + uTime * 1.5), 10.0);
        totalEmissiveRadiance += vec3(0.3, 1.0, 0.8) * lHelix * (0.3 + 0.7 * uDepth) * 0.9;
        // MILKY BRUSHED NACRE — an iridescent pearl sheen brushes the whale-hide (always on the rim).
        vec3 lNacre = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + lF * 6.2831 + lFres * 6.0);
        totalEmissiveRadiance += lNacre * pow(lFres, 1.5) * 0.35;
        // PHOSPHOR GASEOUSNESS (depth) — deep-sea phosphor gas clings to a diving colossus.
        float lGas = fract(lF * 1.8 + uTime * 0.1); lGas = lGas * (1.0 - lGas) * 4.0;
        totalEmissiveRadiance += vec3(0.2, 0.9, 0.7) * lGas * uDepth * 0.6;
        // VORTEXICAL WAKE (surge) — a swirling wake winds off a fast leviathan.
        float lVort = pow(0.5 + 0.5 * sin(atan(vLObjP.z, vLObjP.x) * 4.0 + length(vLObjP) * 2.0 - uTime * 3.0), 6.0);
        totalEmissiveRadiance += vec3(0.4, 0.6, 1.0) * lVort * uSurge * 0.7;
        // SINGULROSITY BLOOM (surge) — a hot core halo blooms on a surging colossus.
        totalEmissiveRadiance += vec3(0.8, 0.9, 1.0) * pow(1.0 - lFres, 3.0) * uSurge * 1.0;
        // SUNSET EXPANDED (depth) — a warm sunset rides the surface, cooling into the abyssal deep.
        vec3 lSunset = mix(vec3(0.95, 0.4, 0.15), vec3(0.12, 0.08, 0.42), uDepth);
        totalEmissiveRadiance += lSunset * pow(lFres, 2.5) * (0.25 + 0.35 * (1.0 - uDepth));`,
      );
  };
  mat.customProgramCacheKey = () => 'leviathanExpandedV2-sunset';
}

interface Leviathan {
  group: THREE.Group;
  body: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  aura: THREE.PointLight;
  vel: THREE.Vector3;
  /** Phase offset, derived from the index (golden-angle spread) — not rng. */
  ph: number;
  hue: number;
  /** Per-leviathan shader uniforms for the V-LEVIATHAN-EXPANDED suite (driven from real state). */
  u: LeviathanUniforms;
}

/**
 * Owns the four leviathans. Constructed once by the composition root; `update(dt, t)` is called
 * every frame. `attachSingularity` opts the colossi into the F-HOLES force field (no-op until
 * attached). `count` feeds optional telemetry.
 */
export class LeviathanSystem implements PortalCullable, DomeFeeder {
  private readonly levs: Leviathan[] = [];
  /** PORTAL DEATH (USER): leviathans blasted by the portal, awaiting their 5 s respawn ELSEWHERE. */
  private readonly portalDowned: { lv: Leviathan; at: number }[] = [];
  private portalCullSeq = 0;
  private singularity: SingularitySystem | null = null;
  /** V1.3 ECOLOGY: the reaction-diffusion ground the colossi stir as they roam (opt-in, no-op until set). */
  private rd: ReactionDiffusionSystem | null = null;
  /** Deterministic frame counter gating the (rng-free) substrate stir — keeps the colossi stream-neutral. */
  private stirTick = 0;

  // Only the scene is needed past construction; the rest of the context (rng, grid, …) is unused
  // by design — leviathans draw no rng and touch no organism state (F-BEINGS additive contract).
  constructor(ctx: SimContext) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    // A capsule body reads as a sea-serpent/whale silhouette; built once, deterministically.
    const geo = new THREE.CapsuleGeometry(1.6 * COLOSSAL, 9 * COLOSSAL, 5, 14);
    for (let i = 0; i < COUNT; i++) {
      const hue = HUES[i] ?? 0.55;
      const group = new THREE.Group();
      const ang = (i / COUNT) * Math.PI * 2;
      group.position.set(
        Math.cos(ang) * ROAM_R,
        (18 + (i % 2) * 10) * HABITAT_Y_SCALE,
        Math.sin(ang) * ROAM_R,
      );
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.5, 0.25),
        emissive: new THREE.Color().setHSL(hue, 0.7, 0.15),
        emissiveIntensity: 1.2,
        metalness: 0.3,
        roughness: 0.6,
        transparent: true,
        opacity: 0.9,
      });
      // V-LEVIATHAN-EXPANDED: patch the body with the named-effect suite, driven from real state.
      const u: LeviathanUniforms = {
        uTime: { value: 0 },
        uSurge: { value: 0 },
        uDepth: { value: 0 },
      };
      patchLeviathanBody(mat, u);
      const body = new THREE.Mesh(geo, mat);
      body.rotation.z = Math.PI / 2; // lie the capsule horizontal so it swims, not stands
      group.add(body);
      const aura = new THREE.PointLight(new THREE.Color().setHSL(hue, 0.6, 0.4), 0, 90 * ARENA_MID);
      aura.position.y = 4;
      group.add(aura);
      root.add(group);
      this.levs.push({
        group,
        body,
        mat,
        aura,
        vel: new THREE.Vector3(),
        ph: i * 2.399963229728653, // golden angle in radians — even, rng-free spread
        hue,
        u,
      });
    }
  }

  /** Number of leviathans (constant — telemetry). */
  get count(): number {
    return this.levs.length;
  }

  /**
   * Free the leviathans' GPU resources on World teardown / HMR so VRAM never leaks across dev reloads.
   * The capsule GEOMETRY is shared by all four bodies (dispose ONCE); each leviathan owns its OWN
   * MeshStandardMaterial (the V-LEVIATHAN-EXPANDED patch) — dispose each — plus a point-light aura. O(4).
   */
  /**
   * PORTAL DEATH (USER "everything else DIES"): blast any leviathan inside the portal kill-cylinder,
   * hide it, and re-enter it ELSEWHERE {@link PORTAL_RESPAWN_DELAY} s later. Determinism-neutral (no rng,
   * post-ascension only). See {@link PortalCullable}. O(4).
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
      portalReappearSpot(this.portalCullSeq++, d.lv.group.position);
      d.lv.vel.set(0, 0, 0);
      d.lv.group.visible = true;
      this.portalDowned.splice(k, 1);
    }
    for (let i = 0; i < this.levs.length; i++) {
      const lv = this.levs[i];
      if (!lv || !lv.group.visible) continue;
      const p = lv.group.position;
      const dx = p.x - ax;
      const dz = p.z - az;
      if (dx * dx + dz * dz <= r2) {
        onDeath(p.x, p.y, p.z);
        lv.group.visible = false;
        this.portalDowned.push({ lv, at: t + PORTAL_RESPAWN_DELAY });
      }
    }
  }

  /** USER V127 (D): dome-wide feeding — visit each LIVE leviathan's position (DomeFeeding grazes plants
   *  + eats organisms there). Skips ones downed by the portal. See {@link DomeFeeder}. O(4). */
  eachFeederPos(cb: (x: number, y: number, z: number) => void): void {
    for (const lv of this.levs) {
      if (!lv || !lv.group.visible) continue;
      const p = lv.group.position;
      cb(p.x, p.y, p.z);
    }
  }

  dispose(): void {
    let geoDisposed = false;
    for (const lv of this.levs) {
      if (!geoDisposed) {
        lv.body.geometry.dispose(); // the CapsuleGeometry is shared across all leviathans — free it once
        geoDisposed = true;
      }
      lv.mat.dispose();
      lv.group.removeFromParent();
    }
    this.levs.length = 0;
  }

  /** F-HOLES: wire in the singularity system so an active hole tugs the leviathans (or null to detach). */
  attachSingularity(singularity: SingularitySystem | null): void {
    this.singularity = singularity;
  }

  /** V1.3 ECOLOGY: opt the colossi into stirring the primordial RD substrate as they roam (or null to detach). */
  attachReactionDiffusion(rd: ReactionDiffusionSystem | null): void {
    this.rd = rd;
  }

  /**
   * Advance all leviathans: a slow sinusoidal sail through the mid-field, a gentle undulation +
   * glow pulse, and the F-HOLES body force. Allocation-free, rng-free. O(COUNT) per frame.
   */
  update(dt: number, t: number): void {
    // V1.3 ECOLOGY: every STIR_EVERY frames the colossi seed the RD substrate at their position — a real
    // reciprocal effect on the world (no longer pure scenery), done deterministically so they stay
    // stream-neutral; the RD ground's own Gray-Scott decay means this can never diverge.
    const doStir = this.rd !== null && this.stirTick++ % STIR_EVERY === 0;
    for (let i = 0; i < this.levs.length; i++) {
      const lv = this.levs[i];
      if (!lv) continue; // noUncheckedIndexedAccess: i < length
      const g = lv.group;
      const p = g.position;

      // Sinusoidal sail: a wide lazy orbit whose radius and height breathe over time.
      const orbit = t * 0.04 + lv.ph;
      const r = ROAM_R * (0.85 + Math.sin(t * 0.05 + lv.ph) * 0.15);
      lv.vel.x += (Math.cos(orbit) * r - p.x) * 0.0006 * dt * 60;
      lv.vel.z += (Math.sin(orbit) * r - p.z) * 0.0006 * dt * 60;
      lv.vel.y +=
        (18 * HABITAT_Y_SCALE + Math.sin(t * 0.07 + lv.ph) * 12 * HABITAT_Y_SCALE - p.y) *
        0.0005 *
        dt *
        60;
      lv.vel.multiplyScalar(0.96);

      // F-HOLES: an active singularity drags the colossus too (no-op when unattached/inactive).
      if (this.singularity && this.singularity.bodyForce(p.x, p.y, p.z, dt, HOLE_F)) {
        lv.vel.add(HOLE_F);
      }
      // Mid-field containment so a hole can never fling one off to infinity.
      if (p.lengthSq() > MID_RADIUS2) {
        V1.copy(p).normalize().multiplyScalar(-0.02);
        lv.vel.add(V1);
      }

      V1.copy(lv.vel).multiplyScalar(dt * 60);
      p.add(V1);
      // V1.3 ECOLOGY: stir the primordial substrate at the colossus's wake (deterministic, rng-free).
      if (doStir && this.rd) {
        this.rd.seedDeterministic(0.5 + p.x / GROUND_EXTENT, 0.5 - p.z / GROUND_EXTENT, 2);
      }
      // Face travel direction (yaw toward velocity) + a slow body undulation (roll).
      if (lv.vel.x * lv.vel.x + lv.vel.z * lv.vel.z > 1e-6) {
        g.rotation.y = Math.atan2(lv.vel.x, lv.vel.z);
      }
      lv.body.rotation.x = Math.sin(t * 1.2 + lv.ph) * 0.25; // tail undulation

      // Inner glow + aura now read the colossus's REAL speed (was a clock-driven sin pulse): a
      // diving/accelerating leviathan blazes, a gliding one dims. Falsifiable, deterministic.
      const surge = leviathanSurge(lv.vel.length());
      lv.mat.emissiveIntensity = 1.2 * (0.6 + 0.8 * surge);
      lv.aura.intensity = (1.6 + 2.0 * surge) * POINT_LIGHT_GAIN;
      // V-LEVIATHAN-EXPANDED: feed the real signals to the named-effect suite (surge = speed, depth = height).
      lv.u.uTime.value = t;
      lv.u.uSurge.value = surge;
      lv.u.uDepth.value = leviathanDepth(p.y);
    }
  }
}
