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

  test('V123 anti-loop: the boid EXPLORES a large volume (a Lissajous loop stays in a thin shell)', () => {
    // The core of USER #8: the old model traced a closed cos/sin curve, so a godform orbited a fixed
    // ring forever. The velocity navigator visits re-picked interior waypoints, so over a long run it
    // fills a LARGE fraction of the platform box — the falsifiable signature of genuine wandering.
    const scene = new THREE.Scene();
    const r = new AlphabetPantheonRender(scene);
    r.setChaos(1);
    let t = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    const cur = new THREE.Vector3();
    let prev = corePos(scene, new THREE.Vector3());
    let maxStep = 0;
    for (let i = 0; i < 6000; i++) {
      // ~100 s of wandering
      t += DT;
      r.update(t, DT);
      corePos(scene, cur);
      minX = Math.min(minX, cur.x);
      maxX = Math.max(maxX, cur.x);
      minZ = Math.min(minZ, cur.z);
      maxZ = Math.max(maxZ, cur.z);
      maxStep = Math.max(maxStep, cur.distanceTo(prev));
      prev.copy(cur);
    }
    // Explores a wide span in BOTH horizontal axes (a thin-shell loop could not).
    expect(maxX - minX).toBeGreaterThan(200);
    expect(maxZ - minZ).toBeGreaterThan(200);
    // …yet motion stays CONTINUOUS — no teleport (a single-frame jump would be the jerk we killed).
    expect(maxStep).toBeLessThan(40);
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
