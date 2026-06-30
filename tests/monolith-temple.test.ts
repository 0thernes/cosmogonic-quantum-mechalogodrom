/**
 * MONOLITH TEMPLE — raymarch shader uTime uniform regression.
 *
 * warpCage() used to look up the time uniform via `material.userData.uniforms`, which is never
 * populated (the uniforms live directly on the THREE.ShaderMaterial's own `uniforms` property).
 * That made the lookup always undefined, silently freezing the raymarched KIFS fractal core's
 * rotation + bioluminescence pulse at t=0 forever, even though every other part of the temple
 * animated correctly.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { MonolithTemple } from '../src/sim/monolith-temple';

describe('MonolithTemple raymarch shader', () => {
  test('update() advances the raymarch material uTime uniform (not frozen at construction value)', () => {
    const scene = new THREE.Scene();
    const temple = new MonolithTemple(scene);
    temple.reveal(0, 0, 0);

    let raymarchMat: THREE.ShaderMaterial | undefined;
    scene.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (mat?.uniforms && 'uTime' in mat.uniforms && 'uResolution' in mat.uniforms) {
        raymarchMat = mat;
      }
    });

    expect(raymarchMat).toBeDefined();
    expect(raymarchMat!.uniforms.uTime!.value).toBe(0);

    temple.update(0.1, 12.34);
    expect(raymarchMat!.uniforms.uTime!.value).toBe(12.34);

    temple.update(0.1, 56.78);
    expect(raymarchMat!.uniforms.uTime!.value).toBe(56.78);
  });
});
