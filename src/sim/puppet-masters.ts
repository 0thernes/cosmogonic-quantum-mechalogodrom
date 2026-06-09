/**
 * Puppet-master NPCs — AETHON, SELENE, and KRONOS orbit the arena as glowing tetrahedra and
 * periodically meddle with the simulation (chaos spikes, weather shifts, mass mutations).
 * Faithful port of legacy lines 480-503; Known Bug 14 fix: mutations are counted.
 */
import * as THREE from 'three';
import { clamp } from '../math/scalar';
import { CHAOS_MAX, CHAOS_MIN, MORPH_COUNT, WEATHERS } from './constants';
import type { PuppetEvent, SimContext } from '../types';
import type { EntityManager } from './entities';

type PuppetAction = 'chaos' | 'weather' | 'mutate';

/** Static per-puppet tuning (legacy `PMS` table). */
interface PuppetConfig {
  readonly name: string;
  readonly hue: number;
  /** Orbit radius. */
  readonly orb: number;
  /** Orbit angular speed (rad/s of sim time). */
  readonly spd: number;
  /** Base hover height. */
  readonly y: number;
  readonly act: PuppetAction;
  /** Ticks between actions (timer advances at dt*30/frame). */
  readonly iv: number;
}

const CONFIGS: readonly PuppetConfig[] = [
  { name: 'AETHON', hue: 0.08, orb: 45, spd: 0.07, y: 35, act: 'chaos', iv: 400 },
  { name: 'SELENE', hue: 0.6, orb: 55, spd: -0.05, y: 42, act: 'weather', iv: 600 },
  { name: 'KRONOS', hue: 0.3, orb: 50, spd: 0.03, y: 38, act: 'mutate', iv: 500 },
];

// Pre-built toast strings so action ticks never build strings inside update().
const CHAOS_MESSAGE = 'stokes the chaos';
const WEATHER_MESSAGES: readonly string[] = WEATHERS.map((w) => `shifts to ${w}`);
const RESHAPE_MESSAGES: readonly string[] = Array.from(
  { length: 31 },
  (_, n) => `reshapes ${n} organisms`,
);

// Scratch event object — reused per emit; listeners must not retain it across calls.
const EVENT: PuppetEvent = { name: '', action: '' };

/** Live per-puppet state. */
interface Puppet {
  readonly cfg: PuppetConfig;
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.MeshStandardMaterial;
  readonly ring: THREE.Mesh;
  readonly light: THREE.PointLight;
  /** Action tick accumulator (legacy `ti`). */
  ti: number;
}

/**
 * Orchestrates the three puppet masters: orbital motion, pulsing glow, and interval-driven
 * meddling. Interventions are surfaced to the HUD via the injected `onEvent` callback
 * (legacy `showNM` toast).
 */
export class PuppetMasterSystem {
  private readonly ctx: SimContext;
  private readonly entities: EntityManager;
  private readonly onEvent: (e: PuppetEvent) => void;
  private readonly pms: Puppet[] = [];

  /** Builds AETHON/SELENE/KRONOS meshes (tetra core + torus ring + point light). */
  constructor(ctx: SimContext, entities: EntityManager, onEvent: (e: PuppetEvent) => void) {
    this.ctx = ctx;
    this.entities = entities;
    this.onEvent = onEvent;
    for (const cfg of CONFIGS) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(cfg.hue, 0.8, 0.3),
        emissive: new THREE.Color().setHSL(cfg.hue, 0.9, 0.15),
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(1.5, 1), mat);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.5, 0.08, 6, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(cfg.hue, 0.9, 0.5),
          transparent: true,
          opacity: 0.3,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
      const light = new THREE.PointLight(new THREE.Color().setHSL(cfg.hue, 0.9, 0.5), 3, 25);
      mesh.add(light);
      ctx.scene.add(mesh);
      this.pms.push({ cfg, mesh, mat, ring, light, ti: 0 });
    }
  }

  /** Number of puppet masters (constant 3 — feeds the telemetry `puppeteers` field). */
  get count(): number {
    return this.pms.length;
  }

  /**
   * Orbit, pulse, and fire interval actions (legacy 492-503).
   * O(1) per frame (3 puppets); action ticks are O(1) except 'mutate' which is O(30).
   * Allocation-free: precomputed messages + module scratch event object.
   */
  update(dt: number, t: number): void {
    for (let i = 0; i < this.pms.length; i++) {
      const pm = this.pms[i];
      if (!pm) continue; // noUncheckedIndexedAccess: i < length
      const cfg = pm.cfg;
      const ang = t * cfg.spd;
      pm.mesh.position.set(
        Math.cos(ang) * cfg.orb,
        cfg.y + Math.sin(t * 0.3 + cfg.hue * 10) * 5,
        Math.sin(ang) * cfg.orb,
      );
      pm.mesh.rotation.x += dt * 0.5;
      pm.mesh.rotation.y += dt * 0.7;
      pm.ring.rotation.z = t * 2;
      pm.light.intensity = 2 + Math.sin(t * 3 + cfg.hue * 20) * 1.5;
      pm.mat.emissiveIntensity = 1.5 + Math.sin(t * 2 + cfg.hue * 15) * 0.8;
      pm.ti += dt * 30;
      if (pm.ti >= cfg.iv) {
        pm.ti = 0;
        this.act(cfg);
      }
    }
  }

  /** Perform one interval action (legacy 498-501). */
  private act(cfg: PuppetConfig): void {
    const ctx = this.ctx;
    const rng = ctx.rng;
    switch (cfg.act) {
      case 'chaos': {
        ctx.state.chaos = clamp(ctx.state.chaos + 0.5 + rng() * 2, CHAOS_MIN, CHAOS_MAX * 0.7);
        this.emit(cfg.name, CHAOS_MESSAGE);
        ctx.sfx('warp');
        break;
      }
      case 'weather': {
        ctx.state.weatherIdx = Math.floor(rng() * WEATHERS.length);
        // Invariant: weatherIdx ∈ [0, WEATHERS.length) and WEATHER_MESSAGES maps 1:1 to WEATHERS.
        this.emit(cfg.name, WEATHER_MESSAGES[ctx.state.weatherIdx]!);
        ctx.sfx('crystallize');
        break;
      }
      case 'mutate': {
        const list = this.entities.list;
        const mc = Math.min(30, list.length);
        for (let mi = 0; mi < mc; mi++) {
          const target = list[Math.floor(rng() * list.length)];
          if (target) this.entities.remorph(target, Math.floor(rng() * MORPH_COUNT));
        }
        // Known Bug 14: the counter is now read by telemetry (#v8), so keep it accurate.
        ctx.state.mutations += mc;
        // Invariant: mc ∈ [0, 30] and RESHAPE_MESSAGES has 31 entries.
        this.emit(cfg.name, RESHAPE_MESSAGES[mc]!);
        ctx.sfx('mutate');
        break;
      }
    }
  }

  /** Fill the scratch event and notify the HUD listener. O(1), allocation-free. */
  private emit(name: string, action: string): void {
    EVENT.name = name;
    EVENT.action = action;
    this.onEvent(EVENT);
  }
}
