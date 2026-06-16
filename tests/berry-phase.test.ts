/**
 * THE BERRY PHASE (Super Creature 1.1, V98) — the holonomic memory: the geometric phase the mind's
 * wavefunction accumulates as its cognition knobs trace a path (∮∮ Ω dA of the QGT's Berry curvature).
 * Pins determinism, NaN-safety, the wrap/winding bookkeeping, the path-not-speed (reparameterisation)
 * invariance, the zero-curvature ⇒ zero-phase law, and the closed-loop holonomy of a known circuit.
 */
import { describe, expect, test } from 'bun:test';
import { BerryPhase } from '../src/sim/berry-phase';

describe('BerryPhase — holonomic memory (V98)', () => {
  test('zero Berry curvature ⇒ no geometric phase, however the drives move', () => {
    const b = new BerryPhase();
    for (let i = 0; i < 50; i++) {
      b.accumulate(0, Math.sin(i), Math.cos(i)); // Ω = 0 everywhere
    }
    expect(b.holonomy).toBe(0);
    expect(b.snapshot().winding).toBe(0);
  });

  test('a closed circular loop under constant curvature accrues Ω·(enclosed area)', () => {
    // trace a full unit circle; the swept area returns to π·r² = π for r=1; with Ω=1 ⇒ phase ≈ π.
    const b = new BerryPhase();
    const N = 2000;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * 2 * Math.PI;
      b.accumulate(1, Math.cos(t), Math.sin(t));
    }
    expect(b.holonomy).toBeCloseTo(Math.PI, 2); // ½∮(x dy − y dx) = area = π
  });

  test('path-not-speed: the holonomy is invariant under reparameterisation of the same loop', () => {
    const slow = new BerryPhase();
    const fast = new BerryPhase();
    const Ns = 3000;
    for (let i = 0; i <= Ns; i++) {
      const t = (i / Ns) * 2 * Math.PI;
      slow.accumulate(0.7, Math.cos(t), Math.sin(t));
    }
    // same geometric loop, traversed with a non-uniform (sped-up/slowed) sampling
    const Nf = 800;
    for (let i = 0; i <= Nf; i++) {
      const u = i / Nf;
      const t = u * u * 2 * Math.PI; // quadratic reparameterisation (varies speed)
      fast.accumulate(0.7, Math.cos(t), Math.sin(t));
    }
    expect(fast.holonomy).toBeCloseTo(slow.holonomy, 1); // same area ⇒ same geometric phase
  });

  test('deterministic — same curvature + path replays the identical phase', () => {
    const a = new BerryPhase();
    const c = new BerryPhase();
    for (let i = 0; i < 40; i++) {
      const om = Math.sin(i * 0.3);
      const x = Math.cos(i * 0.2);
      const y = Math.sin(i * 0.17);
      expect(a.accumulate(om, x, y)).toBe(c.accumulate(om, x, y));
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(c.snapshot()));
  });

  test('winding + wrapped phase bookkeeping is consistent (phase = total − winding·2π ∈ (−π,π])', () => {
    const b = new BerryPhase();
    // pump a large monotone phase by sweeping a growing spiral under positive curvature
    for (let i = 1; i < 400; i++) {
      b.accumulate(0.5, i % 7, (i + 2) % 5);
    }
    const s = b.snapshot();
    expect(s.total).toBeCloseTo(s.winding * 2 * Math.PI + s.phase, 6);
    expect(s.phase).toBeGreaterThan(-Math.PI - 1e-9);
    expect(s.phase).toBeLessThanOrEqual(Math.PI + 1e-9);
    expect(Number.isInteger(s.winding)).toBe(true);
  });

  test('NaN / ±Infinity inputs never poison the accumulator', () => {
    const b = new BerryPhase();
    b.accumulate(1, 1, 0);
    b.accumulate(NaN, Infinity, -Infinity);
    b.accumulate(NaN, NaN, NaN);
    b.accumulate(0.5, 0.5, 0.5);
    const s = b.snapshot();
    for (const v of [s.phase, s.total, s.curvature, s.flux]) expect(Number.isFinite(v)).toBe(true);
    expect(s.flux).toBeGreaterThanOrEqual(0);
    expect(s.flux).toBeLessThanOrEqual(1);
    expect(JSON.stringify(s)).not.toContain('null');
  });
});
