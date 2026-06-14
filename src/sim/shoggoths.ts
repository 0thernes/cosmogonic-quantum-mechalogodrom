/**
 * Shoggoth system — three writhing eldritch horrors that drift on lorenz-flavored currents,
 * lash nearby organisms with tendrils, and periodically consume one, spawning a pair of
 * corrupted lorenz-driven children. Faithful port of legacy lines 505-539.
 */
import * as THREE from 'three';
import { TAU, clamp, dist2 } from '../math/scalar';
import { ARENA_MID, MID_RADIUS2 } from './constants';
import { POINT_LIGHT_GAIN } from './environment';
import type { SimContext } from '../types';
import type { EntityManager } from './entities';
import type { SingularitySystem } from './singularities';

/** Tendril line segments per shoggoth (legacy `tc`). */
const TENDRIL_COUNT = 8;
/** Grid query radius for tendril candidates (legacy `SG.query(..., 15)`). */
const TENDRIL_RADIUS = 15;
/** Squared tendril reach — 15^2 (legacy threshold 225). */
const TENDRIL_REACH2 = 225;
/** Squared consumption reach — 12^2 (legacy threshold 144). */
const CONSUME_REACH2 = 144;
/** Attractor-unit clamp for Lorenz drift samples (mirrors the entity 'lorenz' NaN seal). */
const LORENZ_BOUND = 25;

/** Population targets (CONTRACTS V14 — "100 Shoggoths"). Desktop+ gets the full century; the phone
 *  tier stays light for fill rate. Determinism is unaffected — no test constructs this system, and
 *  the world stays one-seed-one-cosmos (the same seed always builds the same 100). */
const SHOG_COUNT_DESKTOP = 100;
const SHOG_COUNT_MOBILE = 16;
/** Only the first few shoggoths carry aura PointLights — WebGL compiles the lighting loop per light,
 *  so 200 dynamic lights would explode the fragment shader. The rest read via emissive (+ bloom). */
const LIT_SHOGGOTHS = 4;

// Module-level scratch — reused every frame, never retained (keeps update() allocation-free).
const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const V3 = new THREE.Vector3();
/** F-HOLES: scratch for the singularity body-force pull (never retained). */
const HOLE_F = new THREE.Vector3();

/** Internal per-shoggoth record (the legacy stuffed this into `group.userData`). */
interface Shoggoth {
  group: THREE.Group;
  core: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
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
}

/**
 * Owns the three shoggoths: deformed icosahedron cores studded with 7-11 blinking eyes,
 * tendril LineSegments fed by spatial-grid queries, and a consumption cycle that eats the
 * nearest organism and respawns two corrupted children.
 */
export class ShoggothSystem {
  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  private readonly shogs: Shoggoth[] = [];
  /** F-HOLES: the singularity system, attached by the composition root after construction; the
   *  active hole tugs the shoggoths too. null ⇒ no coupling (the legacy/test behaviour). */
  private singularity: SingularitySystem | null = null;

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
      const r = (16 + rng() * 54) * ARENA_MID;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = 4 + rng() * 22;
      this.spawnShoggoth(root, x, y, z, i < LIT_SHOGGOTHS);
    }
  }

  /** Number of active shoggoths (constant 3 — feeds the telemetry `shoggoths` field). */
  get count(): number {
    return this.shogs.length;
  }

  /** F-HOLES: wire in the singularity system so an active hole tugs the shoggoths (or null to detach). */
  attachSingularity(singularity: SingularitySystem | null): void {
    this.singularity = singularity;
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
    });
  }

  /**
   * Advance drift, glow, tendrils, and consumption for all shoggoths (legacy 519-539).
   * O(s·k) per frame — s = 3 shoggoths, k = grid neighbors within 15u; the O(n) nearest-victim
   * scan runs only on consumption ticks (~every 200-500 sim ticks per shoggoth).
   * Allocation-free: module scratch vectors only; the grid query reuses its shared buffer.
   */
  update(dt: number, t: number): void {
    const ctx = this.ctx;
    const rng = ctx.rng;
    const chaos = ctx.state.chaos;
    const tugScale = 0.0008 * (chaos < 2 ? chaos / 2 : 1);
    const list = this.entities.list;
    for (let si = 0; si < this.shogs.length; si++) {
      const sg = this.shogs[si];
      if (!sg) continue; // noUncheckedIndexedAccess: si < length, never actually undefined
      const g = sg.group;
      const p = g.position;

      // Lorenz-ish drift (legacy 522-526). Samples are clamped to ±LORENZ_BOUND (same seal as
      // the entity 'lorenz' behavior): an escapee's raw position feeds the quadratic cross
      // terms (lx·(28−lz), lx·ly), whose superexponential growth could outrun the 0.99 damp
      // and the containment impulse into ±Infinity → NaN, which the tendril tug would then
      // spread into entity velocities. Bounded samples keep the impulse finite for ANY
      // position; the drift draws no rng, so the seeded stream is untouched.
      const lx = clamp(p.x * 0.05, -LORENZ_BOUND, LORENZ_BOUND);
      const ly = clamp(p.y * 0.05, -LORENZ_BOUND, LORENZ_BOUND);
      const lz = clamp(p.z * 0.05, -LORENZ_BOUND, LORENZ_BOUND);
      sg.vel.x += Math.sin(t * 0.7 + sg.ph) * (10 * (ly - lx)) * dt * 0.0003;
      sg.vel.y += Math.cos(t * 0.5 + sg.ph) * (lx * (28 - lz) - ly) * dt * 0.0002;
      sg.vel.z += Math.sin(t * 0.3 + sg.ph) * (lx * ly - 2.667 * lz) * dt * 0.0003;
      sg.vel.multiplyScalar(0.99);
      // F-HOLES: an active singularity drags the shoggoth toward/away from its centre. No-op when
      // unattached or inactive (the legacy/test path), and it draws no rng, so the stream is intact.
      if (this.singularity && this.singularity.bodyForce(p.x, p.y, p.z, dt, HOLE_F)) {
        sg.vel.add(HOLE_F);
      }
      V1.copy(sg.vel).multiplyScalar(dt * 60);
      p.add(V1);
      if (p.lengthSq() > MID_RADIUS2) {
        V1.copy(p).normalize().multiplyScalar(-0.01);
        sg.vel.add(V1);
      }
      if (p.y < 2) sg.vel.y += 0.005;
      if (p.y > 30) sg.vel.y -= 0.003;

      // Roiling rotation + pulsing core glow (legacy 527-530).
      g.rotation.x += Math.sin(t * 0.4 + sg.ph) * 0.008;
      g.rotation.y += dt * 0.15;
      g.rotation.z += Math.cos(t * 0.3 + sg.ph) * 0.006;
      const hue = (t * 0.05 + sg.ph) % 1;
      sg.coreMat.emissive.setHSL(hue, 0.6, 0.04 + Math.sin(t * 2 + sg.ph) * 0.02);
      sg.coreMat.emissiveIntensity = 1 + Math.sin(t * 3 + sg.ph) * 0.8;
      sg.core.scale.setScalar(1 + Math.sin(t * 1.5 + sg.ph) * 0.15);
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

      // Tendrils — O(k) via grid query, squared-distance threshold (legacy 531-534).
      const nearby = ctx.grid.query(p.x, p.z, TENDRIL_RADIUS);
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
          V1.copy(p).sub(ep).normalize().multiplyScalar(tugScale);
          en.userData.vel.add(V1);
        }
      }
      if (ti > 0) {
        // Known Bug 13 pattern: upload only the populated segment range (three 0.184 API).
        sg.tendrilAttr.clearUpdateRanges();
        sg.tendrilAttr.addUpdateRange(0, ti * 6);
        sg.tendrilAttr.needsUpdate = true;
      }
      sg.tendrilGeo.setDrawRange(0, ti * 2);

      // Consumption every feedInterval ticks → 2 corrupted children (legacy 535-537).
      sg.feedTimer += dt * 30;
      if (sg.feedTimer >= sg.feedInterval && list.length > 50) {
        sg.feedTimer = 0;
        sg.consumed++;
        let bestD = 9999;
        let bestI = -1;
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (!e) continue; // noUncheckedIndexedAccess: i < length
          const ep = e.position;
          const sd = dist2(p.x, p.y, p.z, ep.x, ep.y, ep.z);
          if (sd < CONSUME_REACH2 && sd < bestD) {
            bestD = sd;
            bestI = i;
          }
        }
        if (bestI >= 0) {
          this.entities.disposeAt(bestI);
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
