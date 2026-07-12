/** Exact seals for the user-directed 2× XZ / 3× Y habitat expansion. */
import { describe, expect, test } from 'bun:test';
import { QUALITY_LADDER } from '../src/core/quality';
import { rotatingSquareSurveyHeight } from '../src/core/camera-framing';
import {
  ARENA,
  ARENA_MID,
  ARENA_Y,
  CAMERA_FAR,
  FOG_SCALE,
  GROUND_EXTENT,
  HABITAT_MID,
  HABITAT_XZ_SCALE,
  HABITAT_Y,
  HABITAT_Y_SCALE,
  PLATFORM_CEIL,
  PLATFORM_FLOOR,
  PLATFORM_HALF,
  PLATFORM_HEIGHT,
  PLATFORM_MID_Y,
  SOCIAL_APEX_SENSE_R,
  SOCIAL_CASTE_SCALE,
  SOCIAL_CONNECTOME_R,
  SOCIAL_FLOCK_R,
  SOCIAL_MARKET_R,
  SOCIAL_NASH_R,
  SOCIAL_NHI_ACTION_R,
  SOCIAL_NHI_KIN_R,
  SOCIAL_SCALE,
  SOCIAL_SPAWN_INNER,
  SOCIAL_SPAWN_OUTER,
  SOCIAL_SPAWN_XZ_FRAC,
  SOCIAL_SPAWN_Y_FRAC,
  SOCIAL_TRADE_R,
} from '../src/sim/constants';
import {
  baseTerrainHeightAt,
  GROUND_GRID_DIVISIONS,
  GROUND_SEGMENTS,
} from '../src/sim/terrain-profile';
import { writeNhiRoamTarget } from '../src/sim/habitat-roaming';
import {
  TERRAIN_DETAIL_BASE_FREQUENCY,
  terrainDisplacementAt,
} from '../src/sim/terrain-deformation';

describe('expanded habitat contract', () => {
  test('doubles width and length, quadruples land, and triples the ceiling', () => {
    expect(HABITAT_XZ_SCALE).toBe(2);
    expect(HABITAT_Y_SCALE).toBe(3);
    expect(GROUND_EXTENT).toBe(2400);
    expect(PLATFORM_HALF).toBe(1080);
    expect(PLATFORM_FLOOR).toBe(6);
    expect(PLATFORM_CEIL).toBe(720);
    expect(PLATFORM_HEIGHT).toBe(714);
    expect(PLATFORM_MID_Y).toBe(363);

    const oldGroundEdge = 240 * ARENA;
    const oldPlatformHalf = (oldGroundEdge / 2) * 0.9;
    expect(GROUND_EXTENT / oldGroundEdge).toBe(2);
    expect((PLATFORM_HALF * 2) ** 2 / (oldPlatformHalf * 2) ** 2).toBe(4);
    expect(PLATFORM_CEIL / 240).toBe(3);
  });

  test('keeps authored object/architecture scale unchanged', () => {
    expect(ARENA).toBe(5);
    expect(ARENA_MID).toBe(2.5);
    expect(ARENA_Y).toBe(2);
    expect(HABITAT_MID).toBe(5);
    expect(HABITAT_Y).toBe(6);
  });

  test('preserves terrain detail and long-range visibility', () => {
    expect(GROUND_SEGMENTS).toBe(600);
    expect(GROUND_GRID_DIVISIONS).toBe(200);
    expect(CAMERA_FAR).toBe(5200);
    expect(FOG_SCALE).toBeCloseTo(0.1, 12);
    expect(TERRAIN_DETAIL_BASE_FREQUENCY).toBe(0.035);

    // Three.js renders two linear triangles per ground cell, whereas each plant root evaluates the
    // analytic terrain function. Across deterministic quasi-random habitat points and hostile live
    // phases, the rendered triangle must remain above the intentional 0.5-unit root seating depth.
    const cell = GROUND_EXTENT / GROUND_SEGMENTS;
    const groundHalf = GROUND_EXTENT / 2;
    const radicalInverse = (index: number, base: number): number => {
      let n = index;
      let f = 1 / base;
      let value = 0;
      while (n > 0) {
        value += (n % base) * f;
        n = Math.floor(n / base);
        f /= base;
      }
      return value;
    };
    const phases: [number, number, number, number, number][] = [
      [0, 0, 0, 0, 0],
      [37.25, 1, 0, 3, -2],
      [123, 1, 0.35, -4, 5],
    ];
    // Hostile regime: max chaos (uChaos=1) + zero entropy (liveAmp=1, full amplitude) + large wind,
    // swept over time — the band where the flat ground-triangle chord dips FURTHEST below the analytic
    // surface. The old 3-phase sample missed every worst case, so the seal test passed green while the
    // guarantee (maxRootGap ≤ 0) was actually violated at other live phases. This sweep exercises it.
    for (let t = 140; t <= 175; t += 0.5) {
      phases.push([t, 1, 0, -10, -10]);
      phases.push([t, 1, 0, -10, 5]);
    }
    // Mirrors FLORA_ROOT_SINK (origin below analytic surface; seal vs rendered triangle chord).
    // GPU SURFACE_RIDE lifts collars to the wave top without violating this root-under-mesh seal.
    const ROOT_SEAT = 0.5;
    let maxRootGap = -Infinity;
    for (const [time, chaos, entropy, windX, windZ] of phases) {
      const height = (x: number, z: number): number =>
        baseTerrainHeightAt(x, z) + terrainDisplacementAt(x, z, time, chaos, entropy, windX, windZ);
      for (let i = 1; i <= 4096; i++) {
        const x = (radicalInverse(i, 2) * 2 - 1) * PLATFORM_HALF;
        const z = (radicalInverse(i, 3) * 2 - 1) * PLATFORM_HALF;
        const ix = Math.max(0, Math.min(GROUND_SEGMENTS - 1, Math.floor((x + groundHalf) / cell)));
        const iz = Math.max(0, Math.min(GROUND_SEGMENTS - 1, Math.floor((z + groundHalf) / cell)));
        const x0 = -groundHalf + ix * cell;
        const z0 = -groundHalf + iz * cell;
        const u = (x - x0) / cell;
        const v = (z - z0) / cell;
        const a = height(x0, z0);
        const b = height(x0, z0 + cell);
        const c = height(x0 + cell, z0 + cell);
        const d = height(x0 + cell, z0);
        const rendered =
          u + v <= 1
            ? a * (1 - u - v) + b * v + d * u
            : b * (1 - u) + c * (u + v - 1) + d * (1 - v);
        const plantedRoot = height(x, z) - ROOT_SEAT;
        maxRootGap = Math.max(maxRootGap, plantedRoot - rendered);
      }
    }
    expect(maxRootGap).toBeLessThanOrEqual(0);
  });

  test('top survey frames all corners at desktop, portrait, and narrow FOV', () => {
    for (const [fov, aspect] of [
      [68, 16 / 9],
      [68, 9 / 16],
      [35, 9 / 16],
    ] as const) {
      const height = rotatingSquareSurveyHeight(PLATFORM_HALF, fov, aspect);
      const vTan = Math.tan((fov * Math.PI) / 360);
      const hTan = vTan * aspect;
      const cornerRadius = PLATFORM_HALF * Math.SQRT2;
      expect(height * vTan).toBeGreaterThan(cornerRadius);
      expect(height * hTan).toBeGreaterThan(cornerRadius);
    }
  });

  test('does not increase any entity quality-tier population ceiling', () => {
    const tiers = Object.values(QUALITY_LADDER);
    expect(tiers.map((q) => q.maxEntities)).toEqual([1000, 2000, 5000, 10000, 25000, 50000]);
    expect(tiers.map((q) => q.targetEntities)).toEqual([1000, 2000, 5000, 10000, 25000, 50000]);
    expect(tiers.map((q) => q.quantumCount)).toEqual([3500, 4500, 6000, 8000, 9000, 10000]);
    expect(tiers.map((q) => q.maxLinks)).toEqual([12000, 24000, 60000, 120000, 300000, 600000]);
    expect(tiers.map((q) => q.starCount)).toEqual([2000, 3000, 4500, 6000, 7000, 8000]);
  });

  test('social contact law scales organism and caste radii with habitat (ADR 0016)', () => {
    // Habitat may grow; social disks must grow with it — never freeze at legacy unit lengths.
    expect(SOCIAL_SCALE).toBe(HABITAT_XZ_SCALE * 2);
    expect(SOCIAL_CASTE_SCALE).toBe(HABITAT_XZ_SCALE * ARENA);
    expect(SOCIAL_FLOCK_R).toBe(8 * SOCIAL_SCALE);
    expect(SOCIAL_NASH_R).toBe(10 * SOCIAL_SCALE);
    expect(SOCIAL_MARKET_R).toBe(12 * SOCIAL_SCALE);
    expect(SOCIAL_CONNECTOME_R).toBe(8 * SOCIAL_SCALE);
    expect(SOCIAL_TRADE_R).toBe(30 * SOCIAL_CASTE_SCALE);
    expect(SOCIAL_NHI_KIN_R).toBe(90 * SOCIAL_CASTE_SCALE);
    expect(SOCIAL_FLOCK_R).toBeGreaterThanOrEqual(8 * HABITAT_XZ_SCALE * 2);
    expect(SOCIAL_TRADE_R).toBeGreaterThanOrEqual(30 * HABITAT_XZ_SCALE * ARENA);
    expect(SOCIAL_NHI_ACTION_R).toBe(36 * SOCIAL_SCALE);
    expect(SOCIAL_APEX_SENSE_R).toBe(24 * SOCIAL_SCALE);
    // Social-core packing: founders must NOT fill the full platform (isolation fog).
    expect(SOCIAL_SPAWN_OUTER).toBeLessThanOrEqual(0.5);
    expect(SOCIAL_SPAWN_INNER).toBeGreaterThan(0);
    expect(SOCIAL_SPAWN_INNER).toBeLessThan(SOCIAL_SPAWN_OUTER);
    expect(SOCIAL_SPAWN_XZ_FRAC).toBeLessThanOrEqual(0.5);
    expect(SOCIAL_SPAWN_Y_FRAC).toBeLessThanOrEqual(0.4);
  });

  test('NHI intent waypoints stay inside habitat and pack a mid-field social core (ADR 0016)', () => {
    const p = { x: 0, y: 0, z: 0 };
    let maxHorizontal = 0;
    let maxY = -Infinity;
    let minY = Infinity;
    let contained = true;
    for (let id = 0; id < 10; id++) {
      for (let t = 0; t < 200; t += 0.25) {
        writeNhiRoamTarget(p, id, t);
        maxHorizontal = Math.max(maxHorizontal, Math.abs(p.x), Math.abs(p.z));
        maxY = Math.max(maxY, p.y);
        minY = Math.min(minY, p.y);
        contained &&=
          Math.abs(p.x) <= PLATFORM_HALF &&
          Math.abs(p.z) <= PLATFORM_HALF &&
          p.y >= PLATFORM_FLOOR &&
          p.y <= PLATFORM_CEIL;
      }
    }
    // Social core: uses expanded habitat volume but does NOT isolation-spread to the rim.
    expect(maxHorizontal).toBeGreaterThan(PLATFORM_HALF * 0.1);
    expect(maxHorizontal).toBeLessThan(PLATFORM_HALF * 0.45);
    expect(maxY).toBeGreaterThan(PLATFORM_MID_Y);
    expect(minY).toBeLessThan(PLATFORM_MID_Y);
    expect(contained).toBe(true);
  });
});
