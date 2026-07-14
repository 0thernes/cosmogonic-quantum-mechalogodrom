/**
 * PER-ENTITY NEURAL CONTROLLER (V42) — the genome's 70-param brain steering each organism. Pins:
 * determinism (same seed ⇒ same brains ⇒ same steer), per-entity diversity, bounded authority,
 * full-population thinking, NHI exemption, and NaN-freedom.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { getQuantizationConfig } from '../src/math/quantization';
import { EntityBrainField } from '../src/sim/entity-brain';
import { GENOME_LEN, TRAIT_GENES } from '../src/sim/genome';
import type { Entity, EntityData, OrganismIntelligenceSignal } from '../src/types';

/** A minimal fake organism carrying only the fields the brain reads. */
function fakeEntity(i: number, isNhi = false): Entity {
  const ud = {
    vel: new THREE.Vector3(0, 0, 0),
    age: 10,
    life: 600,
    ph: i * 0.137,
    energy: 30 + (i % 40),
    payoff: 0,
    act: 0,
    isNhi,
  } as unknown as EntityData;
  return { position: new THREE.Vector3(i, 0, 0), userData: ud } as unknown as Entity;
}

function fakeList(n: number, nhiEvery = 0): Entity[] {
  return Array.from({ length: n }, (_, i) => fakeEntity(i, nhiEvery > 0 && i % nhiEvery === 0));
}

function threatSignal(threat: number): OrganismIntelligenceSignal {
  return {
    enabled: true,
    indicatorOnly: true,
    revision: 1,
    resourcePressure: 0.7,
    threatResponse: threat,
    exploration: 0.6,
    socialDrive: 0.8,
    plasticity: 0.5,
    forecast: 0.55,
    confidence: 1,
    corpusDrive: 0.6,
    ecologyRisk: threat,
    ecologySurprise: 0.2,
    channels: Float32Array.from([0.7, threat, 0.6, 0.8]),
    integratedRepoCount: 17,
    diagnosticAlert: false,
  };
}

describe('EntityBrainField (V42)', () => {
  test('the brain genome is 80 genes (10 traits + a 70-param brain)', () => {
    expect(GENOME_LEN).toBe(80);
  });

  test('same seed ⇒ identical brains ⇒ identical steering (deterministic)', () => {
    const a = new EntityBrainField(64, mulberry32(7));
    const b = new EntityBrainField(64, mulberry32(7));
    expect(Array.from(a.genomeAt(3))).toEqual(Array.from(b.genomeAt(3)));
    const la = fakeList(64);
    const lb = fakeList(64);
    for (let f = 0; f < 8; f++) {
      a.think(la, 4, f / 60);
      b.think(lb, 4, f / 60);
    }
    for (let i = 0; i < 64; i++) {
      expect(la[i]!.userData.vel.x).toBeCloseTo(lb[i]!.userData.vel.x, 10);
      expect(la[i]!.userData.vel.z).toBeCloseTo(lb[i]!.userData.vel.z, 10);
    }
  });

  test('quality-tier quantization is FP32 on every tier (full neural fidelity)', () => {
    const fp32 = new EntityBrainField(64, mulberry32(7), {
      useFp16: false,
      useInt8: false,
      int8MaxError: 0.01,
    });
    const tiered = new EntityBrainField(64, mulberry32(7), getQuantizationConfig('desktop'));
    expect(fp32.genomeStorageKind()).toBe('fp32');
    expect(tiered.genomeStorageKind()).toBe('fp32');
    expect(fp32.genomeStorageBytes()).toBe(64 * GENOME_LEN * 4);
    expect(tiered.genomeStorageBytes()).toBe(64 * GENOME_LEN * 4);
  });

  test('explicit packed storage still mutates the real predator brain during devour', () => {
    const field = new EntityBrainField(8, mulberry32(17), {
      useFp16: true,
      useInt8: false,
      int8MaxError: 0.01,
    });
    const before = Array.from(field.genomeAt(2).subarray(TRAIT_GENES));
    const prey = field.genomeAt(3).subarray(TRAIT_GENES);
    const result = field.devourBrain(2, prey, 0.25);
    const after = Array.from(field.genomeAt(2).subarray(TRAIT_GENES));
    expect(result.mindDistance).toBeGreaterThan(0);
    expect(result.transfer).toBeGreaterThan(0);
    expect(after).not.toEqual(before);
  });

  test('entities steer DIFFERENTLY — distinct brains, not one shared rule', () => {
    const field = new EntityBrainField(64, mulberry32(11));
    const list = fakeList(64);
    for (let f = 0; f < 8; f++) field.think(list, 5, f / 60);
    const xs = new Set(list.map((e) => Math.round(e.userData.vel.x * 1e4)));
    expect(xs.size).toBeGreaterThan(8); // many different steering outcomes
  });

  test('steering authority is small + bounded (a flavour, not a takeover)', () => {
    const field = new EntityBrainField(16, mulberry32(3));
    const list = fakeList(16);
    field.think(list, 5, 0); // one cohort
    for (const e of list) {
      const d = Math.hypot(e.userData.vel.x, e.userData.vel.y, e.userData.vel.z);
      expect(d).toBeLessThan(0.15); // a single think nudges velocity only slightly
    }
  });

  test('full-quality thinking covers the WHOLE population every frame', () => {
    const field = new EntityBrainField(50, mulberry32(1));
    const list = fakeList(50);
    const total = field.think(list, 2, 0);
    expect(total).toBe(50);
  });

  test('priority-selected brains use original entity slots, not compact list order', () => {
    const fullField = new EntityBrainField(16, mulberry32(13));
    const priorityField = new EntityBrainField(16, mulberry32(13));
    const fullList = Array.from({ length: 16 }, (_, i) => fakeEntity(i, i !== 8));
    const priorityList = Array.from({ length: 16 }, (_, i) => fakeEntity(i, i !== 8));

    const fullThought = fullField.think(fullList, 4, 0);
    const priorityThought = priorityField.thinkIndices(priorityList, [8], 4, 0);

    expect(fullThought).toBe(1);
    expect(priorityThought).toBe(1);
    expect(priorityList[8]!.userData.vel.x).toBeCloseTo(fullList[8]!.userData.vel.x, 10);
    expect(priorityList[8]!.userData.vel.y).toBeCloseTo(fullList[8]!.userData.vel.y, 10);
    expect(priorityList[8]!.userData.vel.z).toBeCloseTo(fullList[8]!.userData.vel.z, 10);
  });

  test('launched NHIs are exempt (they fly their own deep mind)', () => {
    const field = new EntityBrainField(40, mulberry32(9));
    const list = fakeList(40, 4); // every 4th is an NHI
    for (let f = 0; f < 8; f++) field.think(list, 6, f / 60);
    for (let i = 0; i < 40; i++) {
      const moved = list[i]!.userData.vel.lengthSq() > 0;
      if (i % 4 === 0) expect(moved).toBe(false); // NHI untouched
    }
  });

  test('priority-selected thinking skips invalid slots, missing entities, and NHIs', () => {
    const field = new EntityBrainField(4, mulberry32(23));
    const list: Array<Entity | undefined> = [
      fakeEntity(0),
      undefined,
      fakeEntity(2, true),
      fakeEntity(3),
    ];

    const thought = field.thinkIndices(list, [-1, 1, 2, 3, 4, 1.5], 5, 0);

    expect(thought).toBe(1);
    expect(list[0]!.userData.vel.lengthSq()).toBe(0);
    expect(list[2]!.userData.vel.lengthSq()).toBe(0);
    expect(list[3]!.userData.vel.lengthSq()).toBeGreaterThan(0);
  });

  test('protected organisms run the full brain but threat level cannot steer them', () => {
    const highThreat = new EntityBrainField(1, mulberry32(0x5afe_b001));
    const lowThreat = new EntityBrainField(1, mulberry32(0x5afe_b001));
    highThreat.attachAdaptiveField(threatSignal(1), null);
    lowThreat.attachAdaptiveField(threatSignal(0), null);
    const high = fakeEntity(0);
    const low = fakeEntity(0);
    high.userData.payoff = 10;
    low.userData.payoff = -10;
    const sanctuaryAt = () => true;

    expect(highThreat.thinkAll([high], 9, 1.25, sanctuaryAt)).toBe(1);
    expect(lowThreat.thinkAll([low], 9, 1.25, sanctuaryAt)).toBe(1);
    expect(high.userData.vel.toArray()).toEqual(low.userData.vel.toArray());
    high.userData.vel.set(0, 0, 0);
    low.userData.vel.set(0, 0, 0);
    expect(highThreat.thinkAll([high], 9, 1.25 + 1 / 60, sanctuaryAt)).toBe(1);
    expect(lowThreat.thinkAll([low], 9, 1.25 + 1 / 60, sanctuaryAt)).toBe(1);
    expect(high.userData.vel.toArray()).toEqual(low.userData.vel.toArray());
    expect(high.userData.vel.lengthSq()).toBeGreaterThan(0);
    expect(high.userData.act).toBeGreaterThan(0);
    const semantic = highThreat.semanticStateAt(0);
    expect(semantic.threat).toBe(0);
    expect(semantic.resource).toBeGreaterThan(0);
    expect(semantic.social).toBeGreaterThan(0);
    expect(semantic.exploration).toBeGreaterThan(0);
  });

  test('the optional predicate is local, reversible, and does not consume RNG during thinking', () => {
    let draws = 0;
    const seeded = mulberry32(0x5afe_b002);
    const countedRng = (): number => {
      draws++;
      return seeded();
    };
    const protectedField = new EntityBrainField(2, countedRng);
    const exposedField = new EntityBrainField(2, mulberry32(0x5afe_b002));
    protectedField.attachAdaptiveField(threatSignal(1), null);
    exposedField.attachAdaptiveField(threatSignal(1), null);
    const protectedList = fakeList(2);
    const exposedList = fakeList(2);
    const afterConstruction = draws;

    protectedField.thinkAll(protectedList, 9, 1.25, (x) => x === 0);
    exposedField.thinkAll(exposedList, 9, 1.25);

    expect(draws).toBe(afterConstruction);
    expect(protectedList[0]!.userData.vel.toArray()).not.toEqual(
      exposedList[0]!.userData.vel.toArray(),
    );
    expect(protectedList[1]!.userData.vel.toArray()).toEqual(
      exposedList[1]!.userData.vel.toArray(),
    );

    protectedField.resetEntitySlots();
    exposedField.resetEntitySlots();
    for (const entity of [...protectedList, ...exposedList]) entity.userData.vel.set(0, 0, 0);
    protectedField.thinkAll(protectedList, 9, 1.5, null);
    exposedField.thinkAll(exposedList, 9, 1.5);
    expect(protectedList[0]!.userData.vel.toArray()).toEqual(
      exposedList[0]!.userData.vel.toArray(),
    );
  });

  test('velocities stay finite under sustained thinking (no NaN)', () => {
    const field = new EntityBrainField(32, mulberry32(5));
    const list = fakeList(32);
    for (let f = 0; f < 400; f++) field.think(list, 8, f / 60);
    for (const e of list) {
      const v = e.userData.vel;
      expect(Number.isFinite(v.x + v.y + v.z)).toBe(true);
    }
  });
});
