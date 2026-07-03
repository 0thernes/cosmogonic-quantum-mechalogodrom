/**
 * MECHA FIRE PILLAR — the visible fire-column for the Mechalogodrom's incineration cone. Falsifiable:
 * - construction attaches exactly one Mesh (the cone) to the scene, no WebGL needed;
 * - update advances the uTime uniform and never throws (pure uniform writes);
 * - setIntensity clamps to [0,1] (and drives the uIntensity uniform);
 * - dispose detaches + frees it.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { MechaFirePillar } from '../src/sim/mecha-fire-pillar';

function firstMesh(scene: THREE.Scene): THREE.Mesh | null {
  let m: THREE.Mesh | null = null;
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) m = o as THREE.Mesh;
  });
  return m;
}

describe('MechaFirePillar — the visible mecha death-cone', () => {
  test('attaches one cone mesh; update advances uTime; no throw', () => {
    const scene = new THREE.Scene();
    const p = new MechaFirePillar(scene);
    const mesh = firstMesh(scene);
    expect(mesh).not.toBeNull();
    const mat = mesh!.material as THREE.ShaderMaterial;
    expect(mat.uniforms.uTime!.value).toBe(0);
    expect(() => {
      p.setIntensity(0.7);
      p.update(12.34);
      p.update(56.78);
    }).not.toThrow();
    expect(mat.uniforms.uTime!.value).toBe(56.78);
    expect(mat.uniforms.uIntensity!.value).toBe(0.7);
    p.dispose();
    expect(scene.children.length).toBe(0);
  });

  test('setIntensity clamps to [0,1] and guards NaN', () => {
    const scene = new THREE.Scene();
    const p = new MechaFirePillar(scene);
    const mat = (firstMesh(scene)!.material as THREE.ShaderMaterial).uniforms.uIntensity!;
    p.setIntensity(9);
    p.update(1);
    expect(mat.value).toBe(1);
    p.setIntensity(-4);
    p.update(1);
    expect(mat.value).toBe(0);
    p.setIntensity(Number.NaN);
    p.update(1);
    expect(mat.value).toBe(0);
    p.dispose();
  });
});
