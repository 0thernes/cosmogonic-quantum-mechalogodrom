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
import type { Entity, EntityData } from '../src/types';

/** A minimal fake organism carrying only the fields the brain reads. */
function fakeEntity(i: number, isNhi = false): Entity {
  const ud = {
    vel: new THREE.Vector3(0, 0, 0),
    age: 10,
    life: 600,
    ph: i * 0.137,
    energy: 30 + (i % 40),
    isNhi,
  } as unknown as EntityData;
  return { userData: ud } as unknown as Entity;
}

function fakeList(n: number, nhiEvery = 0): Entity[] {
  return Array.from({ length: n }, (_, i) => fakeEntity(i, nhiEvery > 0 && i % nhiEvery === 0));
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

  test('quality-tier quantization enabled for high tiers (Phase 1.1 optimization)', () => {
    const fp32 = new EntityBrainField(64, mulberry32(7), {
      useFp16: false,
      useInt8: false,
      int8MaxError: 0.01,
    });
    const fp16 = new EntityBrainField(64, mulberry32(7), getQuantizationConfig('desktop'));
    const int8 = new EntityBrainField(64, mulberry32(7), getQuantizationConfig('phone'));
    expect(fp32.genomeStorageKind()).toBe('fp32');
    // High tiers (desktop/ultra/mega) use FP16 for 50% memory reduction
    expect(fp16.genomeStorageKind()).toBe('fp16');
    // Low tiers (phone/tablet/laptop) use FP32 for full precision
    expect(int8.genomeStorageKind()).toBe('fp32');
    expect(fp32.genomeStorageBytes()).toBe(64 * GENOME_LEN * 4);
    // FP16 uses half the storage (2 bytes per float instead of 4)
    expect(fp16.genomeStorageBytes()).toBe(64 * GENOME_LEN * 2);
    expect(int8.genomeStorageBytes()).toBe(64 * GENOME_LEN * 4);
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
