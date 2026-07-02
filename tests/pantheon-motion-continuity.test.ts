/**
 * PANTHEON MOTION CONTINUITY (V121). The godforms' phases are now RATE-integrated, so live signals
 * (chaos, apex presence, Tsotchke pulse) modulate motion SPEED — never re-scale an accumulated
 * angle. Falsifiable claims:
 * - a chaos STEP (3 → 0.05, the GENESIS-RESET snap) does NOT teleport any godform: the frame-over-
 *   frame displacement right after the step stays within the normal motion band;
 * - softLimit is identity inside 85% of the half-extent, strictly inside ±half beyond, monotone;
 * - the boot travel ramp: the pantheon covers LESS ground in the first seconds than at cruise;
 * - determinism is intact: two renders fed the same sequence are bit-identical.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { AlphabetPantheonRender, softLimit } from '../src/sim/alphabet-pantheon-render';

const DT = 1 / 60;

function corePos(scene: THREE.Scene, out: THREE.Vector3): THREE.Vector3 {
  let mesh: THREE.InstancedMesh | null = null;
  scene.traverse((o) => {
    const m = o as THREE.InstancedMesh;
    if (!mesh && m.isInstancedMesh && !(m.material as THREE.MeshBasicMaterial).wireframe) mesh = m;
  });
  const mm = new THREE.Matrix4();
  (mesh as unknown as THREE.InstancedMesh).getMatrixAt(0, mm);
  return out.setFromMatrixPosition(mm);
}

describe('softLimit — the anti-fencing soft wall', () => {
  test('identity inside 85%, strictly inside ±half beyond, monotone, odd', () => {
    expect(softLimit(100, 540)).toBe(100);
    expect(softLimit(-458, 540)).toBe(-458); // 0.848·540 — still inside the knee
    const nearWall = softLimit(700, 540);
    expect(nearWall).toBeLessThan(540);
    expect(nearWall).toBeGreaterThan(540 * 0.85);
    expect(softLimit(-700, 540)).toBe(-nearWall); // odd symmetry
    let prev = -Infinity;
    for (let v = -900; v <= 900; v += 25) {
      const s = softLimit(v, 540);
      expect(s).toBeGreaterThan(prev); // strictly monotone — no flat wall-slide band
      prev = s;
    }
  });
});

describe('AlphabetPantheonRender — motion continuity under live-signal steps', () => {
  test('a chaos snap (3 → 0.05, the reset-button case) never teleports a godform', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    r.setChaos(1);
    let t = 0;
    // Cruise well past the boot ramp so per-frame displacement is at full speed.
    for (let i = 0; i < 1200; i++) {
      t += DT;
      r.update(t, DT);
    }
    const a = corePos(scene, new THREE.Vector3());
    t += DT;
    r.update(t, DT);
    const b = corePos(scene, new THREE.Vector3());
    const cruiseStep = b.distanceTo(a); // normal one-frame displacement at chaos 1
    // THE SNAP: chaos collapses (GENESIS RESET sets 0.5; chaos boost can jump to 3+).
    r.setChaos(0.05);
    t += DT;
    r.update(t, DT);
    const c = corePos(scene, new THREE.Vector3());
    const snapStep = c.distanceTo(b);
    // Pre-fix the drift angle re-scaled with chaos and this step was tens/hundreds of units.
    // Post-fix chaos only changes the RATE: the step stays in the normal band.
    expect(snapStep).toBeLessThan(Math.max(1, cruiseStep * 4));
    r.dispose();
  });

  test('boot travel ramp: less ground covered in the first 2 s than in a later 2 s window', () => {
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    r.setChaos(1);
    const p0 = corePos(scene, new THREE.Vector3());
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += DT;
      r.update(t, DT);
    }
    const p1 = corePos(scene, new THREE.Vector3());
    const early = p1.distanceTo(p0);
    for (let i = 0; i < 3000; i++) {
      t += DT;
      r.update(t, DT);
    }
    const p2 = corePos(scene, new THREE.Vector3());
    for (let i = 0; i < 120; i++) {
      t += DT;
      r.update(t, DT);
    }
    const late = corePos(scene, new THREE.Vector3()).distanceTo(p2);
    expect(early).toBeLessThan(late + 1e-6); // the ramp starts them gentle (tolerate a curve cusp)
    r.dispose();
  });

  test('determinism intact: two renders fed the same sequence are bit-identical', () => {
    const mk = (): number[] => {
      const scene = new THREE.Scene();
      const r = new AlphabetPantheonRender(scene);
      r.setChaos(2);
      let t = 0;
      for (let i = 0; i < 300; i++) {
        t += DT;
        r.update(t, DT);
        if (i === 150) r.setChaos(0.4); // include a live-signal step in the replay
      }
      const p = corePos(scene, new THREE.Vector3());
      r.dispose();
      return [p.x, p.y, p.z];
    };
    expect(mk()).toEqual(mk());
  });
});
