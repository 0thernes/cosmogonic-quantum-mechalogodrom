/**
 * Peer teaching between tree dwellers must be REAL knowledge transfer through the validated brain
 * weight surface: learner policy measurably moves toward the teacher's, subsequent decisions change,
 * every gate (competence gap, per-learner cooldown, finiteness, shape) holds, no-op "lessons" are
 * never recorded, and the whole mechanism is deterministic (no randomness anywhere).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  TREE_TEACHING_BLEND,
  TREE_TEACHING_COOLDOWN_SECONDS,
  TREE_TEACHING_MIN_MEAL_GAP,
  TreeCreatureTeaching,
} from '../src/sim/tree-creature-teaching';
import {
  createTreeCreatureAction,
  TreeCreatureBrain,
  type TreeCreaturePercept,
} from '../src/sim/tree-creature-brain';
import {
  CRYSTAL_SPECIES,
  CrystalEcosystem,
  type CrystalEcosystemConfig,
} from '../src/sim/crystal-ecosystem';

const PERCEPT: TreeCreaturePercept = {
  energy: 0.4,
  foodDirectionX: 0.7,
  foodDirectionZ: -0.7,
  foodDistance: 0.3,
  socialDensity: 0.5,
  threat: 0,
  safeZoneCalm: 0.9,
  phase: 1.2,
  personality: 0.6,
};

function l2(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2;
  return Math.sqrt(sum);
}

const TINY_CONFIG: CrystalEcosystemConfig = {
  domeBranches: 3,
  bonsaiBranches: 2,
  leaves: 12,
  fruits: 8,
  flowers: 10,
  creaturesPerSpecies: 2,
  ambientCreatures: 7,
  motes: 20,
  relics: 4,
  height: 50,
};

interface TeachingHarness {
  creatures: Array<{
    index: number;
    species: number;
    x: number;
    y: number;
    z: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    state: string;
    stateTimer: number;
    energy: number;
    targetFoodId: number;
    targetFoodGeneration: number;
    mealsEaten: number;
    socialPartner: number;
    neuralActivity: string;
  }>;
  fruits: { positions: Float32Array };
  treeBrains: TreeCreatureBrain[];
  findResidentSocialPartner(creature: unknown, scale: number): unknown;
  attemptResidentTeaching(a: unknown, b: unknown): number;
  chooseCreatureState(creature: unknown, species: unknown, scale: number): void;
  releaseResidentSocialPair(creature: unknown): void;
  stepSeeking(creature: unknown, dt: number, scale: number): void;
}

describe('TreeCreatureTeaching — bounded peer policy transfer', () => {
  test('a lesson moves every learner weight toward the teacher by exactly the blend fraction', () => {
    const teacher = new TreeCreatureBrain(11);
    const learner = new TreeCreatureBrain(77);
    const tw = teacher.weightsView();
    const lw = learner.weightsView();
    const preLearner = Float32Array.from(lw);
    const preDistance = l2(tw, lw);
    expect(preDistance).toBeGreaterThan(0.1);

    const teaching = new TreeCreatureTeaching(4);
    const moved = teaching.attempt(0, 1, tw, lw, TREE_TEACHING_MIN_MEAL_GAP, 0, 10);
    expect(moved).toBeGreaterThan(0);
    for (let i = 0; i < lw.length; i++) {
      const expected = preLearner[i]! + (tw[i]! - preLearner[i]!) * TREE_TEACHING_BLEND;
      expect(lw[i]!).toBeCloseTo(expected, 6);
    }
    expect(l2(tw, lw)).toBeCloseTo(preDistance * (1 - TREE_TEACHING_BLEND), 4);
    // The teacher is never mutated by teaching.
    expect(Array.from(teacher.weightsView())).toEqual(Array.from(tw));
    const status = teaching.status();
    expect(status.events).toBe(1);
    expect(status.lastTeacher).toBe(0);
    expect(status.lastLearner).toBe(1);
    expect(status.lastAt).toBe(10);
    expect(status.lastWeightDelta).toBeCloseTo(moved, 10);
  });

  test('a lesson changes the learner behavior — decisions differ on the same percept', () => {
    const teacher = new TreeCreatureBrain(11);
    const learner = new TreeCreatureBrain(77);
    const action = createTreeCreatureAction();
    learner.decide(PERCEPT, action);
    const beforeSteerX = action.steerX;
    const beforeSteerZ = action.steerZ;
    const beforeSpeed = action.speed;

    const teaching = new TreeCreatureTeaching(4);
    // Several lessons in sequence (cooldown respected) compound into a visible policy shift.
    let now = 0;
    let lessons = 0;
    for (let round = 0; round < 8; round++) {
      now += TREE_TEACHING_COOLDOWN_SECONDS + 1;
      if (teaching.attempt(0, 1, teacher.weightsView(), learner.weightsView(), 10, 0, now) > 0) {
        lessons++;
      }
    }
    expect(lessons).toBe(8);
    learner.decide(PERCEPT, action);
    expect(action.usedFallback).toBe(false);
    const shifted =
      Math.abs(action.steerX - beforeSteerX) +
      Math.abs(action.steerZ - beforeSteerZ) +
      Math.abs(action.speed - beforeSpeed);
    expect(shifted).toBeGreaterThan(1e-4);
  });

  test('competence gap, cooldown, identity, and shape gates all hold and reject silently', () => {
    const teacher = new TreeCreatureBrain(1);
    const learner = new TreeCreatureBrain(2);
    const before = Float32Array.from(learner.weightsView());
    const teaching = new TreeCreatureTeaching(4);

    // Gap below the minimum: rejected, weights byte-identical.
    expect(
      teaching.attempt(
        0,
        1,
        teacher.weightsView(),
        learner.weightsView(),
        TREE_TEACHING_MIN_MEAL_GAP - 1,
        0,
        5,
      ),
    ).toBe(0);
    expect(Array.from(learner.weightsView())).toEqual(Array.from(before));
    // Self-teaching and missing/mismatched vectors: rejected.
    expect(teaching.attempt(1, 1, teacher.weightsView(), learner.weightsView(), 9, 0, 5)).toBe(0);
    expect(teaching.attempt(0, 1, null, learner.weightsView(), 9, 0, 5)).toBe(0);
    expect(
      teaching.attempt(0, 1, teacher.weightsView().subarray(0, 10), learner.weightsView(), 9, 0, 5),
    ).toBe(0);
    // A real lesson, then the cooldown blocks the learner until it expires.
    expect(
      teaching.attempt(0, 1, teacher.weightsView(), learner.weightsView(), 9, 0, 5),
    ).toBeGreaterThan(0);
    expect(
      teaching.attempt(
        0,
        1,
        teacher.weightsView(),
        learner.weightsView(),
        9,
        0,
        5 + TREE_TEACHING_COOLDOWN_SECONDS - 0.001,
      ),
    ).toBe(0);
    expect(
      teaching.attempt(
        0,
        1,
        teacher.weightsView(),
        learner.weightsView(),
        9,
        0,
        5 + TREE_TEACHING_COOLDOWN_SECONDS,
      ),
    ).toBeGreaterThan(0);
    const status = teaching.status();
    expect(status.events).toBe(2);
    expect(status.rejections).toBe(5);
  });

  test('corrupt vectors never spread and identical policies record no event', () => {
    const teacher = new TreeCreatureBrain(3);
    const learner = new TreeCreatureBrain(4);
    const teaching = new TreeCreatureTeaching(4);
    const corrupt = Float32Array.from(teacher.weightsView());
    corrupt[7] = Number.NaN;
    const before = Float32Array.from(learner.weightsView());
    expect(teaching.attempt(0, 1, corrupt, learner.weightsView(), 9, 0, 1)).toBe(0);
    expect(Array.from(learner.weightsView())).toEqual(Array.from(before));
    // Identical policies: nothing moves, nothing is recorded.
    const twinA = new TreeCreatureBrain(5);
    const twinB = new TreeCreatureBrain(5);
    expect(teaching.attempt(2, 3, twinA.weightsView(), twinB.weightsView(), 9, 0, 1)).toBe(0);
    expect(teaching.status().events).toBe(0);
  });

  test('teaching history is deterministic and reset clears ledger and cooldowns', () => {
    const run = (): number[] => {
      const teacher = new TreeCreatureBrain(21);
      const learner = new TreeCreatureBrain(42);
      const teaching = new TreeCreatureTeaching(2);
      teaching.attempt(0, 1, teacher.weightsView(), learner.weightsView(), 6, 1, 3);
      teaching.attempt(0, 1, teacher.weightsView(), learner.weightsView(), 6, 1, 40);
      return Array.from(learner.weightsView());
    };
    expect(run()).toEqual(run());

    const teaching = new TreeCreatureTeaching(2);
    const a = new TreeCreatureBrain(1);
    const b = new TreeCreatureBrain(2);
    teaching.attempt(0, 1, a.weightsView(), b.weightsView(), 6, 1, 3);
    expect(teaching.status().events).toBe(1);
    teaching.reset();
    expect(teaching.status().events).toBe(0);
    expect(teaching.status().lastTeacher).toBe(-1);
    expect(teaching.learnerReady(1, 0)).toBe(true);
  });
});

describe('CrystalEcosystem — resident socialization carries real teaching', () => {
  test('co-located SOCIAL residents pair and the better forager teaches through the live brains', () => {
    const tree = new CrystalEcosystem(
      new THREE.Scene(),
      0xbeef,
      new THREE.Vector3(0, 0, 0),
      TINY_CONFIG,
    );
    const harness = tree as unknown as TeachingHarness;
    const a = harness.creatures[0]!;
    const b = harness.creatures[1]!;
    expect(b.species).toBe(a.species);
    // Engineer a willing, reachable pair with a real competence gap.
    a.x = 0;
    a.y = 10;
    a.z = 0;
    b.x = 2;
    b.y = 10;
    b.z = 0;
    a.neuralActivity = 'social';
    b.neuralActivity = 'social';
    a.mealsEaten = 5;
    b.mealsEaten = 0;

    const partner = harness.findResidentSocialPartner(a, 1);
    expect(partner).toBe(b);

    const learnerBefore = Float32Array.from(harness.treeBrains[b.index]!.weightsView());
    const teacherBefore = Float32Array.from(harness.treeBrains[a.index]!.weightsView());
    const moved = harness.attemptResidentTeaching(a, b);
    expect(moved).toBeGreaterThan(0);
    const learnerAfter = harness.treeBrains[b.index]!.weightsView();
    // Learner moved toward the teacher; teacher unchanged.
    expect(l2(teacherBefore, learnerAfter)).toBeLessThan(l2(teacherBefore, learnerBefore));
    expect(Array.from(harness.treeBrains[a.index]!.weightsView())).toEqual(
      Array.from(teacherBefore),
    );
    const status = tree.neuralStatus();
    expect(status.teachingEvents).toBe(1);
    expect(status.lastTeachingTeacher).toBe(a.index);
    expect(status.lastTeachingLearner).toBe(b.index);
    expect(status.lastTeachingWeightDelta).toBeCloseTo(moved, 10);
    expect(tree.teachingStatus().events).toBe(1);
    tree.dispose();
  });

  test('no willing partner (or a distant one) yields no pairing and no phantom teaching record', () => {
    const tree = new CrystalEcosystem(
      new THREE.Scene(),
      0xbeef,
      new THREE.Vector3(0, 0, 0),
      TINY_CONFIG,
    );
    const harness = tree as unknown as TeachingHarness;
    const a = harness.creatures[0]!;
    const b = harness.creatures[1]!;
    a.x = 0;
    a.y = 10;
    a.z = 0;
    a.neuralActivity = 'social';
    b.neuralActivity = 'rest';
    b.x = 2;
    b.y = 10;
    b.z = 0;
    expect(harness.findResidentSocialPartner(a, 1)).toBeNull();
    b.neuralActivity = 'social';
    b.x = 500; // out of reach
    expect(harness.findResidentSocialPartner(a, 1)).toBeNull();
    expect(tree.neuralStatus().teachingEvents).toBe(0);
    tree.dispose();
  });

  test('foraging competence advances only through one successful canonical resident meal', () => {
    const tree = new CrystalEcosystem(
      new THREE.Scene(),
      0xbeef,
      new THREE.Vector3(0, 0, 0),
      TINY_CONFIG,
    );
    const harness = tree as unknown as TeachingHarness;
    const creature = harness.creatures[0]!;
    const resourceId = tree.foodResourceId('fruit', 0)!;
    const reservation = tree.reserveFoodById(resourceId, -1_000_000 - creature.index);
    expect(reservation).not.toBeNull();
    creature.targetFoodId = reservation!.id;
    creature.targetFoodGeneration = reservation!.generation;
    creature.x = harness.fruits.positions[0]!;
    creature.y = harness.fruits.positions[1]!;
    creature.z = harness.fruits.positions[2]!;
    const mealsBefore = creature.mealsEaten;

    harness.stepSeeking(creature, 0, 1);
    expect(creature.mealsEaten).toBe(mealsBefore + 1);
    expect(tree.edibleResources.get(resourceId)?.state).toBe('respawning');
    // The consumed handle is cleared, so repeating the movement step cannot duplicate competence.
    harness.stepSeeking(creature, 0, 1);
    expect(creature.mealsEaten).toBe(mealsBefore + 1);
    tree.dispose();
  });

  test('state transitions reserve both partners, exclude third parties, and release either end', () => {
    const tree = new CrystalEcosystem(new THREE.Scene(), 0xbeef, new THREE.Vector3(0, 0, 0), {
      ...TINY_CONFIG,
      creaturesPerSpecies: 3,
    });
    const harness = tree as unknown as TeachingHarness;
    const a = harness.creatures[0]!;
    const b = harness.creatures[1]!;
    const c = harness.creatures[2]!;
    for (const [index, creature] of [a, b, c].entries()) {
      creature.x = index * 2;
      creature.y = 10;
      creature.z = 0;
      creature.energy = 100;
      creature.neuralActivity = 'social';
    }

    harness.chooseCreatureState(a, CRYSTAL_SPECIES[a.species]!, 1);
    expect(a.socialPartner).toBe(b.index);
    expect(b.socialPartner).toBe(a.index);
    expect(a.state).toBe('swarm');
    expect(b.state).toBe('swarm');
    expect([b.targetX, b.targetY, b.targetZ]).toEqual([a.targetX, a.targetY, a.targetZ]);
    expect(b.stateTimer).toBe(a.stateTimer);
    // Both reserved residents are unavailable to a third willing candidate.
    expect(harness.findResidentSocialPartner(c, 1)).toBeNull();

    // A state exit from either side releases the reciprocal reservation without immediately
    // recreating it when that side no longer wants to socialize.
    b.neuralActivity = 'rest';
    harness.chooseCreatureState(b, CRYSTAL_SPECIES[b.species]!, 1);
    expect(a.socialPartner).toBe(-1);
    expect(b.socialPartner).toBe(-1);

    // Corrupt/stale references are safe and cannot clear an unrelated pair.
    a.socialPartner = 99_999;
    expect(() => harness.releaseResidentSocialPair(a)).not.toThrow();
    expect(a.socialPartner).toBe(-1);

    b.neuralActivity = 'social';
    harness.chooseCreatureState(a, CRYSTAL_SPECIES[a.species]!, 1);
    expect(a.socialPartner).toBe(b.index);
    tree.resetFood(5);
    expect(harness.creatures.every((creature) => creature.socialPartner === -1)).toBe(true);
    tree.dispose();
  });
});
