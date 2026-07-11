/** Pure mechanism tests plus a narrow static seal for World composition-root wiring. */
import { describe, expect, test } from 'bun:test';
import { SpatialHash } from '../src/math/spatial-hash';
import {
  isNhiManipulationTarget,
  NHI_EFFECT_MAX_SPEED,
  NHI_ENERGY_CAP,
  NHI_HUNT_CAPTURE_RADIUS,
  resolveNhiHuntEffect,
  resolveNhiMimicEffect,
  selectNearestNhiTarget,
  type NhiEffectBody,
} from '../src/sim/nhi-target-effects';

const SELF: NhiEffectBody = {
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  energy: 40,
  strategy: 0,
  setGroup: 1,
  phylum: 2,
  alive: true,
};

const TARGET: NhiEffectBody = {
  position: { x: 10, y: 0, z: 0 },
  velocity: { x: 0, y: 2, z: 0 },
  energy: 30,
  strategy: 1,
  setGroup: 7,
  phylum: 8,
  alive: true,
};

describe('NHI target effects', () => {
  test('MANIPULATE accepts only a live ordinary member of the intended valid faction', () => {
    expect(isNhiManipulationTarget({ setGroup: 7 }, 7)).toBe(true);
    expect(isNhiManipulationTarget({ setGroup: 8 }, 7)).toBe(false);
    expect(isNhiManipulationTarget({ setGroup: 7, alive: false }, 7)).toBe(false);
    expect(isNhiManipulationTarget({ setGroup: 7, isNhi: true }, 7)).toBe(false);
    expect(isNhiManipulationTarget({ setGroup: -1 }, -1)).toBe(false);
    expect(isNhiManipulationTarget({ setGroup: 7 }, Number.NaN)).toBe(false);
  });
  test('selects the exact nearest live ordinary target and retains a previous target on ties', () => {
    const self = { position: { x: 0, y: 0, z: 0 }, userData: { isNhi: true, alive: true } };
    const farther = { position: { x: 3, y: 0, z: 0 }, userData: { alive: true } };
    const tiedA = { position: { x: 2, y: 0, z: 0 }, userData: { alive: true } };
    const tiedB = { position: { x: -2, y: 0, z: 0 }, userData: { alive: true } };
    const dead = { position: { x: 0.1, y: 0, z: 0 }, userData: { alive: false } };
    const nhi = { position: { x: 0.2, y: 0, z: 0 }, userData: { isNhi: true } };
    const invalid = {
      position: { x: Number.NaN, y: 0, z: 0 },
      userData: { alive: true },
    };

    const candidates = [self, farther, tiedA, tiedB, dead, nhi, invalid];
    expect(selectNearestNhiTarget(self, candidates)).toEqual({
      target: tiedA,
      distanceSquared: 4,
    });
    expect(selectNearestNhiTarget(self, candidates, tiedB)).toEqual({
      target: tiedB,
      distanceSquared: 4,
    });
    expect(selectNearestNhiTarget(self, [self, dead, nhi, invalid])).toEqual({
      target: null,
      distanceSquared: Number.POSITIVE_INFINITY,
    });
    expect(
      selectNearestNhiTarget(
        { ...self, position: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 } },
        candidates,
      ).target,
    ).toBeNull();
  });

  test('requires a current spatial rebuild before the bounded query can prove exactness', () => {
    const self = { position: { x: 0, y: 0, z: 0 }, userData: { isNhi: true, alive: true } };
    const moved = { position: { x: 64.1, y: 0, z: 0 }, userData: { alive: true } };
    const decoy = { position: { x: 10, y: 0, z: 0 }, userData: { alive: true } };
    const grid = new SpatialHash<typeof self | typeof moved | typeof decoy>(16);
    for (const entity of [self, moved, decoy]) grid.insert(entity);

    moved.position.x = 1;
    const staleSelection = selectNearestNhiTarget(self, grid.query(0, 0, 48));
    expect(staleSelection.target).toBe(decoy);
    expect(staleSelection.distanceSquared).toBe(100);

    grid.clear();
    for (const entity of [self, moved, decoy]) grid.insert(entity);
    const currentSelection = selectNearestNhiTarget(self, grid.query(0, 0, 48));
    expect(currentSelection.target).toBe(moved);
    expect(currentSelection.distanceSquared).toBe(1);
  });

  test('incremental insertion makes a same-beat spawn visible without a second full rebuild', () => {
    const self = { position: { x: 0, y: 0, z: 0 }, userData: { isNhi: true, alive: true } };
    const decoy = { position: { x: 10, y: 0, z: 0 }, userData: { alive: true } };
    const child = { position: { x: 1, y: 0, z: 0 }, userData: { alive: true } };
    const grid = new SpatialHash<typeof self | typeof decoy | typeof child>(16);
    grid.insert(self);
    grid.insert(decoy);
    expect(selectNearestNhiTarget(self, grid.query(0, 0, 48)).target).toBe(decoy);
    grid.insert(child);
    expect(selectNearestNhiTarget(self, grid.query(0, 0, 48)).target).toBe(child);
  });

  test('HUNT deterministically steers toward a distant target without transferring energy', () => {
    const selfBefore = structuredClone(SELF);
    const targetBefore = structuredClone(TARGET);
    const first = resolveNhiHuntEffect(SELF, TARGET, 1);
    const second = resolveNhiHuntEffect(SELF, TARGET, 1);
    expect(first).toEqual(second);
    expect(first.applied).toBe(true);
    expect(first.captured).toBe(false);
    expect(first.distance).toBe(10);
    expect(first.selfVelocity.x).toBeGreaterThan(0);
    expect(first.selfVelocity.y).toBe(0);
    expect(first.selfVelocity.z).toBe(0);
    expect(first.energyTransferred).toBe(0);
    expect(first.selfEnergy).toBe(SELF.energy);
    expect(first.targetEnergy).toBe(TARGET.energy);
    expect(SELF).toEqual(selfBefore);
    expect(TARGET).toEqual(targetBefore);
  });

  test('HUNT capture conserves energy and respects prey, transfer, and headroom bounds', () => {
    const hunter = { ...SELF, energy: 96 };
    const prey = {
      ...TARGET,
      position: { x: NHI_HUNT_CAPTURE_RADIUS - 1, y: 0, z: 0 },
      energy: 9,
    };
    const effect = resolveNhiHuntEffect(hunter, prey, 1);
    expect(effect.captured).toBe(true);
    expect(effect.energyTransferred).toBe(4); // hunter headroom is the tightest bound
    expect(effect.selfEnergy).toBe(NHI_ENERGY_CAP);
    expect(effect.targetEnergy).toBe(5);
    expect(effect.selfEnergy + effect.targetEnergy).toBe(hunter.energy + prey.energy);

    const scarce = resolveNhiHuntEffect({ ...SELF, energy: 50 }, { ...prey, energy: 2 }, 1);
    expect(scarce.energyTransferred).toBe(2);
    expect(scarce.selfEnergy + scarce.targetEnergy).toBe(52);

    const full = resolveNhiHuntEffect({ ...SELF, energy: 100 }, prey, 1);
    expect(full.energyTransferred).toBe(0);
    expect(full.targetEnergy).toBe(prey.energy);
  });

  test('HUNT handles zero distance, missing/dead targets, and hostile numeric input safely', () => {
    const coincident = resolveNhiHuntEffect(SELF, { ...TARGET, position: SELF.position }, 1);
    expect(coincident.applied).toBe(true);
    expect(coincident.captured).toBe(true);
    expect(coincident.distance).toBe(0);
    expect(coincident.selfVelocity).toEqual(SELF.velocity);

    expect(resolveNhiHuntEffect(SELF, null, 1).applied).toBe(false);
    expect(resolveNhiHuntEffect(SELF, { ...TARGET, alive: false }, 1).applied).toBe(false);

    const hostile = resolveNhiHuntEffect(
      {
        ...SELF,
        position: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: Number.NEGATIVE_INFINITY },
        velocity: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: Number.NEGATIVE_INFINITY },
        energy: Number.POSITIVE_INFINITY,
      },
      {
        ...TARGET,
        position: { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY, z: Number.NaN },
        velocity: { x: Number.POSITIVE_INFINITY, y: Number.NaN, z: 1e300 },
        energy: Number.NEGATIVE_INFINITY,
      },
      Number.POSITIVE_INFINITY,
    );
    expect(hostile.distance).not.toBeNull();
    expect(Number.isFinite(hostile.distance ?? Number.NaN)).toBe(true);
    expect(Object.values(hostile.selfVelocity).every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...Object.values(hostile.selfVelocity))).toBeLessThanOrEqual(
      NHI_EFFECT_MAX_SPEED,
    );
    expect(hostile.selfEnergy).toBeGreaterThanOrEqual(0);
    expect(hostile.selfEnergy).toBeLessThanOrEqual(NHI_ENERGY_CAP);
    expect(hostile.targetEnergy).toBeGreaterThanOrEqual(0);
    expect(hostile.targetEnergy).toBeLessThanOrEqual(NHI_ENERGY_CAP);
  });

  test('MIMIC copies behavioral classification and blends movement without mutating either input', () => {
    const self = { ...SELF, velocity: { x: 4, y: 0, z: 0 } };
    const target = { ...TARGET, velocity: { x: 0, y: 4, z: 0 } };
    const selfBefore = structuredClone(self);
    const targetBefore = structuredClone(target);
    const first = resolveNhiMimicEffect(self, target, 1);
    expect(first).toEqual(resolveNhiMimicEffect(self, target, 1));
    expect(first.applied).toBe(true);
    expect(first.strategy).toBe(1);
    expect(first.setGroup).toBe(target.setGroup);
    expect(first.phylum).toBe(target.phylum);
    expect(first.selfVelocity.x).toBeCloseTo(1.4, 10);
    expect(first.selfVelocity.y).toBeCloseTo(2.6, 10);
    expect(first.selfVelocity.z).toBe(0);
    expect(self).toEqual(selfBefore);
    expect(target).toEqual(targetBefore);
  });

  test('MIMIC no-ops on absent/dead targets and finitize-clamps its patch', () => {
    expect(resolveNhiMimicEffect(SELF, null, 1).applied).toBe(false);
    expect(resolveNhiMimicEffect(SELF, { ...TARGET, alive: false }, 1).applied).toBe(false);

    const effect = resolveNhiMimicEffect(
      { ...SELF, velocity: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: -1e300 } },
      {
        ...TARGET,
        velocity: { x: Number.NEGATIVE_INFINITY, y: Number.NaN, z: 1e300 },
        strategy: Number.POSITIVE_INFINITY,
        setGroup: Number.POSITIVE_INFINITY,
        phylum: Number.NEGATIVE_INFINITY,
      },
      Number.POSITIVE_INFINITY,
    );
    expect(effect.applied).toBe(true);
    expect(Object.values(effect.selfVelocity).every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...Object.values(effect.selfVelocity))).toBeLessThanOrEqual(
      NHI_EFFECT_MAX_SPEED,
    );
    expect(effect.strategy).toBe(1);
    expect(effect.setGroup).toBe(1_000_000);
    expect(effect.phylum).toBe(-1);
  });
});

const WORLD = await Bun.file(new URL('../src/world.ts', import.meta.url)).text();

describe('World NHI target-effect wiring', () => {
  test('retains the exact rival target and invokes both production effects', () => {
    const perceptStart = WORLD.indexOf('private nhiPercept');
    const applyStart = WORLD.indexOf('private nhiApply');
    const applyEnd = WORLD.indexOf('\n  /**', applyStart + 1);
    const percept = WORLD.slice(perceptStart, applyStart);
    const apply = WORLD.slice(applyStart, applyEnd);
    const integration = WORLD.indexOf('const stats = this.entities.update');
    const containment = WORLD.indexOf('this.steerNhiBeings(t)', integration);
    const currentGrid = WORLD.indexOf('this.grid.clear()', containment);
    const tick = WORLD.indexOf('this.nhi.tick(this.rng, this.nhiWorld)', currentGrid);

    expect(WORLD).toContain('private readonly nhiTargets = new Map<number, Entity>();');
    expect(integration).toBeGreaterThanOrEqual(0);
    expect(containment).toBeGreaterThan(integration);
    expect(currentGrid).toBeGreaterThan(containment);
    expect(tick).toBeGreaterThan(currentGrid);
    expect(WORLD).toContain('const rebuildCurrentGrid = this.nhi.count > 0;');
    expect(WORLD).not.toContain('nhiEntitySetScratch');
    expect(WORLD).toContain('return this.nhiLiveScratch;');
    expect(percept).toContain('selectNearestNhiTarget(e, near, previousTarget ?? null)');
    expect(percept).toContain('this.nhiTargets.set(id, nearestTarget);');
    expect(percept).toContain('rivalFaction = nearestTarget.userData.setGroup;');
    expect(percept).toContain('rivalLastMove = nearestTarget.userData.strategy;');
    expect(apply).toContain('intent.action === NhiAction.HUNT');
    expect(apply).toContain('isNhiManipulationTarget(o.userData, intent.target)');
    expect(apply).toContain('o.userData.strategy !== flip');
    expect(apply).toContain('this.grid.insert(child);');
    expect(apply).toContain('resolveNhiHuntEffect(');
    expect(apply).toContain('target.userData.energy = effect.targetEnergy;');
    expect(apply).toContain('intent.action === NhiAction.MIMIC');
    expect(apply).toContain('resolveNhiMimicEffect(');
    expect(apply).toContain('e.userData.strategy = effect.strategy;');
    expect(apply).toContain('e.userData.vel.set(');
  });
});
