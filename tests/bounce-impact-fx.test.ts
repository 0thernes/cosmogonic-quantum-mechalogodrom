/**
 * BOUNCE IMPACT FX — the visible spark shockwave at each ragdoll ricochet. Falsifiable:
 * - construction attaches one Points pool to the scene, headless;
 * - an organism PENETRATING a collider sparks (counter climbs, pool goes visible);
 * - one outside every collider, no colliders, or frozen dt ⇒ no new sparks;
 * - it mutates the pool NOTHING (pure VFX);
 * - deterministic (no rng): two identical runs produce bit-identical spark positions;
 * - dispose detaches it.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { BounceImpactFX, type ImpactCollider, type ImpactPool } from '../src/sim/bounce-impact-fx';

const COLLIDER: ImpactCollider = { x: 0, y: 0, z: 0, r: 16 };

function poolAt(...pts: [number, number, number][]): ImpactPool {
  return { list: pts.map(([x, y, z]) => ({ position: new THREE.Vector3(x, y, z) })) };
}

function firstPoints(scene: THREE.Scene): THREE.Points {
  let p: THREE.Points | null = null;
  scene.traverse((o) => {
    if (o instanceof THREE.Points) p = o as THREE.Points;
  });
  return p!;
}

describe('BounceImpactFX — visible ragdoll ricochet', () => {
  test('attaches a Points pool; a penetrating organism sparks', () => {
    const scene = new THREE.Scene();
    const fx = new BounceImpactFX(scene);
    const pts = firstPoints(scene);
    expect(pts).not.toBeNull();
    expect(fx.sparks).toBe(0);
    fx.update([COLLIDER], poolAt([5, 0, 0]), 1 / 60); // inside r=16 ⇒ penetrating
    expect(fx.sparks).toBe(1);
    expect(pts.visible).toBe(true);
    const arr = pts.geometry.getAttribute('position').array as ArrayLike<number>;
    for (let i = 0; i < arr.length; i++) expect(Number.isFinite(arr[i]!)).toBe(true);
    fx.dispose();
    expect(scene.children.length).toBe(0);
  });

  test('outside all colliders / none / frozen dt ⇒ no sparks; pool untouched', () => {
    const fx = new BounceImpactFX(new THREE.Scene());
    const outside = poolAt([500, 0, 0]);
    fx.update([COLLIDER], outside, 1 / 60); // far outside
    expect(fx.sparks).toBe(0);
    fx.update([], poolAt([1, 0, 0]), 1 / 60); // no colliders
    expect(fx.sparks).toBe(0);
    fx.update([COLLIDER], poolAt([1, 0, 0]), 0); // paused
    expect(fx.sparks).toBe(0);
    expect(outside.list[0]!.position.x).toBe(500); // FX mutates nothing
    fx.dispose();
  });

  test('deterministic — two identical runs produce identical spark positions', () => {
    const run = (): string => {
      const scene = new THREE.Scene();
      const fx = new BounceImpactFX(scene);
      for (let f = 0; f < 6; f++) fx.update([COLLIDER], poolAt([3, 2, 1]), 1 / 60);
      const arr = firstPoints(scene).geometry.getAttribute('position').array as ArrayLike<number>;
      const out: string[] = [];
      for (let i = 0; i < 48; i++) out.push(arr[i]!.toFixed(4));
      fx.dispose();
      return out.join(',');
    };
    expect(run()).toBe(run());
  });
});
