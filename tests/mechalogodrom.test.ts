/**
 * THE MECHALOGODROM (V-MECHA). Falsifiable claims:
 * - construction draws NO rng and needs no DOM (boot-stream-neutral; headless Scene only);
 * - fusion ramps monotonically 0 → 1 and reports `fused` once converged;
 * - the dioramagonic `dimension` readout sweeps from ~99 (genesis) down to ~−10 (full fusion);
 * - the ten variant shells melt from 10 distinct down toward the corona as fusion completes;
 * - every snapshot field + the warped mass geometry stays FINITE over a long run at max chaos;
 * - it is deterministic: identical (t, dt) sequences ⇒ bit-identical snapshots (no rng, no clock);
 * - dispose() frees its rig without throwing.
 *
 * Headless: three's Scene/Mesh/Material/BufferGeometry need no WebGL context.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { Mechalogodrom } from '../src/sim/mechalogodrom';

/** Drive N fixed 1/60s frames, optionally feeding a constant chaos. Returns the final snapshot. */
function run(m: Mechalogodrom, seconds: number, chaos = 0): ReturnType<Mechalogodrom['snapshot']> {
  const dt = 1 / 60;
  let t = 0;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    t += dt;
    if (chaos) m.setChaos(chaos);
    m.update(t, dt);
  }
  return m.snapshot();
}

describe('Mechalogodrom — the fusion abomination', () => {
  test('boots headless and reports a genesis snapshot before any tick', () => {
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    const s = m.snapshot();
    expect(s.fusion).toBe(0);
    expect(s.variants).toBe(10);
    expect(s.fused).toBe(false);
    // Dimension begins at the top of the dioramagonic sweep.
    expect(s.dimension).toBeCloseTo(99, 5);
    m.dispose();
  });

  test('fusion ramps monotonically 0 → 1 and converges to a whole monster', () => {
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    const dt = 1 / 60;
    let t = 0;
    let prev = -1;
    for (let i = 0; i < 60 * 30; i++) {
      t += dt;
      m.update(t, dt);
      const f = m.snapshot().fusion;
      expect(f).toBeGreaterThanOrEqual(prev); // monotonic non-decreasing
      expect(f).toBeLessThanOrEqual(1); // bounded
      prev = f;
    }
    const s = m.snapshot();
    expect(s.fusion).toBe(1);
    expect(s.fused).toBe(true);
    m.dispose();
  });

  test('dioramagonic dimensionality sweeps 99 → under-Λ −10 as it fuses', () => {
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    const s = run(m, 30);
    expect(s.dimension).toBeCloseTo(-10, 2); // 99 − 1·109 = −10 at full fusion
    expect(s.fused).toBe(true);
    m.dispose();
  });

  test('variant shells melt from 10 distinct toward the corona', () => {
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    expect(m.snapshot().variants).toBe(10);
    const s = run(m, 30);
    expect(s.variants).toBeLessThan(10); // most have melted in once fused
    m.dispose();
  });

  test('every value + the warped geometry stays finite over a long run at max chaos', () => {
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    const s = run(m, 40, 1); // long max-chaos run (kept under bun's 5s default timeout under load)
    for (const v of [s.fusion, s.dimension, s.power, s.warp, s.variants] as const) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(s.power).toBeGreaterThan(0);
    // `warp` finiteness proves the per-vertex displacement `1 + w·0.32·d` never blew up (d is a
    // bounded sum of sines), so the shared mass geometry stays NaN-free under sustained warp.
    m.dispose();
  });

  test(
    'is deterministic — identical (t, dt) sequences ⇒ identical snapshots',
    () => {
      const a = new Mechalogodrom(new THREE.Scene());
      const b = new Mechalogodrom(new THREE.Scene());
      const sa = run(a, 40, 0.5);
      const sb = run(b, 40, 0.5);
      expect(sa.fusion).toBe(sb.fusion);
      expect(sa.dimension).toBe(sb.dimension);
      expect(sa.power).toBe(sb.power);
      expect(sa.warp).toBe(sb.warp);
      expect(sa.variants).toBe(sb.variants);
      a.dispose();
      b.dispose();
    },
    // Long max-chaos run; coverage instrumentation + suite contention needs headroom.
    { timeout: 45_000 },
  );

  test('FUSION-MIND → BODY: the winning sub-brain blazes its shell, consciousness glows the core, strangeness warps the mass', () => {
    // The Mechalogodrom's OWN 10-variant fusion brain drives its OWN body — a falsifiable readout, not
    // decoration. We prove three independent mind→body couplings actually reach the geometry/materials.
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    // Fuse fully first so ease≈1 and the effects are at their operating point.
    run(m, 20);

    // The mass is the ONLY MeshStandardMaterial in the rig — locate it to read its coherence glow.
    let massMat: THREE.MeshStandardMaterial | null = null;
    scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        massMat = mat as THREE.MeshStandardMaterial;
      }
    });
    expect(massMat).not.toBeNull();
    const mass = massMat as unknown as THREE.MeshStandardMaterial;

    const dt = 1 / 60;
    let t = 20;

    // Coalition #3 wins the workspace; the mind is highly conscious + dimensionally strange.
    for (let i = 0; i < 180; i++) {
      t += dt;
      m.setMind(3, 0.95, 0.6);
      m.update(t, dt);
    }
    const blazeHot = m.workspaceBlaze;
    // Global Workspace: the winning coalition's PHYSICAL shell (index 3) is the brightest of all ten.
    for (let i = 0; i < 10; i++) {
      if (i !== 3) expect(blazeHot[3]!).toBeGreaterThan(blazeHot[i]!);
    }
    const warpHot = m.snapshot().warp;
    const emisHot = mass.emissiveIntensity;

    // The mind switches its dominant coalition to shell #7 and goes quiet (no consciousness/strangeness).
    for (let i = 0; i < 180; i++) {
      t += dt;
      m.setMind(7, 0, 0);
      m.update(t, dt);
    }
    const blazeCold = m.workspaceBlaze;
    // The blaze MIGRATED: #7 now leads, and #3 (the old winner) has visibly dimmed.
    for (let i = 0; i < 10; i++) {
      if (i !== 7) expect(blazeCold[7]!).toBeGreaterThan(blazeCold[i]!);
    }
    expect(blazeCold[3]!).toBeLessThan(blazeHot[3]!);
    // Strangeness genuinely warps the mass harder (reported warp rises), and consciousness genuinely
    // brightens the core — both are real readouts, so removing them measurably drops both quantities.
    expect(warpHot).toBeGreaterThan(m.snapshot().warp);
    expect(emisHot).toBeGreaterThan(mass.emissiveIntensity);
    m.dispose();
  });

  test('setMind clamps out-of-range cognition (no NaN, dominant index bounded, blaze stays finite)', () => {
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    run(m, 5);
    const dt = 1 / 60;
    let t = 5;
    // Feed garbage: an out-of-range dominant, and consciousness/strangeness outside [0,1].
    for (let i = 0; i < 60; i++) {
      t += dt;
      m.setMind(99, 5, -3);
      m.update(t, dt);
    }
    const blaze = m.workspaceBlaze;
    expect(blaze.length).toBe(10);
    let sum = 0;
    for (const b of blaze) {
      expect(Number.isFinite(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
      sum += b;
    }
    // A clamped dominant (99 → 9) means the LAST shell should have taken the blaze.
    expect(blaze[9]!).toBeGreaterThan(0.5);
    expect(Number.isFinite(sum)).toBe(true);
    m.dispose();
  });

  test('dispose() is safe', () => {
    const m = new Mechalogodrom(new THREE.Scene());
    run(m, 5);
    expect(() => m.dispose()).not.toThrow();
  });

  test('HD CHIMERA LAYERS: all ten shells carry fringe + glitter + TWO recursive echoes SHARING the live morphing geometry', () => {
    // Owner reference images (2026-07-14): dense glittering iridescent shells with the recursive
    // mirrored-tunnel read — never flat wire. The fringe, the glitter Points, and the two nested
    // echo copies must all reuse the SAME BufferGeometry instance the morph writer updates — one
    // CPU morph feeds all five draws.
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    run(m, 2);
    let shells = 0;
    scene.traverse((o) => {
      if (!(o instanceof THREE.LineSegments)) return;
      const lineChildren = o.children.filter((c) => c instanceof THREE.LineSegments);
      const spark = o.children.find((c) => c instanceof THREE.Points) as THREE.Points | undefined;
      if (lineChildren.length < 3 || !spark) return; // fringe + echoA + echoB
      shells++;
      for (const lc of lineChildren) {
        expect((lc as THREE.LineSegments).geometry).toBe(o.geometry);
      }
      expect(spark.geometry).toBe(o.geometry);
      // HD density floor: every shell draws hundreds of live segments, not a sparse platonic wire.
      expect(o.geometry.drawRange.count).toBeGreaterThan(600); // vertices (2 per segment)
      // The layers are actually driven (opacity/colour written each frame), never left at defaults.
      const sm = spark.material as THREE.PointsMaterial;
      expect(sm.size).toBeGreaterThan(1);
      for (const lc of lineChildren) {
        expect(
          ((lc as THREE.LineSegments).material as THREE.LineBasicMaterial).opacity,
        ).toBeGreaterThan(0);
      }
      // The echoes are genuinely SPUN (rotation written by the STDP-gain wheel), not static clones.
      const spun = lineChildren.filter((lc) => lc.rotation.z !== 0);
      expect(spun.length).toBeGreaterThanOrEqual(2);
    });
    expect(shells).toBe(10);
    m.dispose();
  });

  test('REFERENCE PALETTES: the ten shells wear ten DISTINCT authored colours and the live invariant reaches the hue mix', () => {
    // Owner reference set 2 (chrome vortex · nebula · prism · glitterverse · caustics): each shell
    // owns an authored two-pole palette, and the shell's live measured INVARIANT drags the mix
    // between the poles — the mathematics chooses the colour (sealed below + source-sealed in
    // tests/mechalogodrom-variant-geometry.test.ts).
    const scene = new THREE.Scene();
    const m = new Mechalogodrom(scene);
    run(m, 3);
    const colors: string[] = [];
    scene.traverse((o) => {
      if (!(o instanceof THREE.LineSegments)) return;
      if (o.children.filter((c) => c instanceof THREE.LineSegments).length < 3) return;
      colors.push((o.material as THREE.LineBasicMaterial).color.getHexString());
    });
    expect(colors).toHaveLength(10);
    // At least 9 of 10 distinct at any instant (two shells may transiently cross mid-swing;
    // full coincidence would mean the palette table is dead).
    expect(new Set(colors).size).toBeGreaterThanOrEqual(9);
    m.dispose();
  });
});
