/**
 * PER-ENTITY NEURAL CONTROLLER (V42) — the genome's 70-param brain steering each organism. Pins:
 * determinism (same seed ⇒ same brains ⇒ same steer), per-entity diversity, bounded authority,
 * round-robin coverage of the whole population, NHI exemption, and NaN-freedom.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { EntityBrainField } from '../src/sim/entity-brain';
import { GENOME_LEN } from '../src/sim/genome';
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

  test('round-robin covers the WHOLE population over SLICES frames (each thinks once)', () => {
    const field = new EntityBrainField(50, mulberry32(1));
    const list = fakeList(50);
    let total = 0;
    for (let f = 0; f < 8; f++) total += field.think(list, 2, f / 60);
    expect(total).toBe(50); // every entity thought exactly once across the 8-frame cycle
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
