import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { Vegetation } from '../src/sim/vegetation';

const world = readFileSync(new URL('../src/world.ts', import.meta.url), 'utf8');

describe('Vegetation is wired into the live World (restored V-VEG)', () => {
  it('World constructs, grounds, drives, touches and disposes the vegetation field', () => {
    expect(world).toContain('this.vegetation = new Vegetation(ctx.scene)');
    expect(world).toContain('this.vegetation.attachGround(');
    expect(world).toContain('this.vegetation.update(t, dt)');
    expect(world).toContain('this.vegetation.setChaos(');
    expect(world).toContain('this.vegetation.setWindStrength(');
    expect(world).toContain('this.vegetation.applyContact(');
    expect(world).toContain('this.vegetation.dispose()');
  });

  it('plants ride the sampled ground height and lean under creature contact', () => {
    const scene = new THREE.Scene();
    const veg = new Vegetation(scene);
    const read = () => {
      const meshes: THREE.InstancedMesh[] = [];
      scene.traverse((o) => {
        if ((o as THREE.InstancedMesh).isInstancedMesh) meshes.push(o as THREE.InstancedMesh);
      });
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      meshes[0]!.getMatrixAt(0, m);
      p.setFromMatrixPosition(m);
      return { y: p.y, e: Array.from(m.elements) };
    };
    veg.attachGround(() => 0);
    veg.update(1, 0.016);
    const y0 = read().y;
    veg.attachGround(() => 40);
    veg.update(1, 0.016);
    const lifted = read();
    expect(lifted.y - y0).toBeCloseTo(40, 3);
    // press the ground 4 units beside the first plant — it must lean away
    veg.applyContact(lifted.e[12]! + 4, lifted.e[14]!, 1);
    veg.update(1, 0.016);
    expect(read().e).not.toEqual(lifted.e);
    veg.dispose();
  });
});
