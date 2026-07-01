/**
 * Owner directive #10 — the 100 alphabet-pantheon godforms must stay INSIDE the dome. Each frame their
 * drawn position is anchor + wander + glyph-brain motor output; large motor values used to fling them
 * "outside the borders / underneath like flies". This drives EXTREME motors for several frames and
 * asserts every drawn body is clamped within PANTHEON_BOUNDS (horizontal radius ≤ DOME_R,
 * y ∈ [FLOOR_Y, DOME_R]). Without the clamp in update(), the 1e5 motors send them far outside.
 *
 * Headless: three's Scene/InstancedMesh need no DOM (the fake-ctx pattern used across the suite).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { AlphabetPantheonRender, PANTHEON_BOUNDS } from '../src/sim/alphabet-pantheon-render';

describe('alphabet pantheon containment (owner directive #10)', () => {
  test('every godform stays inside the dome under extreme motor drift', () => {
    const scene = new THREE.Scene();
    const render = new AlphabetPantheonRender(scene);
    // Slam every glyph brain's motor to a huge value — without the clamp they'd leave the dome.
    const motors = Array.from({ length: 100 }, () => ({
      motor: new Float32Array([1e5, 1e5, 1e5, 0]),
    }));
    render.setBrainMotors(motors);
    render.setChaos(1);
    for (let i = 0; i < 8; i++) render.update(i * 0.5, 0.05);

    const { DOME_R, FLOOR_Y } = PANTHEON_BOUNDS;
    const positions: THREE.Vector3[] = [];
    render.bodyWorldPositions(positions);
    expect(positions.length).toBeGreaterThan(0);
    for (const p of positions) {
      const hr = Math.hypot(p.x, p.z);
      expect(hr).toBeLessThanOrEqual(DOME_R + 1e-3);
      expect(p.y).toBeGreaterThanOrEqual(FLOOR_Y - 1e-3);
      expect(p.y).toBeLessThanOrEqual(DOME_R + 1e-3);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
    }
    render.dispose();
  });
});
