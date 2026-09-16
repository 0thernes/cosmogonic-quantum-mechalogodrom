/**
 * NHI-body ascension lane (PHILOSOPHY "Real math or no math").
 *
 * `nhiAscension` maps a launched being's REAL height (world Y) to a [0,1] signal that drives the
 * V-NHI-EXPANDED hyperspace-dimensionality lattice — a being flying high shimmers with tesseract light.
 * Falsifiable claims (property-based, robust to the NHI_ASCEND_SPAN constant):
 * - ground → 0, top of the column → 1, mid → 0.5; clamps beyond; monotonic non-decreasing;
 * - finite + within [0,1]; non-finite/negative → 0.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { NHI_ASCENSION_LEVELS, NhiBodySystem, nhiAscension } from '../src/sim/nhi-body';

interface TestBody {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
  tendrilGeos: THREE.BufferGeometry[];
  ringBlock: number;
  spikeBlock: number;
  spikePoolIndex: number;
  ringLocals: THREE.Matrix4[];
  spikeLocals: THREE.Matrix4[];
}

interface TestPartPool {
  mesh: THREE.InstancedMesh;
  emissive: THREE.InstancedBufferAttribute;
  partsPerBlock: number;
  liveInstances: number;
}

interface NhiBodyInternals {
  root: THREE.Group;
  bodies: Map<number, TestBody>;
  coreGeos: THREE.BufferGeometry[];
  ringGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  spikeGeos: THREE.BufferGeometry[];
  ringPool: TestPartPool;
  spikePools: TestPartPool[];
  spawnIndex: number;
}

function internals(system: NhiBodySystem): NhiBodyInternals {
  return system as unknown as NhiBodyInternals;
}

describe('nhiAscension (pure)', () => {
  test('ground → 0, top → 1, mid → 0.5; clamps beyond the column', () => {
    expect(nhiAscension(NHI_ASCENSION_LEVELS.floor)).toBe(0);
    expect(nhiAscension(NHI_ASCENSION_LEVELS.ceiling)).toBeCloseTo(1, 6);
    expect(nhiAscension(NHI_ASCENSION_LEVELS.middle)).toBeCloseTo(0.5, 6);
    expect(nhiAscension(NHI_ASCENSION_LEVELS.ceiling + 1000)).toBe(1); // clamp above
    expect(nhiAscension(-50)).toBe(0); // below ground → clamp
  });

  test('monotonic non-decreasing; always within [0,1]', () => {
    let prev = -1;
    for (let y = -20; y <= NHI_ASCENSION_LEVELS.ceiling + 60; y += 10) {
      const v = nhiAscension(y);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
  });

  test('non-finite heights → 0, never NaN', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const v = nhiAscension(bad);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(0);
    }
  });
});

function expectMatrixClose(actual: THREE.Matrix4, expected: THREE.Matrix4): void {
  for (let i = 0; i < 16; i++) {
    expect(actual.elements[i]).toBeCloseTo(expected.elements[i]!, 5);
  }
}

describe('NhiBodySystem exact ring/spike batching', () => {
  test('preserves every component while collapsing ring/spike draws into four shared pools', () => {
    const system = new NhiBodySystem(new THREE.Scene());
    const state = internals(system);
    for (let i = 0; i < 4; i++) system.spawn(100 + i, i * 10, 5, -i * 3);

    // Morphologies 0..3 own 1/2/1/2 rings and 6/8/10/12 spikes: no count reduction.
    expect(system.batchedPartCount).toBe(42);
    expect(system.batchedPartDrawCalls).toBe(4);
    expect(
      state.root.children.filter((child) => child instanceof THREE.InstancedMesh),
    ).toHaveLength(4);
    expect(state.ringPool.liveInstances).toBe(6);
    expect(state.spikePools.map((pool) => pool.liveInstances)).toEqual([18, 8, 10]);
    expect(state.ringPool.mesh.geometry).toBe(state.ringGeo);
    for (let i = 0; i < state.spikePools.length; i++) {
      expect(state.spikePools[i]!.mesh.geometry).toBe(state.spikeGeos[i]!);
    }

    // Cores + exact unique tendrils + every eye remain ordinary per-being components. The former
    // ring/spike geometries occur only on InstancedMeshes, never as hidden duplicate child draws.
    let ordinaryMeshes = 0;
    let duplicateBatchedGeometry = 0;
    for (const body of state.bodies.values()) {
      body.group.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh) return;
        ordinaryMeshes++;
        if (child.geometry === state.ringGeo || state.spikeGeos.includes(child.geometry)) {
          duplicateBatchedGeometry++;
        }
      });
    }
    expect(ordinaryMeshes).toBe(48); // 4 cores + 18 tendrils + 26 eyes
    expect(duplicateBatchedGeometry).toBe(0);

    const poolMaterial = state.ringPool.mesh.material as THREE.MeshStandardMaterial;
    expect(poolMaterial.metalness).toBe(0.95);
    expect(poolMaterial.roughness).toBe(0.2);
    expect(state.ringGeo.getAttribute('instNhiEmissive')).toBe(state.ringPool.emissive);
    system.dispose();
  });

  test('stable slots carry the exact parent×local matrices and animated material lanes', () => {
    const system = new NhiBodySystem(new THREE.Scene());
    const state = internals(system);
    system.spawn(7, 1, 2, 3); // morphology 0: one ring, six needle spikes
    const body = state.bodies.get(7)!;
    const ringBlock = body.ringBlock;
    const spikeBlock = body.spikeBlock;
    const position = new THREE.Vector3(13, 17, -19);
    system.update(2.75, () => position);

    const ringSlot = ringBlock * state.ringPool.partsPerBlock;
    const expectedRing = new THREE.Matrix4().multiplyMatrices(
      body.group.matrix,
      body.ringLocals[0]!,
    );
    const actualRing = new THREE.Matrix4();
    state.ringPool.mesh.getMatrixAt(ringSlot, actualRing);
    expectMatrixClose(actualRing, expectedRing);

    const actualColor = new THREE.Color();
    state.ringPool.mesh.getColorAt(ringSlot, actualColor);
    expect(actualColor.r).toBeCloseTo(body.ringMat.color.r, 6);
    expect(actualColor.g).toBeCloseTo(body.ringMat.color.g, 6);
    expect(actualColor.b).toBeCloseTo(body.ringMat.color.b, 6);
    const em = state.ringPool.emissive;
    expect(em.getX(ringSlot)).toBeCloseTo(
      body.ringMat.emissive.r * body.ringMat.emissiveIntensity,
      6,
    );
    expect(em.getY(ringSlot)).toBeCloseTo(
      body.ringMat.emissive.g * body.ringMat.emissiveIntensity,
      6,
    );
    expect(em.getZ(ringSlot)).toBeCloseTo(
      body.ringMat.emissive.b * body.ringMat.emissiveIntensity,
      6,
    );

    const spikePool = state.spikePools[body.spikePoolIndex]!;
    const spikeSlot = spikeBlock * spikePool.partsPerBlock;
    const expectedSpike = new THREE.Matrix4().multiplyMatrices(
      body.group.matrix,
      body.spikeLocals[0]!,
    );
    const actualSpike = new THREE.Matrix4();
    spikePool.mesh.getMatrixAt(spikeSlot, actualSpike);
    expectMatrixClose(actualSpike, expectedSpike);

    // Another lifecycle event never compacts a live being's blocks or changes its visual identity.
    system.spawn(8, 0, 0, 0);
    system.update(3, (id) => (id === 7 ? position : new THREE.Vector3(2, 4, 6)));
    expect(state.bodies.get(7)!.ringBlock).toBe(ringBlock);
    expect(state.bodies.get(7)!.spikeBlock).toBe(spikeBlock);
    expect(system.remove(8)).toBe(true);
    expect(state.bodies.get(7)!.ringBlock).toBe(ringBlock);
    expect(state.bodies.get(7)!.spikeBlock).toBe(spikeBlock);

    expect(system.remove(7)).toBe(true);
    expect(system.batchedPartCount).toBe(0);
    expect(system.batchedPartDrawCalls).toBe(0);
    state.ringPool.mesh.getMatrixAt(ringSlot, actualRing);
    expect(actualRing.elements[0]).toBe(0);
    expect(actualRing.elements[5]).toBe(0);
    expect(actualRing.elements[10]).toBe(0);
    system.dispose();
  });
});

describe('NhiBodySystem lifecycle exception safety', () => {
  test('failed root attachment rolls back the whole spawn without consuming morphology', () => {
    const system = new NhiBodySystem(new THREE.Scene());
    const state = internals(system);
    const originalAdd = state.root.add.bind(state.root);
    const sharedGeometries = new Set<THREE.BufferGeometry>([
      ...state.coreGeos,
      state.ringGeo,
      state.eyeGeo,
      ...state.spikeGeos,
    ]);
    const ownedMaterials = new Set<THREE.Material>();
    const ownedGeometries = new Set<THREE.BufferGeometry>();
    const disposedOwnedMaterials = new Set<THREE.Material>();
    const disposedOwnedGeometries = new Set<THREE.BufferGeometry>();
    const disposedSharedGeometries = new Set<THREE.BufferGeometry>();

    state.root.add = ((...objects: THREE.Object3D[]) => {
      originalAdd(...objects); // Model a root that mutates first and then reports failure.
      for (const object of objects) {
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            if (ownedMaterials.has(material)) continue;
            ownedMaterials.add(material);
            material.addEventListener('dispose', () => disposedOwnedMaterials.add(material));
          }
          const geometry = child.geometry;
          if (sharedGeometries.has(geometry)) {
            if (!disposedSharedGeometries.has(geometry)) {
              geometry.addEventListener('dispose', () => disposedSharedGeometries.add(geometry));
            }
          } else if (!ownedGeometries.has(geometry)) {
            ownedGeometries.add(geometry);
            geometry.addEventListener('dispose', () => disposedOwnedGeometries.add(geometry));
          }
        });
      }
      throw new Error('injected root.add failure');
    }) as typeof state.root.add;

    expect(() => system.spawn(91, 1, 2, 3)).toThrow('injected root.add failure');
    expect(system.count).toBe(0);
    expect(system.has(91)).toBe(false);
    expect(state.spawnIndex).toBe(0);
    // Four permanent appendage pools are system infrastructure; the failed per-being group is gone.
    expect(state.root.children).toHaveLength(4);
    expect(state.root.children.every((child) => child instanceof THREE.InstancedMesh)).toBe(true);
    expect(ownedMaterials.size).toBe(3);
    expect(disposedOwnedMaterials.size).toBe(ownedMaterials.size);
    expect(ownedGeometries.size).toBe(3);
    expect(disposedOwnedGeometries.size).toBe(ownedGeometries.size);
    expect(disposedSharedGeometries.size).toBe(0);

    state.root.add = originalAdd as typeof state.root.add;
    system.dispose();
  });

  test('remove and clear publish logical deletion before no-throw best-effort disposal', () => {
    const system = new NhiBodySystem(new THREE.Scene());
    const state = internals(system);
    system.spawn(1, 0, 0, 0);
    system.spawn(2, 10, 0, 0);
    system.spawn(3, 20, 0, 0);
    const first = state.bodies.get(1)!;
    const second = state.bodies.get(2)!;
    const third = state.bodies.get(3)!;
    const originalRemove = state.root.remove.bind(state.root);
    let firstAbsentDuringDisposal = false;
    let firstRingDisposed = false;
    let firstEyeDisposed = false;
    let laterFirstTendrilDisposed = false;

    state.root.remove = ((...objects: THREE.Object3D[]) => {
      if (objects.includes(first.group)) throw new Error('injected root.remove failure');
      return originalRemove(...objects);
    }) as typeof state.root.remove;
    first.coreMat.dispose = () => {
      firstAbsentDuringDisposal = !system.has(1);
      throw new Error('injected core material disposal failure');
    };
    first.ringMat.dispose = () => {
      firstRingDisposed = true;
    };
    first.eyeMat.dispose = () => {
      firstEyeDisposed = true;
    };
    first.tendrilGeos[0]!.dispose = () => {
      throw new Error('injected first tendril disposal failure');
    };
    first.tendrilGeos[1]!.dispose = () => {
      laterFirstTendrilDisposed = true;
    };

    let removed = false;
    expect(() => {
      removed = system.remove(1);
    }).not.toThrow();
    expect(removed).toBe(true);
    expect(firstAbsentDuringDisposal).toBe(true);
    expect(firstRingDisposed).toBe(true);
    expect(firstEyeDisposed).toBe(true);
    expect(laterFirstTendrilDisposed).toBe(true);
    expect(system.has(1)).toBe(false);
    expect(system.count).toBe(2);

    // Restore the injected detach fault and clean its intentionally orphaned visual before clear().
    state.root.remove = originalRemove as typeof state.root.remove;
    originalRemove(first.group);

    let clearWasLogicalFirst = false;
    let secondRingDisposed = false;
    let thirdEyeDisposed = false;
    second.coreMat.dispose = () => {
      clearWasLogicalFirst = system.count === 0 && !system.has(2) && !system.has(3);
      throw new Error('injected clear disposal failure');
    };
    second.ringMat.dispose = () => {
      secondRingDisposed = true;
    };
    third.eyeMat.dispose = () => {
      thirdEyeDisposed = true;
    };

    expect(() => system.clear()).not.toThrow();
    expect(clearWasLogicalFirst).toBe(true);
    expect(secondRingDisposed).toBe(true);
    expect(thirdEyeDisposed).toBe(true);
    expect(system.count).toBe(0);
    expect(system.has(2)).toBe(false);
    expect(system.has(3)).toBe(false);
    expect(state.root.children).toHaveLength(4);
    expect(state.root.children.every((child) => child instanceof THREE.InstancedMesh)).toBe(true);
    system.dispose();
  });

  test('update retires a missing body before disposal callbacks can observe it', () => {
    const system = new NhiBodySystem(new THREE.Scene());
    const state = internals(system);
    system.spawn(7, 0, 0, 0);
    const body = state.bodies.get(7)!;
    let absentDuringDisposal = false;
    let laterResourceDisposed = false;
    body.coreMat.dispose = () => {
      absentDuringDisposal = !system.has(7);
      throw new Error('injected update disposal failure');
    };
    body.ringMat.dispose = () => {
      laterResourceDisposed = true;
    };

    expect(() => system.update(0, () => null)).not.toThrow();
    expect(absentDuringDisposal).toBe(true);
    expect(laterResourceDisposed).toBe(true);
    expect(system.has(7)).toBe(false);
    expect(system.count).toBe(0);
    system.dispose();
  });
});
