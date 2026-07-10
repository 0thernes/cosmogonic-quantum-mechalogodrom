/** Genesis-reset boundary: delayed deaths from the discarded population must be cancellable. */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { getQuantizationConfig } from '../src/math/quantization';
import { DomeFeeding } from '../src/sim/dome-feeding';
import { MechaBlaze } from '../src/sim/mecha-blaze';
import { PortalDeath } from '../src/sim/portal-death';
import { SuperHunt } from '../src/sim/super-hunt';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext } from '../src/types';

function makeCtx(): SimContext {
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: 'phone',
      isMobile: true,
      instanced: false,
      dprCap: 1,
      maxEntities: 10,
      targetEntities: 10,
      quantumCount: 10,
      maxLinks: 10,
      shadows: false,
      starCount: 10,
      quantization: getQuantizationConfig('phone'),
      simRate: 8,
    },
    rng: mulberry32(1),
    grid: new SpatialHash<Entity>(),
    morphs: [],
    geos: [],
    state: {
      chaos: 0.5,
      mutations: 0,
      timeScale: 1,
      renderMode: 'solid',
      sim: 1,
      weatherIdx: 0,
      temperature: 20,
      wind: { x: 0, z: 0 },
      viewIdx: 0,
      algoIdx: 0,
      songIdx: 0,
      algoStep: 0,
      algoMode: 'single',
      algoTimer: 0,
      frame: 0,
      elapsed: 0,
    },
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

interface RespawnQueue {
  respawns: { at: number; mi: number }[];
  stats(): { pending: number };
  clearPendingRespawns(): void;
}

describe('population hazard reset boundary', () => {
  test('all delayed-respawn queues clear atomically', () => {
    const ctx = makeCtx();
    const systems = [
      new DomeFeeding(ctx),
      new MechaBlaze(ctx),
      new PortalDeath(ctx),
      new SuperHunt(ctx),
    ];
    for (const system of systems) {
      const queue = system as unknown as RespawnQueue;
      queue.respawns.push({ at: 5, mi: 2 }, { at: 6, mi: 3 });
      expect(queue.stats().pending).toBe(2);
      queue.clearPendingRespawns();
      expect(queue.stats().pending).toBe(0);
      expect(queue.respawns).toHaveLength(0);
    }
  });
});
