import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {
  XENOMIMIC_CORE_DRAW_CALLS,
  XENOMIMIC_DRAW_CALL_BUDGET,
  XENOMIMIC_FX_DRAW_CALLS,
  XENOMIMIC_TRIANGLE_BUDGET_AT_CAP,
  XenomimicRenderer,
  buildXenomimicGeometries,
} from '../src/sim/xenomimics-render';
import { XENOMIMIC_MAX, XenomimicPopulation } from '../src/sim/xenomimics';

function meshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  return scene.children.filter((child) => child instanceof THREE.InstancedMesh);
}

describe('Xenomimic indexed morph geometry', () => {
  test('builds five visual grammars crossed with five counter-variants', () => {
    const geometries = buildXenomimicGeometries();
    expect(geometries).toHaveLength(10);
    for (let family = 0; family < 5; family++) {
      const prime = geometries[family]!;
      const counter = geometries[family + 5]!;
      expect(prime.userData['xenomimicFamily']).toBe(family);
      expect(prime.userData['xenomimicCounterVariant']).toBe(false);
      expect(counter.userData['xenomimicFamily']).toBe(family);
      expect(counter.userData['xenomimicCounterVariant']).toBe(true);
      const primeSize = prime.boundingBox!.getSize(new THREE.Vector3());
      const counterSize = counter.boundingBox!.getSize(new THREE.Vector3());
      expect(primeSize.distanceTo(counterSize)).toBeGreaterThan(0.005);
    }
    for (const geometry of geometries) geometry.dispose();
  });

  test('every geometry is indexed and stays inside the 800k-at-cap triangle contract', () => {
    const geometries = buildXenomimicGeometries();
    let maxTriangles = 0;
    for (const geometry of geometries) {
      expect(geometry.index).not.toBeNull();
      const triangles = geometry.index!.count / 3;
      maxTriangles = Math.max(maxTriangles, triangles);
      expect(triangles).toBeGreaterThan(0);
      expect(geometry.getAttribute('position').count).toBeLessThan(1500);
    }
    expect(maxTriangles * XENOMIMIC_MAX).toBeLessThanOrEqual(XENOMIMIC_TRIANGLE_BUDGET_AT_CAP);
    for (const geometry of geometries) geometry.dispose();
  });

  test('never expands indexed recipes into a non-indexed triangle stream', () => {
    const source = readFileSync('src/sim/xenomimics-render.ts', 'utf8');
    expect(source).not.toContain('toNonIndexed(');
    expect(source).toContain('mergeVertices');
    expect(source).toContain('mergeIndexed');
  });
});

describe('XenomimicRenderer bounded GPU contract', () => {
  test('owns exactly ten opaque depth-writing core draws and no FX draw', () => {
    const scene = new THREE.Scene();
    const renderer = new XenomimicRenderer(scene);
    const draws = meshes(scene);
    expect(draws).toHaveLength(XENOMIMIC_CORE_DRAW_CALLS);
    expect(XENOMIMIC_CORE_DRAW_CALLS + XENOMIMIC_FX_DRAW_CALLS).toBeLessThanOrEqual(
      XENOMIMIC_DRAW_CALL_BUDGET,
    );
    expect(new Set(draws.map((mesh) => mesh.material)).size).toBe(1);
    const material = draws[0]!.material as THREE.MeshStandardMaterial;
    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
    expect(material.depthTest).toBe(true);
    expect(material.vertexColors).toBe(true);
    renderer.dispose();
  });

  test('preallocates four dynamic vec4 lanes and instance color at fixed capacity', () => {
    const scene = new THREE.Scene();
    const renderer = new XenomimicRenderer(scene);
    for (const mesh of meshes(scene)) {
      for (const name of [
        'xenomimicLife',
        'xenomimicBody',
        'xenomimicMind',
        'xenomimicEnvironment',
      ]) {
        const attribute = mesh.geometry.getAttribute(name) as THREE.InstancedBufferAttribute;
        expect(attribute).toBeInstanceOf(THREE.InstancedBufferAttribute);
        expect(attribute.itemSize).toBe(4);
        expect(attribute.count).toBe(XENOMIMIC_MAX);
        expect(attribute.usage).toBe(THREE.DynamicDrawUsage);
      }
      expect(mesh.instanceColor!.count).toBe(XENOMIMIC_MAX);
      expect(mesh.instanceColor!.usage).toBe(THREE.DynamicDrawUsage);
      expect(mesh.instanceMatrix.usage).toBe(THREE.DynamicDrawUsage);
    }
    renderer.dispose();
  });

  test('patches one shared shader with life, published physics, mind, and environment lanes', () => {
    const scene = new THREE.Scene();
    const renderer = new XenomimicRenderer(scene);
    const material = meshes(scene)[0]!.material as THREE.MeshStandardMaterial;
    const shader = {
      uniforms: {} as Record<string, THREE.IUniform>,
      vertexShader: '#include <common>\nvoid main(){\n#include <begin_vertex>\n}',
      fragmentShader: '#include <common>\nvoid main(){\n#include <emissivemap_fragment>\n}',
    };
    material.onBeforeCompile(shader as never, {} as never);
    expect(shader.vertexShader).toContain('attribute vec4 xenomimicLife');
    expect(shader.vertexShader).toContain('attribute vec4 xenomimicBody');
    expect(shader.vertexShader).toContain('attribute vec4 xenomimicMind');
    expect(shader.vertexShader).toContain('attribute vec4 xenomimicEnvironment');
    expect(shader.vertexShader).toContain('published leanX, leanZ');
    expect(shader.fragmentShader).toContain('xGlow = xGlow /');
    expect(shader.fragmentShader).toContain('xSpark');
    expect(shader.uniforms['uXenomimicTime']).toBeDefined();
    renderer.dispose();
  });
});

describe('XenomimicRenderer allocation-stable sync', () => {
  test('mirrors role and weighted-fulcrum fields with positive scales and bounded uploads', () => {
    const scene = new THREE.Scene();
    const renderer = new XenomimicRenderer(scene);
    const population = new XenomimicPopulation(0x51a1, { growthRamp: 999 });
    const bodies = population.bodyView();
    bodies[0]!.leanX = 0.17;
    bodies[0]!.leanZ = -0.12;
    bodies[1]!.leanX = -0.09;
    bodies[1]!.leanZ = 0.11;
    bodies[1]!.hopV = 3;
    const stats = renderer.getStats();

    renderer.sync(population, 4.2, {
      chaos: 0.7,
      entropy: 0.4,
      weather: 0.5,
      proximity: 0.9,
      coherence: 0.8,
      integration: 0.65,
      twinTension: 0.7,
    });
    expect(renderer.getStats()).toBe(stats);
    expect(stats.livingInstances).toBe(2);
    expect(stats.uploadedInstances).toBe(2);
    expect(meshes(scene).reduce((sum, mesh) => sum + mesh.count, 0)).toBe(2);

    const occupied = meshes(scene).find((mesh) => mesh.count === 2)!;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < occupied.count; i++) {
      occupied.getMatrixAt(i, matrix);
      matrix.decompose(position, quaternion, scale);
      expect(scale.x).toBeGreaterThan(0);
      expect(scale.y).toBeGreaterThan(0);
      expect(scale.z).toBeGreaterThan(0);
    }
    const life = occupied.geometry.getAttribute('xenomimicLife') as THREE.InstancedBufferAttribute;
    const body = occupied.geometry.getAttribute('xenomimicBody') as THREE.InstancedBufferAttribute;
    expect((life.array as Float32Array)[3]).toBe(1);
    expect((life.array as Float32Array)[7]).toBe(-1);
    expect((body.array as Float32Array)[0]).toBeCloseTo(0.17, 5);
    expect((body.array as Float32Array)[1]).toBeCloseTo(-0.12, 5);
    expect((body.array as Float32Array)[4]).toBeCloseTo(-0.09, 5);
    expect((body.array as Float32Array)[5]).toBeCloseTo(0.11, 5);
    expect(occupied.instanceMatrix.updateRanges[0]!.count).toBe(occupied.count * 16);
    expect(occupied.instanceColor!.updateRanges[0]!.count).toBe(occupied.count * 3);
    for (const name of [
      'xenomimicLife',
      'xenomimicBody',
      'xenomimicMind',
      'xenomimicEnvironment',
    ]) {
      const attribute = occupied.geometry.getAttribute(name) as THREE.InstancedBufferAttribute;
      expect(attribute.updateRanges[0]!.count).toBe(occupied.count * 4);
    }
    renderer.dispose();
    renderer.dispose();
    expect(meshes(scene)).toHaveLength(0);
  });

  test('sync body contains no typed-array or collection construction', () => {
    const source = readFileSync('src/sim/xenomimics-render.ts', 'utf8');
    const syncBody = source.slice(
      source.indexOf('  sync('),
      source.indexOf('  /** Stable diagnostic'),
    );
    expect(syncBody).not.toMatch(/new\s+(?:Float|Uint|Int)\d+Array/);
    expect(syncBody).not.toContain('Array.from');
    expect(syncBody).not.toContain('new Map');
    expect(syncBody).not.toContain('new Set');
  });
});
