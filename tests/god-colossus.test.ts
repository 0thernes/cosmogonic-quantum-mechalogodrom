/**
 * GOD-COLOSSUS (V131 FRACTAL DEITY) — the one colossal god-tier presence. Falsifiable claims:
 * - construction draws NO rng + needs no WebGL (headless Scene only), building ONE root group carrying
 *   ONE raymarch mesh with ONE ShaderMaterial (no instanced blocks — there are none, by design);
 * - the shader exposes the reactive uniforms (uTime / uChaos / uEntropy) + the three aperiodic seeds;
 * - construction is DETERMINISTIC: two builds ⇒ bit-identical orbit-trap seed vectors;
 * - `update` writes uTime/uChaos/uEntropy with no throw and spawns NO geometry (scene object count stable);
 * - `dispose()` detaches the deity from the scene.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { GodColossus } from '../src/sim/god-colossus';

function shaderMats(scene: THREE.Scene): THREE.ShaderMaterial[] {
  const out: THREE.ShaderMaterial[] = [];
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (m instanceof THREE.ShaderMaterial) out.push(m);
  });
  return out;
}

function countObjects(scene: THREE.Scene): number {
  let n = 0;
  scene.traverse(() => n++);
  return n;
}

describe('GodColossus — the raymarched morphing fractal deity', () => {
  test('boots headless: one root group + one raymarch shader (no instanced blocks)', () => {
    const scene = new THREE.Scene();
    const g = new GodColossus(scene);
    let groups = 0;
    let instanced = 0;
    scene.traverse((o) => {
      if (o instanceof THREE.Group) groups++;
      if (o instanceof THREE.InstancedMesh) instanced++;
    });
    expect(groups).toBe(1);
    expect(instanced).toBe(0); // V131: no more block-tower — a single raymarched fractal
    const mats = shaderMats(scene);
    expect(mats.length).toBe(1);
    const u = mats[0]!.uniforms;
    // reactive drivers + the aperiodic orbit-trap bones are all wired
    for (const key of ['uTime', 'uChaos', 'uEntropy', 'uSeedA', 'uSeedB', 'uSeedC']) {
      expect(u[key]).toBeDefined();
    }
    expect(g.seedCount).toBe(3);
    g.dispose();
  });

  test('construction is deterministic — two builds ⇒ bit-identical aperiodic seeds', () => {
    const a = new THREE.Scene();
    const b = new THREE.Scene();
    const ga = new GodColossus(a);
    const gb = new GodColossus(b);
    for (const key of ['uSeedA', 'uSeedB', 'uSeedC']) {
      const va = ga.material.uniforms[key]!.value as THREE.Vector3;
      const vb = gb.material.uniforms[key]!.value as THREE.Vector3;
      expect(va.x).toBe(vb.x);
      expect(va.y).toBe(vb.y);
      expect(va.z).toBe(vb.z);
      expect(Number.isFinite(va.x)).toBe(true);
    }
    ga.dispose();
    gb.dispose();
  });

  test('update morphs from the clock + chaos/entropy and spawns no geometry', () => {
    const scene = new THREE.Scene();
    const g = new GodColossus(scene);
    const before = countObjects(scene);
    for (let f = 0; f < 240; f++) g.update(f / 60, (f % 60) / 60, ((f * 7) % 100) / 100);
    expect(countObjects(scene)).toBe(before); // no per-frame allocation into the scene graph
    const u = g.material.uniforms;
    expect(u.uTime!.value).toBeCloseTo(239 / 60);
    expect(Number.isFinite(u.uChaos!.value as number)).toBe(true);
    expect(Number.isFinite(u.uEntropy!.value as number)).toBe(true);
    g.dispose();
  });

  test('dispose() detaches the deity', () => {
    const scene = new THREE.Scene();
    const g = new GodColossus(scene);
    expect(scene.children.length).toBeGreaterThan(0);
    g.dispose();
    expect(scene.children.length).toBe(0);
  });
});
