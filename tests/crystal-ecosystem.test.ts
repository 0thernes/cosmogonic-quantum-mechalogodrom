import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import {
  CRYSTAL_TREE_AMBIENT_CREATURES,
  CRYSTAL_TREE_CREATURES,
  CRYSTAL_TREE_DRAW_CALL_BUDGET,
  CRYSTAL_TREE_FLOWERS,
  CRYSTAL_TREE_FRUITS,
  CRYSTAL_TREE_LEAVES,
  CRYSTAL_TREE_MAIN_BRANCHES,
  CRYSTAL_TREE_MOTES,
  CRYSTAL_TREE_RELICS,
  CRYSTAL_TREE_TRIANGLE_BUDGET,
  CrystalEcosystem,
  type CrystalEcosystemConfig,
  type CrystalEcosystemFrame,
} from '../src/sim/crystal-ecosystem';
import { EDIBLE_RESOURCE_RESPAWN_SECONDS } from '../src/sim/edible-resource';

/** Small census for fast, headless contract tests; production totals are sealed separately. */
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

const BASE_FRAME: CrystalEcosystemFrame = {
  dt: 1 / 30,
  visualDt: 1 / 30,
  time: 0,
  chaos: 0.4,
  entropy: 0.3,
  windX: 1.5,
  windZ: -0.75,
  weather: 0.6,
};

function makeTree(seed = 0xc7ee): { scene: THREE.Scene; tree: CrystalEcosystem } {
  const scene = new THREE.Scene();
  const tree = new CrystalEcosystem(scene, seed, new THREE.Vector3(3, 4, 5), TINY_CONFIG);
  return { scene, tree };
}

function instanceMatrix(mesh: THREE.InstancedMesh, index: number): number[] {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return matrix.toArray();
}

function expectMatrixClose(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (let index = 0; index < expected.length; index++) {
    expect(actual[index]).toBeCloseTo(expected[index]!, 5);
  }
}

describe('CrystalEcosystem headless contract', () => {
  test('the full 30k-canopy / 349-being habitat stays inside its measured GPU budget', () => {
    const scene = new THREE.Scene();
    const tree = new CrystalEcosystem(scene, 0xc7ee);
    const stats = tree.stats();
    expect(stats.mainBranches).toBe(CRYSTAL_TREE_MAIN_BRANCHES);
    expect(stats.subBranches).toBeGreaterThanOrEqual(CRYSTAL_TREE_MAIN_BRANCHES * 3);
    expect(stats.subBranches).toBeLessThanOrEqual(CRYSTAL_TREE_MAIN_BRANCHES * 5);
    expect(stats.leaves).toBe(CRYSTAL_TREE_LEAVES);
    expect(stats.fruits).toBe(CRYSTAL_TREE_FRUITS);
    expect(stats.flowers).toBe(CRYSTAL_TREE_FLOWERS);
    expect(stats.quantumCreatures).toBe(CRYSTAL_TREE_CREATURES);
    expect(stats.neuralControllers).toBe(CRYSTAL_TREE_CREATURES);
    expect(stats.neuralModelReady).toBe(true);
    expect(stats.ambientCreatures).toBe(CRYSTAL_TREE_AMBIENT_CREATURES);
    expect(stats.motes).toBe(CRYSTAL_TREE_MOTES);
    expect(stats.relics).toBe(CRYSTAL_TREE_RELICS);
    expect(stats.drawCalls).toBeLessThanOrEqual(CRYSTAL_TREE_DRAW_CALL_BUDGET);
    expect(stats.triangles).toBeLessThanOrEqual(CRYSTAL_TREE_TRIANGLE_BUDGET);
    const branches = scene.getObjectByName('crystal-tree-roots-and-branches') as THREE.Mesh;
    expect(branches.castShadow).toBe(false);
    expect((branches.geometry.index?.count ?? 0) / 3).toBeGreaterThan(350_000);
    expect(scene.getObjectByName('crystal-canopy-pulse-lights-and-lightning-wisps')).toBeTruthy();
    tree.dispose();
  });

  test('constructs the exact configured home census with bounded render cost', () => {
    const { scene, tree } = makeTree();
    const stats = tree.stats();

    expect(scene.children).toHaveLength(1);
    expect(scene.children[0]!.name).toBe('crystal-ecosystem-home');
    expect(stats.mainBranches).toBe(5);
    expect(stats.subBranches).toBeGreaterThanOrEqual(15);
    expect(stats.subBranches).toBeLessThanOrEqual(25);
    expect(stats.leaves).toBe(TINY_CONFIG.leaves);
    expect(stats.fruits).toBe(TINY_CONFIG.fruits);
    expect(stats.flowers).toBe(TINY_CONFIG.flowers);
    expect(stats.availableFruit).toBe(TINY_CONFIG.fruits);
    expect(stats.quantumCreatures).toBe(TINY_CONFIG.creaturesPerSpecies * 10);
    expect(stats.ambientCreatures).toBe(TINY_CONFIG.ambientCreatures);
    expect(stats.motes).toBe(TINY_CONFIG.motes);
    expect(stats.relics).toBe(TINY_CONFIG.relics);
    expect(stats.drawCalls).toBeLessThanOrEqual(CRYSTAL_TREE_DRAW_CALL_BUDGET);
    expect(stats.triangles).toBeGreaterThan(0);
    expect(stats.triangles).toBeLessThanOrEqual(CRYSTAL_TREE_TRIANGLE_BUDGET);

    tree.dispose();
  });

  test('identical seeds produce identical logical state and different seeds do not', () => {
    const a = makeTree(123);
    const b = makeTree(123);
    const c = makeTree(124);
    expect(a.tree.stateChecksum()).toBe(b.tree.stateChecksum());
    expect(a.tree.stateChecksum()).not.toBe(c.tree.stateChecksum());
    a.tree.dispose();
    b.tree.dispose();
    c.tree.dispose();
  });

  test('tree creatures execute deterministic finite canonical neural controllers with fixed buffers', () => {
    const a = makeTree(125);
    const b = makeTree(125);
    const weights = a.tree.treeBrainWeights(0)!;
    const before = a.tree.neuralStatus();
    const controllerCount = TINY_CONFIG.creaturesPerSpecies * 10;
    expect(before).toMatchObject({
      controllerCount,
      inputCount: 6,
      hiddenCount: 6,
      outputCount: 4,
      parametersPerController: 70,
      totalParameters: 70 * controllerCount,
      modelReady: true,
      decisions: 0,
      fallbackCount: 0,
    });

    for (let i = 0; i < 30; i++) {
      const frame = { ...BASE_FRAME, dt: 1 / 60, visualDt: 1 / 60, time: (i + 1) / 60 };
      a.tree.update(frame);
      b.tree.update(frame);
    }
    const after = a.tree.neuralStatus();
    expect(after.decisions).toBe(30 * TINY_CONFIG.creaturesPerSpecies * 10);
    expect(after.fallbackCount).toBe(0);
    expect(after.modelReady).toBe(true);
    expect(Number.isFinite(after.lastMotorX)).toBe(true);
    expect(Number.isFinite(after.lastMotorZ)).toBe(true);
    expect(Number.isFinite(after.lastSocialDrive)).toBe(true);
    expect(a.tree.treeBrainWeights(0)).toBe(weights);
    expect(a.tree.stateChecksum()).toBe(b.tree.stateChecksum());
    expect(a.tree.stats()).toMatchObject({
      neuralControllers: controllerCount,
      neuralDecisions: after.decisions,
      neuralFallbacks: 0,
      neuralModelReady: true,
    });
    a.tree.dispose();
    b.tree.dispose();
  });

  test('loaded neural outputs causally change bounded runtime locomotion', () => {
    const positive = makeTree(126);
    const negative = makeTree(126);
    const status = positive.tree.neuralStatus();
    const outputBase = status.hiddenCount * (status.inputCount + 1);
    const positiveWeights = new Float32Array(status.parametersPerController);
    const negativeWeights = new Float32Array(status.parametersPerController);
    positiveWeights[outputBase] = 4;
    negativeWeights[outputBase] = -4;
    for (let controller = 0; controller < status.controllerCount; controller++) {
      expect(positive.tree.loadTreeBrainWeights(controller, positiveWeights)).toBe(true);
      expect(negative.tree.loadTreeBrainWeights(controller, negativeWeights)).toBe(true);
    }

    positive.tree.update({ ...BASE_FRAME, dt: 0.1, visualDt: 0.1, time: 0.1 });
    negative.tree.update({ ...BASE_FRAME, dt: 0.1, visualDt: 0.1, time: 0.1 });
    expect(positive.tree.neuralStatus().lastMotorX).toBeGreaterThan(0.99);
    expect(negative.tree.neuralStatus().lastMotorX).toBeLessThan(-0.99);
    expect(positive.tree.stateChecksum()).not.toBe(negative.tree.stateChecksum());
    positive.tree.dispose();
    negative.tree.dispose();
  });

  test('visitor presence is a real allocation-free social input without visitor following', () => {
    const quiet = makeTree(127);
    const visiting = makeTree(127);
    const status = quiet.tree.neuralStatus();
    const weights = new Float32Array(status.parametersPerController);
    // socialDensity input (3) -> hidden 0 -> motorX and socialDrive outputs.
    weights[1 + 3] = 2;
    const outputBase = status.hiddenCount * (status.inputCount + 1);
    weights[outputBase + 1] = 2;
    weights[outputBase + 3 * (status.hiddenCount + 1) + 1] = 2;
    for (let controller = 0; controller < status.controllerCount; controller++) {
      quiet.tree.loadTreeBrainWeights(controller, weights);
      visiting.tree.loadTreeBrainWeights(controller, weights);
    }
    visiting.tree.setVisitorPresence(16, 1);

    quiet.tree.update({ ...BASE_FRAME, dt: 0.1, visualDt: 0.1, time: 0.1 });
    visiting.tree.update({ ...BASE_FRAME, dt: 0.1, visualDt: 0.1, time: 0.1 });
    const quietStatus = quiet.tree.neuralStatus();
    const visitingStatus = visiting.tree.neuralStatus();
    expect(visitingStatus).toMatchObject({
      visitorCount: 16,
      visitorPresence: 0.5,
      visitorSocialActivity: 1,
    });
    expect(Number.isFinite(visitingStatus.lastSocialDrive)).toBe(true);
    expect(visitingStatus.lastSocialDrive).not.toBe(quietStatus.lastSocialDrive);
    expect(visiting.tree.stateChecksum()).not.toBe(quiet.tree.stateChecksum());
    quiet.tree.dispose();
    visiting.tree.dispose();
  });

  test('non-finite neural output invokes a deterministic friendly rest fallback and can reload', () => {
    const { scene, tree } = makeTree(128);
    const weights = tree.treeBrainWeights(0)!;
    weights[0] = Number.NaN;
    tree.update({ ...BASE_FRAME, dt: 0.1, visualDt: 0.1, time: 0.1 });
    const fallback = tree.neuralStatus();
    expect(fallback.modelReady).toBe(false);
    expect(fallback.fallbackCount).toBe(1);
    expect(fallback.lastFallbackReason).toBe('invalid-output');
    const bodies = scene.getObjectByName('crystal-beings-lumivore') as THREE.InstancedMesh;
    for (const value of bodies.instanceMatrix.array) expect(Number.isFinite(value)).toBe(true);

    const valid = new Float32Array(weights.length);
    expect(tree.loadTreeBrainWeights(0, valid)).toBe(true);
    tree.update({ ...BASE_FRAME, dt: 0.1, visualDt: 0.1, time: 0.2 });
    expect(tree.neuralStatus().modelReady).toBe(true);
    tree.dispose();
  });

  test('visual-only suspension animates presentation without advancing logical simulation', () => {
    const { scene, tree } = makeTree(777);
    const ambient = scene.getObjectByName('crystal-ambient-family-0') as THREE.InstancedMesh;
    const wings = scene.getObjectByName('crystal-wings-lumivore') as THREE.InstancedMesh;
    const ambientBefore = Array.from(ambient.instanceMatrix.array);
    const wingsBefore = Array.from(wings.instanceMatrix.array);
    const before = tree.stateChecksum();
    for (let i = 0; i < 20; i++) {
      tree.update({
        ...BASE_FRAME,
        dt: 0,
        visualDt: 1 / 30,
        time: (i + 1) / 30,
        visualOnly: true,
      });
    }
    expect(tree.stateChecksum()).toBe(before);
    expect(Array.from(ambient.instanceMatrix.array)).toEqual(ambientBefore);
    expect(Array.from(wings.instanceMatrix.array)).not.toEqual(wingsBefore);

    for (let i = 0; i < 20; i++) {
      tree.update({ ...BASE_FRAME, time: (i + 1) / 30 });
    }
    expect(tree.stateChecksum()).not.toBe(before);
    tree.dispose();
  });

  test('orbiting creatures retain their authored starting altitude on the first ecological tick', () => {
    const { scene, tree } = makeTree(778);
    const orbiters = scene.getObjectByName('crystal-beings-lumivore') as THREE.InstancedMesh;
    const before = Array.from(orbiters.instanceMatrix.array);
    tree.update({ ...BASE_FRAME, dt: 1 / 120, visualDt: 1 / 120, time: 1 / 120 });
    const after = orbiters.instanceMatrix.array;
    let maxTravel = 0;
    for (let i = 0; i < orbiters.count; i++) {
      const offset = i * 16;
      maxTravel = Math.max(
        maxTravel,
        Math.hypot(
          Number(after[offset + 12]) - Number(before[offset + 12]),
          Number(after[offset + 13]) - Number(before[offset + 13]),
          Number(after[offset + 14]) - Number(before[offset + 14]),
        ),
      );
    }
    expect(maxTravel).toBeLessThan(2);
    tree.dispose();
  });

  test('fruit and leaves are canonical pooled food with reachable distributed approach points', () => {
    const { tree } = makeTree(990);
    const resources = tree.edibleResources.all;
    expect(resources).toHaveLength(TINY_CONFIG.fruits + TINY_CONFIG.leaves);
    expect(resources.filter((resource) => resource.kind === 'fruit')).toHaveLength(
      TINY_CONFIG.fruits,
    );
    expect(resources.filter((resource) => resource.kind === 'leaf')).toHaveLength(
      TINY_CONFIG.leaves,
    );
    expect(new Set(resources.map((resource) => resource.id)).size).toBe(resources.length);
    expect(
      new Set(
        resources.map(
          (resource) => `${resource.interactionX.toFixed(3)}:${resource.interactionZ.toFixed(3)}`,
        ),
      ).size,
    ).toBeGreaterThan(10);
    for (const resource of resources) {
      expect(Number.isFinite(resource.interactionX)).toBe(true);
      expect(resource.interactionY).toBe(4);
      expect(Number.isFinite(resource.interactionZ)).toBe(true);
    }
    tree.dispose();
  });

  test('fruit transaction is race-safe, awards once, hides immediately, and restores at exactly 5.0 seconds', () => {
    // Zero fauna isolates the resource clock: no creature can re-eat slot 0 after it respawns.
    const scene = new THREE.Scene();
    const tree = new CrystalEcosystem(scene, 991, new THREE.Vector3(), {
      ...TINY_CONFIG,
      creaturesPerSpecies: 0,
      ambientCreatures: 0,
    });
    const fruits = scene.getObjectByName('crystal-fruits') as THREE.InstancedMesh;
    const beforeMatrix = instanceMatrix(fruits, 0);
    const resourceId = tree.foodResourceId('fruit', 0)!;
    const ownerOne = 101;
    const reservation = tree.reserveFoodById(resourceId, ownerOne)!;
    expect(reservation).toBeTruthy();
    expect(tree.reserveFoodById(resourceId, 202)).toBeNull();
    expect(tree.beginFoodConsumption(reservation)).toBe(true);
    expect(tree.completeFoodConsumption(reservation)).toBe(28);
    expect(tree.completeFoodConsumption(reservation)).toBe(0);
    const resource = tree.edibleResources.get(resourceId)!;
    expect(resource.state).toBe('respawning');
    expect(resource.respawnAt).toBe(EDIBLE_RESOURCE_RESPAWN_SECONDS);
    expect(instanceMatrix(fruits, 0)).not.toEqual(beforeMatrix);
    expect(new THREE.Matrix4().fromArray(instanceMatrix(fruits, 0)).determinant()).toBe(0);

    expect(tree.edibleResources.update(EDIBLE_RESOURCE_RESPAWN_SECONDS - 0.000_001)).toBe(0);
    expect(resource.state).toBe('respawning');
    expect(tree.edibleResources.update(EDIBLE_RESOURCE_RESPAWN_SECONDS)).toBe(1);
    expect(resource.state).toBe('available');
    expectMatrixClose(instanceMatrix(fruits, 0), beforeMatrix);
    tree.dispose();
  });

  test('leaves follow the same atomic nourishment and exact respawn lifecycle', () => {
    const scene = new THREE.Scene();
    const tree = new CrystalEcosystem(scene, 992, new THREE.Vector3(), {
      ...TINY_CONFIG,
      creaturesPerSpecies: 0,
      ambientCreatures: 0,
    });
    const leaves = scene.getObjectByName('crystal-leaves') as THREE.InstancedMesh;
    const beforeMatrix = instanceMatrix(leaves, 0);
    const resourceId = tree.foodResourceId('leaf', 0)!;
    const reservation = tree.reserveFoodById(resourceId, 303)!;
    expect(tree.beginFoodConsumption(reservation)).toBe(true);
    expect(tree.completeFoodConsumption(reservation)).toBe(14);
    expect(tree.completeFoodConsumption(reservation)).toBe(0);
    expect(tree.stats().availableLeaves).toBe(TINY_CONFIG.leaves - 1);
    expect(tree.stats().consumedLeaves).toBe(1);
    expect(new THREE.Matrix4().fromArray(instanceMatrix(leaves, 0)).determinant()).toBe(0);
    tree.edibleResources.update(5);
    expectMatrixClose(instanceMatrix(leaves, 0), beforeMatrix);
    expect(tree.stats().availableLeaves).toBe(TINY_CONFIG.leaves);
    tree.dispose();
  });

  test('the tree food clock follows the full scaled simulation delta while locomotion stays bounded', () => {
    const scene = new THREE.Scene();
    const tree = new CrystalEcosystem(scene, 9920, new THREE.Vector3(), {
      ...TINY_CONFIG,
      creaturesPerSpecies: 0,
      ambientCreatures: 0,
    });
    const resourceId = tree.foodResourceId('fruit', 0)!;
    expect(tree.consumeFruit(0)).toBe(true);

    tree.update({
      ...BASE_FRAME,
      dt: EDIBLE_RESOURCE_RESPAWN_SECONDS - 0.000_001,
      visualDt: 0.1,
      time: EDIBLE_RESOURCE_RESPAWN_SECONDS - 0.000_001,
    });
    expect(tree.foodTime).toBeCloseTo(EDIBLE_RESOURCE_RESPAWN_SECONDS - 0.000_001, 8);
    expect(tree.edibleResources.get(resourceId)?.state).toBe('respawning');

    tree.update({
      ...BASE_FRAME,
      dt: 0.000_001,
      visualDt: 0.000_001,
      time: EDIBLE_RESOURCE_RESPAWN_SECONDS,
    });
    expect(tree.foodTime).toBeCloseTo(EDIBLE_RESOURCE_RESPAWN_SECONDS, 8);
    expect(tree.edibleResources.get(resourceId)?.state).toBe('available');
    tree.dispose();
  });

  test('food checkpoint restores remaining sim time and marks only the changed r185 instance range', () => {
    const config = {
      ...TINY_CONFIG,
      creaturesPerSpecies: 0,
      ambientCreatures: 0,
    };
    const sourceScene = new THREE.Scene();
    const source = new CrystalEcosystem(sourceScene, 9922, new THREE.Vector3(), config);
    const sourceFruits = sourceScene.getObjectByName('crystal-fruits') as THREE.InstancedMesh;
    const index = 2;
    const id = source.foodResourceId('fruit', index)!;
    sourceFruits.instanceMatrix.clearUpdateRanges();
    expect(source.consumeFruit(index)).toBe(true);
    expect(sourceFruits.instanceMatrix.updateRanges).toEqual([{ start: index * 16, count: 16 }]);
    sourceFruits.instanceMatrix.onUploadCallback();
    expect(sourceFruits.instanceMatrix.updateRanges).toEqual([]);
    source.update({ ...BASE_FRAME, dt: 2, visualDt: 0, time: 2 });

    const encoded = JSON.stringify(source.snapshotFoodPersistence());
    expect(encoded).not.toContain('Object3D');
    expect(encoded).not.toContain('ownerId');
    const snapshot = JSON.parse(encoded) as ReturnType<typeof source.snapshotFoodPersistence>;
    expect(snapshot.entries).toContainEqual({
      id,
      generation: 1,
      remainingRespawn: 3,
    });

    const restoredScene = new THREE.Scene();
    const restored = new CrystalEcosystem(restoredScene, 9922, new THREE.Vector3(), config);
    const restoredFruits = restoredScene.getObjectByName('crystal-fruits') as THREE.InstancedMesh;
    const authoredMatrix = instanceMatrix(restoredFruits, index);
    restoredFruits.instanceMatrix.clearUpdateRanges();
    restored.restoreFoodPersistence(snapshot);

    expect(restored.edibleResources.get(id)).toMatchObject({
      state: 'respawning',
      ownerId: null,
      respawnAt: 3,
    });
    expect(restored.stats()).toMatchObject({
      availableFruit: config.fruits - 1,
      consumedFruit: 1,
    });
    expect(new THREE.Matrix4().fromArray(instanceMatrix(restoredFruits, index)).determinant()).toBe(
      0,
    );
    expect(restoredFruits.instanceMatrix.updateRanges).toEqual([{ start: index * 16, count: 16 }]);
    // r185's first createBuffer upload does not clear ranges itself; our upload callback must.
    restoredFruits.instanceMatrix.onUploadCallback();
    expect(restoredFruits.instanceMatrix.updateRanges).toEqual([]);

    restored.update({ ...BASE_FRAME, dt: 2.999_999, visualDt: 0, time: 2.999_999 });
    expect(restored.edibleResources.get(id)?.state).toBe('respawning');
    expect(restoredFruits.instanceMatrix.updateRanges).toEqual([]);
    restored.update({ ...BASE_FRAME, dt: 0.000_001, visualDt: 0, time: 3 });
    expect(restored.edibleResources.get(id)?.state).toBe('available');
    expectMatrixClose(instanceMatrix(restoredFruits, index), authoredMatrix);
    expect(restoredFruits.instanceMatrix.updateRanges).toEqual([{ start: index * 16, count: 16 }]);

    source.dispose();
    restored.dispose();
  });

  test('food reset invalidates reservations and restores every hidden authored instance', () => {
    const scene = new THREE.Scene();
    const tree = new CrystalEcosystem(scene, 9921, new THREE.Vector3(), {
      ...TINY_CONFIG,
      creaturesPerSpecies: 0,
      ambientCreatures: 0,
    });
    const fruits = scene.getObjectByName('crystal-fruits') as THREE.InstancedMesh;
    const beforeMatrix = instanceMatrix(fruits, 0);
    const fruit = tree.reserveFoodById(tree.foodResourceId('fruit', 0)!, 401)!;
    const leaf = tree.reserveFoodById(tree.foodResourceId('leaf', 0)!, 402)!;
    expect(tree.beginFoodConsumption(fruit)).toBe(true);
    expect(tree.completeFoodConsumption(fruit)).toBe(28);
    tree.resetFood();

    expect(tree.beginFoodConsumption(leaf)).toBe(false);
    expect(tree.completeFoodConsumption(fruit)).toBe(0);
    expect(tree.foodTime).toBe(0);
    expect(tree.edibleResources.stats()).toMatchObject({
      available: TINY_CONFIG.fruits + TINY_CONFIG.leaves,
      reserved: 0,
      consuming: 0,
      respawning: 0,
      pendingLeases: 0,
      pendingRespawns: 0,
    });
    expect(tree.stats()).toMatchObject({
      availableFruit: TINY_CONFIG.fruits,
      availableLeaves: TINY_CONFIG.leaves,
      consumedFruit: 0,
      consumedLeaves: 0,
    });
    expect(tree.snapshotFoodPersistence().entries).toEqual([]);
    expectMatrixClose(instanceMatrix(fruits, 0), beforeMatrix);
    tree.dispose();
  });

  test('compatibility consumption still uses the canonical transaction and fixed pool', () => {
    const scene = new THREE.Scene();
    const tree = new CrystalEcosystem(scene, 993, new THREE.Vector3(), {
      ...TINY_CONFIG,
      creaturesPerSpecies: 0,
      ambientCreatures: 0,
    });
    const resources = tree.edibleResources.all;
    const fruit = tree.edibleResources.get(tree.foodResourceId('fruit', 0)!)!;
    const availableBefore = tree.stats().availableFruit;
    const consumedBefore = tree.stats().consumedFruit;
    expect(tree.consumeFruit(0)).toBe(true);
    expect(tree.consumeFruit(0)).toBe(false);
    const eaten = tree.stats();
    expect(eaten.availableFruit).toBe(availableBefore - 1);
    expect(eaten.consumedFruit).toBe(consumedBefore + 1);

    for (let cycle = 0; cycle < 20; cycle++) {
      const untilRespawn = fruit.respawnAt;
      tree.edibleResources.update(untilRespawn);
      expect(tree.consumeFruit(0)).toBe(true);
    }
    tree.edibleResources.update(fruit.respawnAt);
    expect(tree.edibleResources.all).toBe(resources);
    expect(tree.edibleResources.get(fruit.id)).toBe(fruit);
    expect(tree.edibleResources.stats()).toMatchObject({
      capacity: TINY_CONFIG.fruits + TINY_CONFIG.leaves,
      respawning: 0,
      pendingRespawns: 0,
    });
    tree.dispose();
  });

  test('tree creatures share food peacefully without contests or permanent reservations', () => {
    const { tree } = makeTree(994);
    for (let i = 0; i < 1_200; i++) {
      tree.update({ ...BASE_FRAME, dt: 0.1, visualDt: 0.1, time: (i + 1) * 0.1 });
    }
    const stats = tree.stats();
    expect(stats.contests).toBe(0);
    expect(stats.consumedFruit + stats.consumedLeaves).toBeGreaterThan(0);
    const activeOwners = tree.edibleResources.all
      .filter((resource) => resource.ownerId !== null)
      .map((resource) => resource.ownerId);
    expect(new Set(activeOwners).size).toBe(activeOwners.length);
    expect(tree.edibleResources.stats().pendingLeases).toBeLessThanOrEqual(
      TINY_CONFIG.creaturesPerSpecies * 10,
    );
    tree.dispose();
  });

  test('dispose is complete and idempotent for every owned GPU resource', () => {
    const { scene, tree } = makeTree();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const instancedMeshes = new Set<THREE.InstancedMesh>();
    scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) instancedMeshes.add(object);
      if (!('geometry' in object)) return;
      const renderable = object as THREE.Mesh;
      geometries.add(renderable.geometry);
      const owned = Array.isArray(renderable.material)
        ? renderable.material
        : [renderable.material];
      for (const material of owned) materials.add(material);
    });
    let disposedGeometries = 0;
    let disposedMaterials = 0;
    let disposedInstancedMeshes = 0;
    for (const geometry of geometries)
      geometry.addEventListener('dispose', () => disposedGeometries++);
    for (const material of materials)
      material.addEventListener('dispose', () => disposedMaterials++);
    // InstancedMesh owns its instanceMatrix/instanceColor GL buffers — the recurring VRAM-leak class
    // this repo tracks. Every instanced draw must dispatch its own 'dispose', not just its geometry.
    for (const mesh of instancedMeshes)
      mesh.addEventListener('dispose', () => disposedInstancedMeshes++);

    expect(geometries.size).toBeGreaterThan(10);
    expect(materials.size).toBeGreaterThan(10);
    expect(instancedMeshes.size).toBeGreaterThan(10);
    expect(() => tree.dispose()).not.toThrow();
    expect(scene.children).toHaveLength(0);
    expect(disposedGeometries).toBe(geometries.size);
    expect(disposedMaterials).toBe(materials.size);
    expect(disposedInstancedMeshes).toBe(instancedMeshes.size);
    expect(() => tree.dispose()).not.toThrow();
    expect(disposedGeometries).toBe(geometries.size);
    expect(disposedMaterials).toBe(materials.size);
    expect(disposedInstancedMeshes).toBe(instancedMeshes.size);
  });
});
