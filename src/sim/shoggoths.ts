/**
 * Shoggoth system — a writhing swarm of eldritch horrors (100 on desktop, 16 on mobile) that drift on lorenz-flavored currents,
 * lash nearby organisms with tendrils, and periodically consume one, spawning a pair of
 * corrupted lorenz-driven children. Faithful port of legacy lines 505-539.
 */
import * as THREE from 'three';
import { TAU, clamp, dist2 } from '../math/scalar';
import { creatureDrive } from './cognition';
import { PLATFORM_HALF, PLATFORM_CEIL, PLATFORM_FLOOR } from './constants';
import { POINT_LIGHT_GAIN } from './environment';
import type { SimContext } from '../types';
import type { EntityManager } from './entities';
import type { SingularitySystem } from './singularities';
import {
  PORTAL_RESPAWN_DELAY,
  portalReappearSpot,
  type PortalCullable,
} from './portal-death-fauna';

/** Tendril line segments per shoggoth (legacy `tc`). */
const TENDRIL_COUNT = 8;
/** Grid query radius for tendril candidates (legacy `SG.query(..., 15)`). */
const TENDRIL_RADIUS = 15;
/** Squared tendril reach — 15^2 (legacy threshold 225). */
const TENDRIL_REACH2 = 225;
/** Squared consumption reach — 12^2 (legacy threshold 144). */
const CONSUME_REACH2 = 144;
/** Grid query radius for consumption candidates (matches √CONSUME_REACH2). */
const CONSUME_RADIUS = 12;

/** Population targets (CONTRACTS V14 — "100 Shoggoths"). Desktop+ gets the full century; the phone
 *  tier stays light for fill rate. Determinism is unaffected — no test constructs this system, and
 *  the world stays one-seed-one-cosmos (the same seed always builds the same 100). */
const SHOG_COUNT_DESKTOP = 100;
const SHOG_COUNT_MOBILE = 16;
/** Only the first few shoggoths carry aura PointLights — WebGL compiles the lighting loop per light,
 *  so 200 dynamic lights would explode the fragment shader. The rest read via emissive (+ bloom). */
const LIT_SHOGGOTHS = 4;

/** F-ECON-CREATURES V17: reference net worth (a fresh weight-2.2 purse at par) the wealth→boldness
 *  curve is centred on — a shoggoth richer than this hunts harder + glows brighter, a broke one is
 *  timid. Boldness is clamped to this band so the economy steers behaviour without breaking it. */
const SHOG_ECON_REF = 200;
const BOLD_MIN = 0.5;
const BOLD_MAX = 2.2;

/** F-COGNITION V24: perception + memory tuning for the Shoggoth mind. */
const THREAT_R2 = 38 * 38; // rival-crowding sense radius (squared) — wide enough to sense the horde
const THREAT_CAP = 3; // this many rivals nearby ⇒ max danger signal
const PREY_CAP = 8; // this many exploitable neighbours ⇒ max prey signal
const SATIATION_DECAY = 0.04; // hunger creeps in per second
const SATIATION_BUMP = 0.5; // satiation gained per successful consumption
const FLEE_KICK = 0.02; // away-from-danger impulse strength

/** F-CREATURE-TRADE V29: bargaining + alliance tuning (the social-economic write-back). */
const TRADE_R2 = 30 * 30; // a deal needs a neighbour within this (squared) range — a partner, not the horde
const TRADE_EVERY = 24; // each shoggoth attempts a deal ~once per this many frames (staggered → bounded churn)
const PEER_SPAN = 2; // boldness gap (on the ~0.3..2.2 scale) at which two shoggoths read as different strata
const TRADE_FRACTION = 0.03; // a hard bargain moves at most this share of the mean purse toward the bolder
const ALLY_FRACTION = 0.025; // alliance solidarity transfer toward the poorer (a touch gentler than a bargain)

// Module-level scratch — reused every frame, never retained (keeps update() allocation-free).
const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const V3 = new THREE.Vector3();
/** F-HOLES: scratch for the singularity body-force pull (never retained). */
const HOLE_F = new THREE.Vector3();
/** F-COGNITION V24: scratch for the away-from-rivals flee direction (never retained). */
const TV = new THREE.Vector3();

/** Per-shoggoth shader uniforms — the tetra core reads out the creature's real MIND (its cognition
 *  drives), driven once per frame. All 0..1: feeding memory · fear · predatory hunger · restless agitation. */
interface ShoggothUniforms {
  uTime: { value: number };
  uColor: { value: THREE.Color };
  uSatiation: { value: number };
  uThreat: { value: number };
  uHunt: { value: number };
  uAgitation: { value: number };
}

/**
 * Patch a shoggoth's core {@link THREE.MeshStandardMaterial} into a LIVE readout of its MIND — the
 * F-COGNITION V24 drives that already govern its behaviour now govern its skin, so the horde's inner
 * state is legible on the outside: a fed, calm, unthreatened shoggoth drifts dreamy and quiet; a
 * starving, cornered, hunting one erupts in hallucination + madness. Mirrors the titan/puppeteer
 * onBeforeCompile idiom. Every named effect is signal-gated (0 ⇒ baseline), additive, GPU-only, no alloc.
 */
function patchShoggothBody(mat: THREE.MeshStandardMaterial, u: ShoggothUniforms): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.uniforms.uColor = u.uColor;
    shader.uniforms.uSatiation = u.uSatiation;
    shader.uniforms.uThreat = u.uThreat;
    shader.uniforms.uHunt = u.uHunt;
    shader.uniforms.uAgitation = u.uAgitation;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vShogP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShogP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vShogP;
        uniform float uTime; uniform vec3 uColor; uniform float uSatiation; uniform float uThreat; uniform float uHunt; uniform float uAgitation;
        float sh31(vec3 p){return fract(sin(dot(p, vec3(27.17, 61.31, 11.71))) * 43758.5453);}
        float sn31(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
          return mix(mix(mix(sh31(i),sh31(i+vec3(1,0,0)),f.x),mix(sh31(i+vec3(0,1,0)),sh31(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(sh31(i+vec3(0,0,1)),sh31(i+vec3(1,0,1)),f.x),mix(sh31(i+vec3(0,1,1)),sh31(i+vec3(1,1,1)),f.x),f.y),f.z);}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float sfres = pow(1.0 - max(dot(normalize(vViewPosition), normalize(normal)), 0.0), 3.0);
        float sang = atan(vShogP.z, vShogP.x);
        // NEURALMIMETIC HUNGER-WEB (hunt): a predatory neural web tightens as it stalks prey.
        float sWeb = step(0.72, sn31(vShogP * 8.0 + uTime * 0.2));
        totalEmissiveRadiance += vec3(0.4, 1.0, 0.7) * sWeb * uHunt * (0.5 + 0.5 * sfres) * 1.1;
        // HALLUCINATION FRACTAL-BLOOM (threat/fear): cornered, the shoggoth's fear-madness blooms a
        // writhing fractal — a real readout of its perceived threat, the mind's terror made visible.
        float sHall = 0.0; vec3 sq = vShogP * 1.4; float samp = 1.0;
        for (int k = 0; k < 3; k++) { sHall += samp * abs(sin(sq.x * 4.0 + uTime) * cos(sq.y * 4.0 - uTime * 1.3)); sq *= 1.9; samp *= 0.6; }
        vec3 sHallCol = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.188) + sHall * 3.0 + uTime);
        totalEmissiveRadiance += sHallCol * pow(sHall, 2.0) * uThreat * 0.5;
        // DREAM-STATE DRIFT (satiation): a gorged, calm shoggoth sinks into a slow dreamy plasma haze.
        float sDream = 0.5 + 0.5 * sin(length(vShogP) * 3.0 - uTime * 0.6 + sn31(vShogP * 2.0) * 6.2831);
        totalEmissiveRadiance += vec3(0.5, 0.4, 0.9) * sDream * uSatiation * (1.0 - uThreat) * 0.6;
        // VORTEXICAL MAW-SWIRL (agitation): a restless shoggoth winds a devouring vortex.
        float sVort = pow(0.5 + 0.5 * sin(sang * 5.0 + length(vShogP) * 4.0 - uTime * 3.0), 6.0);
        totalEmissiveRadiance += uColor * sVort * uAgitation * 0.7;
        // SINGULROSITY GORGE-BLOOM (satiation): feeding blooms a hot core halo.
        totalEmissiveRadiance += uColor * pow(sfres, 0.6) * uSatiation * 0.9;
        // BIT-GLITCH MADNESS-CORE (threat × agitation): stress quantizes the shell into flickering madness.
        float sGlitch = floor((sn31(vShogP * 3.0) + sin(uTime * 10.0) * 0.2) * 5.0) / 5.0;
        totalEmissiveRadiance += vec3(0.2, 1.0, 0.5) * sGlitch * (uThreat * uAgitation) * 0.8;
        // IONIZING HUNGER-FLUTTER (hunt): ion streaks band the body as it charges to feed.
        float sIon = pow(0.5 + 0.5 * sin(vShogP.y * 20.0 - uTime * 13.0), 8.0);
        totalEmissiveRadiance += vec3(0.3, 0.6, 1.0) * sIon * uHunt * 0.6;
        // PHOSPHOR ECTOPLASM (satiation): luminous ectoplasmic gas wreathes a fed shoggoth.
        float sGas = fract(sh31(floor(vShogP * 6.0)) + uTime * 0.1); sGas = sGas * (1.0 - sGas) * 4.0;
        totalEmissiveRadiance += vec3(0.3, 0.95, 0.72) * sGas * uSatiation * 0.4;`,
      );
  };
  mat.customProgramCacheKey = () => 'shoggothBodyV1-mind';
}

/** Internal per-shoggoth record (the legacy stuffed this into `group.userData`). */
interface Shoggoth {
  group: THREE.Group;
  core: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  /** Per-shoggoth shader uniforms driven from its real cognition drives each frame. */
  u: ShoggothUniforms;
  eyeMats: THREE.MeshBasicMaterial[];
  /** Per-eye blink phase (legacy `eye.userData.bp`). */
  eyePhases: Float32Array;
  tendrilGeo: THREE.BufferGeometry;
  tendrilAttr: THREE.BufferAttribute;
  tendrilPositions: Float32Array;
  /** Aura lights — present only on the first {@link LIT_SHOGGOTHS} (the rest glow emissive). */
  aura?: THREE.PointLight;
  aura2?: THREE.PointLight;
  vel: THREE.Vector3;
  ph: number;
  /** Consumption tick accumulator (legacy `aT`). */
  feedTimer: number;
  /** Ticks between consumptions, 200..500 (legacy `aI`). */
  feedInterval: number;
  consumed: number;
  /** F-COGNITION V24: memory of recent feeding 0 (starving) .. 1 (gorged) — an EMA. */
  satiation: number;
}

/**
 * Owns the shoggoth swarm (100 desktop / 16 mobile): deformed icosahedron cores studded with 7-11 blinking eyes,
 * tendril LineSegments fed by spatial-grid queries, and a consumption cycle that eats the
 * nearest organism and respawns two corrupted children.
 */
export class ShoggothSystem implements PortalCullable {
  private readonly ctx: SimContext;
  /** PORTAL DEATH (USER): shoggoths blasted by the portal, awaiting their 5 s respawn ELSEWHERE. */
  private readonly portalDowned: { sg: Shoggoth; at: number }[] = [];
  private portalCullSeq = 0;
  private readonly entities: EntityManager;
  private readonly shogs: Shoggoth[] = [];
  /** F-HOLES: the singularity system, attached by the composition root after construction; the
   *  active hole tugs the shoggoths too. null ⇒ no coupling (the legacy/test behaviour). */
  private singularity: SingularitySystem | null = null;
  /** F-ECON-CREATURES V17: economic net-worth provider by shoggoth index (null ⇒ no coupling). */
  private econWealth: ((shoggothIndex: number) => number) | null = null;
  /** F-CREATURE-TRADE V29: conservation-exact worth transfer between two shoggoths (by index); returns
   *  the AURUM value actually moved. Null ⇒ no economic write-back, so the goldens stay byte-identical. */
  private econTrade: ((fromIndex: number, toIndex: number, aurumValue: number) => number) | null =
    null;
  /** Frame tick — staggers trade attempts so only a slice of the horde deals each frame (bounded churn). */
  private frame = 0;

  /**
   * Builds a swarm of shoggoths across the mid-field (CONTRACTS V14: 100 on desktop+, 16 on phone).
   * Placement is seeded from `ctx.rng` so the same seed always raises the same horde; only the first
   * {@link LIT_SHOGGOTHS} carry point lights (the rest glow emissive under bloom).
   */
  constructor(ctx: SimContext, entities: EntityManager) {
    this.ctx = ctx;
    this.entities = entities;
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rng = ctx.rng;
    const count = ctx.quality.isMobile ? SHOG_COUNT_MOBILE : SHOG_COUNT_DESKTOP;
    for (let i = 0; i < count; i++) {
      const a = rng() * TAU;
      // USER: spread across the platform + rise (same 3 rng draws: a, r, y — stream-neutral).
      const r = (0.2 + rng() * 0.8) * PLATFORM_HALF;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = PLATFORM_FLOOR + rng() * (PLATFORM_CEIL - PLATFORM_FLOOR);
      this.spawnShoggoth(root, x, y, z, i < LIT_SHOGGOTHS);
    }
  }

  /** Number of active shoggoths (100 on desktop, 16 on mobile — feeds the telemetry `shoggoths` field). */
  get count(): number {
    return this.shogs.length;
  }

  /**
   * Free every shoggoth's GPU resources on World teardown / HMR so VRAM never leaks across dev reloads
   * (without this, ~100 core + ~1000 eye + ~100 tendril geometries and their materials leak per reload).
   * Every geometry here is allocated PER-SHOGGOTH (icosahedron core, per-eye spheres, tendril buffer —
   * none from the shared geometry cache), so a full group traversal that disposes each mesh's geometry
   * AND material is safe; the aura point-lights detach with the group. O(shoggoths × parts).
   */
  /**
   * PORTAL DEATH (USER "everything else DIES"): blast any shoggoth inside the portal kill-cylinder, hide
   * it, and re-enter it ELSEWHERE {@link PORTAL_RESPAWN_DELAY} s later. Determinism-neutral (no rng,
   * post-ascension only). See {@link PortalCullable}. O(shoggoths).
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
      portalReappearSpot(this.portalCullSeq++, d.sg.group.position);
      d.sg.vel.set(0, 0, 0);
      d.sg.group.visible = true;
      this.portalDowned.splice(k, 1);
    }
    for (let i = 0; i < this.shogs.length; i++) {
      const sg = this.shogs[i];
      if (!sg || !sg.group.visible) continue;
      const p = sg.group.position;
      const dx = p.x - ax;
      const dz = p.z - az;
      if (dx * dx + dz * dz <= r2) {
        onDeath(p.x, p.y, p.z);
        sg.group.visible = false;
        this.portalDowned.push({ sg, at: t + PORTAL_RESPAWN_DELAY });
      }
    }
  }

  dispose(): void {
    for (const sg of this.shogs) {
      sg.group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) m.dispose();
      });
      sg.group.removeFromParent();
    }
    this.shogs.length = 0;
  }

  /** F-HOLES: wire in the singularity system so an active hole tugs the shoggoths (or null to detach). */
  attachSingularity(singularity: SingularitySystem | null): void {
    this.singularity = singularity;
  }

  /**
   * F-ECON-CREATURES V17: wire in the AURUM/UMBRA economy so each shoggoth's WEALTH drives its
   * behaviour — a rich shoggoth hunts harder (feeds sooner, tendrils tug stronger) and glows brighter;
   * a broke one scavenges timidly. `wealthByIndex(i)` returns shoggoth i's AURUM net worth. Null (the
   * default + tests) leaves the legacy behaviour untouched, so the shoggoth goldens stay identical.
   */
  attachEconomy(wealthByIndex: ((shoggothIndex: number) => number) | null): void {
    this.econWealth = wealthByIndex;
  }

  /**
   * F-CREATURE-TRADE V29: wire the economic WRITE path so cognition's trade/ally drives actually move
   * money — closing the loop (the shoggoths already READ their wealth as boldness; now they CHANGE it).
   * `transfer(from, to, v)` shifts up to `v` AURUM of net worth between two shoggoths by index and
   * returns what moved; the provider owns the index→economy-id mapping + conservation, so this system
   * never imports the Economy class. Null (default + tests) ⇒ no transfers, goldens untouched.
   */
  attachTrade(
    transfer: ((fromIndex: number, toIndex: number, aurumValue: number) => number) | null,
  ): void {
    this.econTrade = transfer;
  }

  /** Constructor-time builder (allocations allowed here; legacy `mkShog`). */
  private spawnShoggoth(root: THREE.Group, x: number, y: number, z: number, lit: boolean): void {
    const rng = this.ctx.rng;
    const group = new THREE.Group();

    // Deformed icosahedron core (legacy 509-511). Bulk horde uses a cheaper subdivision.
    const coreGeo = new THREE.IcosahedronGeometry(3, lit ? 2 : 1);
    // IcosahedronGeometry always carries a non-interleaved position BufferAttribute.
    const cv = coreGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < cv.count; i++) {
      const vx = cv.getX(i);
      const vy = cv.getY(i);
      const vz = cv.getZ(i);
      const nd = Math.sin(vx * 2 + vy * 3) * Math.cos(vz * 1.5 + vx) * 0.8;
      cv.setXYZ(i, vx + nd * (rng() - 0.3), vy + nd * (rng() - 0.3), vz + nd * (rng() - 0.3));
    }
    coreGeo.computeVertexNormals();
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      emissive: new THREE.Color(0.02, 0.0, 0.06),
      emissiveIntensity: 1.5,
      metalness: 0.95,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    // Live MIND shader — the core reads out the shoggoth's real cognition (feeding / fear / hunt / agitation).
    const shogU: ShoggothUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color().setHSL(0.75, 0.7, 0.4) },
      uSatiation: { value: 0 },
      uThreat: { value: 0 },
      uHunt: { value: 0 },
      uAgitation: { value: 0 },
    };
    patchShoggothBody(coreMat, shogU);
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // 7-11 blinking eyes on lit shoggoths; 3-5 on the bulk horde (fill-rate budget).
    const eyeCount = lit ? 7 + Math.floor(rng() * 5) : 3 + Math.floor(rng() * 3);
    const eyeMats: THREE.MeshBasicMaterial[] = [];
    const eyePhases = new Float32Array(eyeCount);
    for (let ei = 0; ei < eyeCount; ei++) {
      const eyeGeo = new THREE.SphereGeometry(0.15 + rng() * 0.15, 6, 4);
      const eyeMat = new THREE.MeshBasicMaterial({
        color: rng() < 0.3 ? 0xff0000 : rng() < 0.5 ? 0x00ff88 : 0xaa00ff,
        transparent: true,
        opacity: 0.9,
      });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      const ea = rng() * TAU;
      const eb = (rng() - 0.5) * Math.PI;
      eye.position.set(
        Math.cos(ea) * Math.cos(eb) * 2.8,
        Math.sin(eb) * 2.5,
        Math.sin(ea) * Math.cos(eb) * 2.8,
      );
      group.add(eye);
      eyeMats.push(eyeMat);
      eyePhases[ei] = rng() * TAU;
    }

    // Tendril LineSegments buffer (legacy 513).
    const tendrilPositions = new Float32Array(TENDRIL_COUNT * 6);
    const tendrilGeo = new THREE.BufferGeometry();
    const tendrilAttr = new THREE.BufferAttribute(tendrilPositions, 3);
    tendrilGeo.setAttribute('position', tendrilAttr);
    const tendrils = new THREE.LineSegments(
      tendrilGeo,
      new THREE.LineBasicMaterial({ color: 0x4400aa, transparent: true, opacity: 0.4 }),
    );
    group.add(tendrils);

    // Aura lights (legacy 514) — only on the first LIT_SHOGGOTHS so the dynamic-light count stays
    // bounded (WebGL compiles the lighting loop per light). The bulk horde glows by emissive + bloom.
    let aura: THREE.PointLight | undefined;
    let aura2: THREE.PointLight | undefined;
    if (lit) {
      aura = new THREE.PointLight(0x220044, 4 * POINT_LIGHT_GAIN, 30, 0);
      group.add(aura);
      aura2 = new THREE.PointLight(0x440000, 2 * POINT_LIGHT_GAIN, 15, 0);
      aura2.position.y = 2;
      group.add(aura2);
    }

    group.position.set(x, y, z);
    root.add(group);
    this.shogs.push({
      group,
      core,
      coreMat,
      u: shogU,
      eyeMats,
      eyePhases,
      tendrilGeo,
      tendrilAttr,
      tendrilPositions,
      aura,
      aura2,
      vel: new THREE.Vector3((rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.05),
      ph: rng() * TAU,
      feedTimer: 0,
      feedInterval: 200 + rng() * 300,
      consumed: 0,
      satiation: 0.5,
    });
  }

  /**
   * SUSPENDED-ANIMATION visual tick (USER pause redesign): keep every shoggoth ALIVE IN PLACE while
   * the world is paused. Core glow, breathing scale, blinking eyes, and aura lights all pulse on the
   * advancing visual clock `t`; nothing drifts, no entity is consumed, and NO rng is drawn. It is a
   * render-only subset of {@link update} — it omits drift/tendril grabs and the consumption block
   * (which spawns corrupted children + draws rng), using neutral boldness/deception so the pulse still
   * reads lively without touching sim state. Writes only render objects. O(shoggoths), no allocation.
   */
  animateInPlace(t: number): void {
    for (let si = 0; si < this.shogs.length; si++) {
      const sg = this.shogs[si];
      if (!sg) continue; // noUncheckedIndexedAccess: si < length
      const hue = (((t * 0.05 + sg.ph) % 1) + 1) % 1;
      sg.coreMat.emissive.setHSL(hue, 0.6, 0.04 + Math.sin(t * 2 + sg.ph) * 0.02);
      sg.coreMat.emissiveIntensity = (1 + Math.sin(t * 3 + sg.ph) * 0.8) * 0.9;
      sg.core.scale.setScalar((1 + Math.sin(t * 1.5 + sg.ph) * 0.15) * 0.94);
      for (let ei = 0; ei < sg.eyeMats.length; ei++) {
        const eyeMat = sg.eyeMats[ei];
        if (!eyeMat) continue; // noUncheckedIndexedAccess: ei < length
        eyeMat.opacity = 0.3 + Math.abs(Math.sin(t * 2 + (sg.eyePhases[ei] ?? 0))) * 0.7;
      }
      if (sg.aura) {
        sg.aura.intensity = (3 + Math.sin(t * 2 + sg.ph) * 2) * POINT_LIGHT_GAIN;
        sg.aura.color.setHSL(hue, 0.7, 0.3);
      }
      if (sg.aura2) sg.aura2.intensity = (1.5 + Math.cos(t * 3 + sg.ph) * 1) * POINT_LIGHT_GAIN;
    }
  }

  /**
   * Advance drift, glow, tendrils, and consumption for all shoggoths (legacy 519-539).
   * O(s·k) per frame — s = shoggoth count, k = grid neighbors; consumption uses the same spatial hash (O(k)), not a full population scan.
   * Allocation-free: module scratch vectors only; the grid query reuses its shared buffer.
   */
  update(dt: number, t: number): void {
    const ctx = this.ctx;
    const rng = ctx.rng;
    const chaos = ctx.state.chaos;
    const tugScale = 0.0008 * (chaos < 2 ? chaos / 2 : 1);
    const list = this.entities.list;
    // F-ECON-CREATURES V17: centre boldness on the LIVE mean shoggoth wealth so rich-vs-poor is
    // RELATIVE (and inflation-proof) — above-average shoggoths turn bold, below-average timid.
    this.frame++; // F-CREATURE-TRADE V29: advance the deal-stagger clock once per update
    let meanWorth = SHOG_ECON_REF;
    if (this.econWealth) {
      let sw = 0;
      const nn = this.shogs.length;
      for (let i = 0; i < nn; i++) sw += this.econWealth(i);
      meanWorth = Math.max(1, sw / Math.max(1, nn));
    }
    for (let si = 0; si < this.shogs.length; si++) {
      const sg = this.shogs[si];
      if (!sg) continue; // noUncheckedIndexedAccess: si < length, never actually undefined
      const g = sg.group;
      const p = g.position;

      // F-ECON-CREATURES V17: this shoggoth's WEALTH sets its boldness — rich = bolder (hunts harder,
      // glows bigger + brighter), broke = timid. Reads the deterministic economy; boldness stays 1
      // (legacy behaviour, byte-identical) when no economy is wired, as in tests.
      let boldness = 1;
      if (this.econWealth) boldness = clamp(this.econWealth(si) / meanWorth, BOLD_MIN, BOLD_MAX);
      const tug = tugScale * (0.5 + 0.5 * boldness);

      // F-COGNITION V24: PERCEIVE the neighbourhood + REMEMBER recent feeding, then DECIDE — flee a
      // dangerous crowd, hunt a prey-rich calm. The grid query is reused for the tendrils below (one
      // query). All deterministic (no rng); `singActive`/HOLE_F are reused by the drift pull below.
      const nearby = ctx.grid.query(p.x, p.z, TENDRIL_RADIUS);
      let preyCount = 0;
      for (let ni = 0; ni < nearby.length; ni++) {
        const en = nearby[ni];
        const ep0 = en?.position;
        if (ep0 && dist2(p.x, p.y, p.z, ep0.x, ep0.y, ep0.z) < TENDRIL_REACH2) preyCount++;
      }
      let crowd = 0;
      let nearJ = -1; // F-CREATURE-TRADE V29: nearest dealable neighbour within TRADE_R2 (a partner)
      let nearDD = TRADE_R2;
      TV.set(0, 0, 0);
      for (let sj = 0; sj < this.shogs.length; sj++) {
        if (sj === si) continue;
        const og = this.shogs[sj];
        if (!og) continue;
        const op = og.group.position;
        const dd = dist2(p.x, p.y, p.z, op.x, op.y, op.z);
        if (dd < THREAT_R2 && dd > 1e-3) {
          crowd++;
          TV.x += p.x - op.x;
          TV.y += p.y - op.y;
          TV.z += p.z - op.z;
        }
        if (dd < nearDD && dd > 1e-3) {
          nearDD = dd; // the closest other shoggoth becomes the bargaining partner
          nearJ = sj;
        }
      }
      const singActive = this.singularity
        ? this.singularity.bodyForce(p.x, p.y, p.z, dt, HOLE_F)
        : false;
      const threat = clamp(crowd / THREAT_CAP + (singActive ? 0.5 : 0), 0, 1);
      const prey = clamp(preyCount / PREY_CAP, 0, 1);
      sg.satiation = clamp(sg.satiation - SATIATION_DECAY * dt, 0, 1);
      // F-CREATURE-TRADE V29: the nearest shoggoth is a potential PARTNER. How wealth-comparable it is
      // (peer) decides whether we BARGAIN with it (the unlike) or ALLY with it (an equal). boldness is
      // the wealth proxy already centred on the live mean, so |Δboldness| reads as the wealth gap.
      let partner = 0;
      let peer = 0;
      let nearBold = 1;
      if (nearJ >= 0) {
        partner = clamp(1 - nearDD / TRADE_R2, 0, 1);
        if (this.econWealth)
          nearBold = clamp(this.econWealth(nearJ) / meanWorth, BOLD_MIN, BOLD_MAX);
        peer = clamp(1 - Math.abs(boldness - nearBold) / PEER_SPAN, 0, 1);
      }
      const drive = creatureDrive({
        threat,
        prey,
        satiation: sg.satiation,
        boldness,
        partner,
        peer,
      });
      // Drive the MIND shader from the real F-COGNITION drives (each already/now clamped to [0,1]) so
      // the shoggoth's inner state — how fed, how threatened, how hungry, how agitated — reads out on
      // its skin: a fed, calm one drifts dreamy; a starving, cornered, hunting one erupts in hallucination.
      const su = sg.u;
      su.uTime.value = t;
      su.uColor.value.setHSL((((t * 0.05 + sg.ph) % 1) + 1) % 1, 0.7, 0.4);
      su.uSatiation.value = sg.satiation;
      su.uThreat.value = threat;
      su.uHunt.value = clamp(drive.hunt, 0, 1);
      su.uAgitation.value = clamp(drive.agitation, 0, 1);
      // ACT on the social-economic drives — staggered so only ~1/TRADE_EVERY of the horde deals each
      // frame. BARGAIN moves worth toward the BOLDER party (power ∝ wealth → widens the spread); ALLY
      // moves it toward the POORER peer (solidarity → narrows it). Conservation-exact via the provider;
      // the change shows up next tick through the existing wealth→boldness→glow coupling (no new state).
      if (this.econTrade && nearJ >= 0 && (this.frame + si) % TRADE_EVERY === 0) {
        if (drive.trade >= drive.ally && drive.trade > 0.05) {
          const amt = drive.trade * TRADE_FRACTION * meanWorth;
          if (boldness >= nearBold)
            this.econTrade(nearJ, si, amt); // we out-bargain the weaker → we gain
          else this.econTrade(si, nearJ, amt); // a bolder neighbour out-bargains us → we pay
        } else if (drive.ally > 0.05) {
          const amt = drive.ally * ALLY_FRACTION * meanWorth;
          if (boldness >= nearBold)
            this.econTrade(si, nearJ, amt); // the richer ally supports the poorer
          else this.econTrade(nearJ, si, amt); // our poorer self is supported by the richer ally
        }
      }
      // FLEE: an impulse away from the crowd centroid, scaled by the urge.
      if (drive.flee > 0.05 && TV.lengthSq() > 1e-6) {
        TV.normalize().multiplyScalar(drive.flee * FLEE_KICK);
        sg.vel.add(TV);
      }

      // FREE ROAM (owner: shoggoths must range the WHOLE ±540 square + 6..240 column like the entities,
      // not huddle the centre). The old Lorenz drift had an implicit attractor at the origin — it kept
      // the horde bunched. This mirrors world.ts steerNhiBeings: each shoggoth pursues its OWN slowly
      // orbiting 3D Lissajous waypoint (per-index phase ⇒ the horde spreads instead of sharing one
      // attractor), with a gentle weave, a continuous height-restoring pull, and a soft square leash;
      // the hard clamp below is the guarantee. Pure trig of (t, index, spawn-phase) — draws no rng, so
      // the seeded stream is untouched (a determinism-neutral swap of one rng-free field for another).
      const wph = si * 1.7 + sg.ph;
      const wrad = 150 + (si % 5) * 95; // 150..530 — reaches the rim and everything between
      const wtx = Math.cos(t * 0.17 + wph) * wrad;
      const wtz = Math.sin(t * 0.21 + wph * 1.3) * wrad;
      const wty = 120 + Math.sin(t * 0.29 + wph) * 100; // sweeps ~20..220 of the column
      const wdx = wtx - p.x;
      const wdy = wty - p.y;
      const wdz = wtz - p.z;
      // USER: faster, more kinetic roaming — seek accel 0.04→0.11, weave amps ~2.3× (+ damping 0.985→0.97).
      const wInv = 0.11 / (Math.sqrt(wdx * wdx + wdy * wdy + wdz * wdz) + 1e-6);
      sg.vel.x += wdx * wInv + Math.sin(t * 0.7 + si * 1.3) * 0.07;
      sg.vel.y += wdy * wInv + Math.sin(t * 0.53 + si * 2.1) * 0.05;
      sg.vel.z += wdz * wInv + Math.cos(t * 0.61 + si * 0.7) * 0.07;
      sg.vel.y += (120 - p.y) * 0.003; // height restore — no sky-float, no floor-crawl
      if (p.x > PLATFORM_HALF) sg.vel.x -= 0.1;
      else if (p.x < -PLATFORM_HALF) sg.vel.x += 0.1;
      if (p.z > PLATFORM_HALF) sg.vel.z -= 0.1;
      else if (p.z < -PLATFORM_HALF) sg.vel.z += 0.1;
      sg.vel.multiplyScalar(0.97);
      // F-HOLES: an active singularity drags the shoggoth toward/away from its centre (force already
      // computed once in the perception step above; reused here so we never query the hole twice).
      if (singActive) sg.vel.add(HOLE_F);
      V1.copy(sg.vel).multiplyScalar(dt * 60);
      p.add(V1);
      if (!Number.isFinite(p.x + p.y + p.z + sg.vel.x + sg.vel.y + sg.vel.z)) {
        p.set(0, 5, 0);
        sg.vel.set(0, 0, 0);
      }
      // USER: square platform + full height (was a MID_RADIUS 150 central circle capped at y30).
      // HARD clamp — soft nudge alone can leak the rim; owner law = NEVER outside the platform.
      if (p.x > PLATFORM_HALF) {
        p.x = PLATFORM_HALF;
        if (sg.vel.x > 0) sg.vel.x = 0;
      } else if (p.x < -PLATFORM_HALF) {
        p.x = -PLATFORM_HALF;
        if (sg.vel.x < 0) sg.vel.x = 0;
      }
      if (p.z > PLATFORM_HALF) {
        p.z = PLATFORM_HALF;
        if (sg.vel.z > 0) sg.vel.z = 0;
      } else if (p.z < -PLATFORM_HALF) {
        p.z = -PLATFORM_HALF;
        if (sg.vel.z < 0) sg.vel.z = 0;
      }
      if (p.y < PLATFORM_FLOOR) {
        p.y = PLATFORM_FLOOR;
        if (sg.vel.y < 0) sg.vel.y = 0;
      } else if (p.y > PLATFORM_CEIL) {
        p.y = PLATFORM_CEIL;
        if (sg.vel.y > 0) sg.vel.y = 0;
      }

      // Roiling rotation + pulsing core glow (legacy 527-530).
      g.rotation.x += Math.sin(t * 0.4 + sg.ph) * 0.008;
      g.rotation.y += dt * (0.15 + drive.agitation * 0.35); // agitated → spins faster
      g.rotation.z += Math.cos(t * 0.3 + sg.ph) * 0.006;
      const hue = (((t * 0.05 + sg.ph) % 1) + 1) % 1;
      sg.coreMat.emissive.setHSL(hue, 0.6, 0.04 + Math.sin(t * 2 + sg.ph) * 0.02);
      // Wealth shows on the body: a rich shoggoth glows brighter + looms larger (the visible purse).
      // DECEIVE (V26): a threatened, outmatched shoggoth FEIGNS WEAKNESS — dims its glow + shrinks so
      // a dominant rival overlooks it. Layered under the V17 wealth glow, so the broke-and-cornered
      // visibly cower while the rich blaze on.
      const meek = 1 - 0.6 * drive.deceive;
      sg.coreMat.emissiveIntensity =
        (1 + Math.sin(t * 3 + sg.ph) * 0.8) * (0.7 + 0.35 * boldness) * meek;
      sg.core.scale.setScalar(
        (1 + Math.sin(t * 1.5 + sg.ph) * 0.15) *
          (0.85 + 0.18 * boldness) *
          (1 - 0.25 * drive.deceive),
      );
      for (let ei = 0; ei < sg.eyeMats.length; ei++) {
        const eyeMat = sg.eyeMats[ei];
        if (!eyeMat) continue; // noUncheckedIndexedAccess: ei < length
        eyeMat.opacity =
          (0.3 +
            Math.abs(Math.sin(t * (2 + drive.agitation * 4) + (sg.eyePhases[ei] ?? 0))) * 0.7) *
          meek; // hide the eyes too when feigning weakness
      }
      if (sg.aura) {
        sg.aura.intensity = (3 + Math.sin(t * 2 + sg.ph) * 2) * POINT_LIGHT_GAIN;
        sg.aura.color.setHSL(hue, 0.7, 0.3);
      }
      if (sg.aura2) sg.aura2.intensity = (1.5 + Math.cos(t * 3 + sg.ph) * 1) * POINT_LIGHT_GAIN;

      // Tendrils — reuse the perception grid query above; squared-distance threshold (legacy 531-534).
      const tp = sg.tendrilPositions;
      let ti = 0;
      for (let ni = 0; ni < nearby.length && ti < TENDRIL_COUNT; ni++) {
        const en = nearby[ni];
        if (!en) continue; // noUncheckedIndexedAccess: ni < length
        const ep = en.position;
        if (dist2(p.x, p.y, p.z, ep.x, ep.y, ep.z) < TENDRIL_REACH2) {
          const o = ti * 6;
          tp[o] = 0;
          tp[o + 1] = 0;
          tp[o + 2] = 0;
          tp[o + 3] = ep.x - p.x;
          tp[o + 4] = ep.y - p.y;
          tp[o + 5] = ep.z - p.z;
          ti++;
          V1.copy(p)
            .sub(ep)
            .normalize()
            .multiplyScalar(tug * (1 - 0.5 * drive.deceive)); // lay low: softer tendrils when feigning
          en.userData.vel.add(V1);
        }
      }
      if (ti > 0) {
        // Known Bug 13 pattern: upload only the populated segment range (three 0.185.1 API).
        sg.tendrilAttr.clearUpdateRanges();
        sg.tendrilAttr.addUpdateRange(0, ti * 6);
        sg.tendrilAttr.needsUpdate = true;
      }
      sg.tendrilGeo.setDrawRange(0, ti * 2);

      // Consumption every feedInterval ticks → 2 corrupted children (legacy 535-537).
      sg.feedTimer += dt * 30;
      // Effective hunger combines WEALTH (V17 boldness) with the V24 HUNT drive: a rich, prey-rich,
      // unthreatened, hungry shoggoth feeds sooner; a fleeing/threatened/sated one waits far longer.
      if (
        sg.feedTimer >= sg.feedInterval / (boldness * (0.6 + 0.5 * drive.hunt)) &&
        list.length > 50
      ) {
        sg.feedTimer = 0;
        sg.consumed++;
        // O(k) via spatial hash — same deterministic tie-break as the legacy full scan (closest,
        // then lowest list index on equal distance).
        const consumeCandidates = ctx.grid.query(p.x, p.z, CONSUME_RADIUS);
        let bestD = CONSUME_REACH2;
        let bestI = -1;
        for (let ci = 0; ci < consumeCandidates.length; ci++) {
          const e = consumeCandidates[ci];
          if (!e) continue;
          // V122: NHI MATRIX beings are not prey (same guard as the titan harvest — predation was
          // silently unregistering launched NHI minds and blanking the NHI observatory).
          if (e.userData.isNhi) continue;
          const ep = e.position;
          const sd = dist2(p.x, p.y, p.z, ep.x, ep.y, ep.z);
          if (sd >= CONSUME_REACH2) continue;
          const idx = list.indexOf(e);
          if (idx < 0) continue;
          if (sd < bestD || (sd === bestD && (bestI < 0 || idx < bestI))) {
            bestD = sd;
            bestI = idx;
          }
        }
        if (bestI >= 0) {
          this.entities.disposeAt(bestI);
          sg.satiation = clamp(sg.satiation + SATIATION_BUMP, 0, 1); // remember the kill (gorged)
          for (let sj = 0; sj < 2; sj++) {
            V3.set((rng() - 0.5) * 4, rng() * 2 - 1, (rng() - 0.5) * 4);
            V2.copy(p).add(V3);
            // Corrupted child draws over the LIVE morph table (250 in phylum mode).
            const child = this.entities.spawn(V2, Math.floor(rng() * ctx.morphs.length), 0.6);
            if (child) {
              child.material.color.setHSL(rng() * 0.1 + 0.7, 0.5, 0.08);
              child.material.emissive.set(0x110022);
              child.userData.beh = 'lorenz';
            }
          }
        }
      }
    }
  }
}
