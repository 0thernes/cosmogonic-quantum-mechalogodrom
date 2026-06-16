/**
 * THE EMPOWERMENT DRIVE (V95) — closed-form experiments for the channel-capacity agency hunger. Each test
 * is a falsifiable claim about a PROVABLE property of Blahut–Arimoto empowerment (Physicist's law 4):
 * monotone convergence, the two known limits (full control ⇒ 1, no control ⇒ 0), the closed-form [0,1]
 * bound + NaN-freedom, seeded determinism, the surprise-gated re-learning, and the most-steering-plan readout.
 */
import { describe, expect, test } from 'bun:test';
import { EmpowermentDrive, type EmpowermentConfig } from '../src/sim/empowerment';
import { mulberry32 } from '../src/math/rng';

const cfg = (over: EmpowermentConfig = {}): EmpowermentConfig => ({
  actions: 7,
  bins: 64,
  latentDim: 16,
  ...over,
});

/** Find `count` latents that hash to DISTINCT cells under the hyperplanes seeded by `seed` (binning depends
 *  only on the latent + frozen hyperplanes, so a probe drive's channel pollution is irrelevant here). */
function distinctBinLatents(seed: number, c: EmpowermentConfig, count: number): number[][] {
  const probe = new EmpowermentDrive(mulberry32(seed), c);
  const lr = mulberry32((seed ^ 0x9e3779b9) >>> 0 || 1);
  const D = c.latentDim ?? 16;
  const byBin = new Map<number, number[]>();
  for (let attempt = 0; attempt < 50000 && byBin.size < count; attempt++) {
    const lat = Array.from({ length: D }, () => lr() * 4 - 2);
    probe.update(lat, 0);
    const b = probe.currentBin;
    if (!byBin.has(b)) byBin.set(b, lat);
  }
  const out = [...byBin.values()];
  if (out.length < count) throw new Error(`only found ${out.length}/${count} distinct bins`);
  return out.slice(0, count);
}

describe('EmpowermentDrive (V95) — Blahut–Arimoto channel-capacity agency', () => {
  test('Blahut–Arimoto capacity is non-decreasing across iterations and converges', () => {
    // Standalone replica of the exact recurrence the module runs, on a fixed non-degenerate 3×4 channel.
    const K = 3;
    const M = 4;
    const q = [
      [0.7, 0.1, 0.1, 0.1],
      [0.1, 0.7, 0.1, 0.1],
      [0.1, 0.1, 0.4, 0.4],
    ];
    const r = Array.from({ length: K }, () => 1 / K);
    const caps: number[] = [];
    for (let t = 0; t < 60; t++) {
      const qb = Array.from({ length: M }, () => 0);
      for (let a = 0; a < K; a++)
        for (let j = 0; j < M; j++) qb[j] = (qb[j] ?? 0) + (r[a] ?? 0) * (q[a]?.[j] ?? 0);
      const c = Array.from({ length: K }, () => 0);
      for (let a = 0; a < K; a++) {
        let s = 0;
        for (let j = 0; j < M; j++) {
          const p = q[a]?.[j] ?? 0;
          const m = qb[j] ?? 0;
          if (p > 0 && m > 1e-12) s += p * Math.log(p / m);
        }
        c[a] = Math.exp(s);
      }
      let rc = 0;
      for (let a = 0; a < K; a++) rc += (r[a] ?? 0) * (c[a] ?? 0);
      caps.push(Math.log(rc > 1e-300 ? rc : 1e-300));
      for (let a = 0; a < K; a++) r[a] = ((r[a] ?? 0) * (c[a] ?? 0)) / (rc > 0 ? rc : 1);
    }
    for (let t = 1; t < caps.length; t++) {
      expect((caps[t] ?? 0) - (caps[t - 1] ?? 0)).toBeGreaterThanOrEqual(-1e-12); // monotone non-decreasing
    }
    expect(Math.abs((caps[caps.length - 1] ?? 0) - (caps[caps.length - 2] ?? 0))).toBeLessThan(
      1e-6,
    );
  });

  test('a fully-controllable channel drives empowerment → 1 (capacity → ln K)', () => {
    const seed = 0x51ed;
    const K = 7;
    const c = cfg({ lambda: 0.25 });
    const latents = distinctBinLatents(seed, c, K); // K latents, each a distinct cell
    const drive = new EmpowermentDrive(mulberry32(seed), c); // same seed ⇒ identical hyperplanes/binning
    let prev = -1;
    for (let i = 0; i < 600; i++) {
      const lat = prev >= 0 ? (latents[prev] ?? latents[0]) : latents[0];
      const plan = i % K;
      drive.update(lat ?? [], plan);
      prev = plan;
    }
    const s = drive.snapshot();
    expect(s.empowerment).toBeGreaterThan(0.97); // each action lands its own distinct cell ⇒ near-perfect control
    expect(s.capacityNats).toBeGreaterThan(0.97 * Math.log(K));
  });

  test('a degenerate channel (every action → the same cell) gives empowerment = 0', () => {
    const K = 7;
    const drive = new EmpowermentDrive(mulberry32(0xbead), cfg());
    const constant = Array.from({ length: 16 }, () => 0.5); // constant latent ⇒ one fixed cell forever
    // N-1 a multiple of K ⇒ every row is credited equally ⇒ all rows become bit-identical ⇒ capacity = 0.
    for (let i = 0; i < 7 * 80 + 1; i++) drive.update(constant, i % K);
    const s = drive.snapshot();
    expect(s.empowerment).toBeLessThan(1e-6);
    expect(s.capacityNats).toBeLessThan(1e-6);
    expect(s.occupancy).toBeCloseTo(1 / 64, 6); // only one cell ever visited
  });

  test('empowerment stays in [0,1] and NaN-free across a long random driven run', () => {
    const K = 7;
    const drive = new EmpowermentDrive(mulberry32(7), cfg());
    const lr = mulberry32(13);
    for (let i = 0; i < 500; i++) {
      const lat = Array.from({ length: 16 }, () => lr() * 2 - 1);
      const e = drive.update(lat, Math.floor(lr() * K), lr());
      expect(Number.isFinite(e)).toBeTrue();
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
    const s = drive.snapshot();
    let sum = 0;
    for (const p of s.inputDist) {
      expect(Number.isFinite(p)).toBeTrue();
      expect(p).toBeGreaterThanOrEqual(-1e-12);
      sum += p;
    }
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9); // input distribution is a valid pmf
    for (const v of s.contributions) {
      expect(Number.isFinite(v)).toBeTrue();
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  test('same seed + same (latent, plan, surprise) stream ⇒ bit-identical (deterministic)', () => {
    const K = 7;
    const run = (): string => {
      const drive = new EmpowermentDrive(mulberry32(0xc0ffee), cfg());
      const lr = mulberry32(0x1234);
      for (let i = 0; i < 120; i++) {
        const lat = Array.from({ length: 16 }, () => lr() * 2 - 1);
        drive.update(lat, Math.floor(lr() * K), lr());
      }
      return JSON.stringify(drive.snapshot());
    };
    expect(run()).toBe(run());
  });

  test('surprise gates the forgetting rate: high surprise re-learns a changed channel faster', () => {
    const seed = 0x5a17;
    const K = 7;
    const c = cfg({ lambda: 0.1 });
    const latents = distinctBinLatents(seed, c, K);
    const constant = Array.from({ length: 16 }, () => -0.4);
    const drive = (): EmpowermentDrive => new EmpowermentDrive(mulberry32(seed), c);
    const calm = drive();
    const alarmed = drive();
    // Phase 1 — both warm the SAME controllable channel to high empowerment (surprise 0).
    let prev = -1;
    for (let i = 0; i < 240; i++) {
      const lat = prev >= 0 ? (latents[prev] ?? latents[0]) : latents[0];
      const plan = i % K;
      calm.update(lat ?? [], plan, 0);
      alarmed.update(lat ?? [], plan, 0);
      prev = plan;
    }
    expect(calm.empowerment).toBeGreaterThan(0.9);
    expect(calm.empowerment).toBeCloseTo(alarmed.empowerment, 12); // identical so far
    // Phase 2 — the world goes degenerate (all → one cell). alarmed gets surprise=1, calm gets 0.
    for (let i = 0; i < 24; i++) {
      calm.update(constant, i % K, 0);
      alarmed.update(constant, i % K, 1);
    }
    expect(alarmed.empowerment).toBeLessThan(calm.empowerment); // higher forgetting ⇒ control collapses sooner
  });

  test('bestAction picks the plan whose action-row steers the future the most', () => {
    const seed = 0x7e57;
    const K = 7;
    const c = cfg({ lambda: 0.25 });
    const [lInformative, lShared] = distinctBinLatents(seed, c, 2);
    const drive = new EmpowermentDrive(mulberry32(seed), c);
    // Action 0 lands its OWN distinct cell; actions 1..K-1 all collapse to one shared cell.
    let prev = -1;
    for (let i = 0; i < 700; i++) {
      const plan = i % K;
      const lat = prev === 0 ? lInformative : lShared;
      drive.update(lat ?? [], plan);
      prev = plan;
    }
    const s = drive.snapshot();
    expect(drive.bestAction()).toBe(0);
    const c0 = s.contributions[0] ?? 0;
    for (let a = 1; a < K; a++) expect(c0).toBeGreaterThan((s.contributions[a] ?? 0) + 1e-6);
  });
});
