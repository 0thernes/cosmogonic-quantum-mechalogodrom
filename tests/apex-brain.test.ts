/**
 * APEX-BRAIN tests — the honesty bar for THE ENTROPIC TESSERACT HYDRA (the final-sigma ς brain).
 * Each organ is asserted on its REAL mathematics, not its shape:
 *   1 loom      — every active edge's |i−j| is a twin-prime distance; purge is monotone.
 *   2 drum      — discrete wave energy is bounded (damping 0) and decays (damping>0).
 *   3 necro     — dead edges monotone ↑, live fraction & budget monotone ↓; reaches brain-death.
 *   4 klein     — the seam flip is an involution; klein() always lands in range.
 *   5 hive      — the kicked-rotor Lyapunov exponent is POSITIVE (chaos), via the tangent map.
 *   6 hydra     — node count is conserved across split/fuse; state stays bounded.
 *   7 wraith    — the core value at tick t equals the input from exactly d2 ticks ago (delay law).
 *   8 tunnel    — every Born row sums to 1 (normalisation).
 *   9 thermo    — heat ≥ 0; total heat non-increasing with no firing; necrosis monotone.
 *  10 ouroboros — population is hard-capped (bounded), never NaN.
 *  meta         — plan probabilities sum to 1; |z−zT| monotone (retrocausal contraction); decoheres.
 *  cantor       — Cantor-dust addresses have NO base-3 digit equal to 1; count = 2^levels.
 *  composite    — ApexBrain is bit-for-bit deterministic; transcendence stages 1→2→3; no NaN.
 */
import { describe, expect, test } from 'bun:test';
import {
  ApexBrain,
  APEX_BRAIN_TARGET_NEURONS,
  APEX_PLAN_NAMES,
  cantorDustAddresses,
  PrimeSieveLoom,
  AcousticMeatDrum,
  EntropicNecroMatrix,
  KleinBottleCortex,
  PendulumHive,
  SlimeMoldHydra,
  ChronoWraith,
  QuantumTunnelLattice,
  ThermodynamicEngine,
  CancerousOuroboros,
  MetaParadoxLayer,
  type ApexPercept,
} from '../src/sim/apex-brain';
import { mulberry32 } from '../src/math/rng';

const seq = (n: number, level = 0): ApexPercept[] =>
  Array.from({ length: n }, (_v, i) => ({
    threat: 0.5 + 0.4 * Math.sin(i * 0.3),
    energy: 0.5,
    chaos: 0.5 + 0.4 * Math.cos(i * 0.21),
    novelty: 0.5 + 0.4 * Math.sin(i * 0.11),
    level,
  }));

describe('organ 1 — PrimeSieveLoom (twin-prime connectivity)', () => {
  test('twin-prime distance membership is correct', () => {
    const loom = new PrimeSieveLoom(64);
    for (const d of [3, 5, 7, 11, 13, 17, 19, 29, 31]) expect(loom.isTwinDistance(d)).toBe(true);
    for (const d of [0, 1, 2, 4, 8, 9, 15, 23, 37]) expect(loom.isTwinDistance(d)).toBe(false); // 23,37 isolated primes
  });
  test('every active edge has a twin-prime distance (membership law) + purge is monotone', () => {
    const loom = new PrimeSieveLoom(80);
    const rng = mulberry32(7);
    let prev = loom.activeEdgeCount();
    for (let t = 0; t < 200; t++) {
      loom.step(Math.sin(t) * 5, rng);
      const now = loom.activeEdgeCount();
      expect(now).toBeLessThanOrEqual(prev); // edges only ever burn away
      prev = now;
      for (const d of loom.activeDistances()) expect(loom.isTwinDistance(d)).toBe(true);
    }
  });
});

describe('organ 2 — AcousticMeatDrum (wave equation)', () => {
  test('energy stays bounded (no blow-up) with zero damping', () => {
    const drum = new AcousticMeatDrum(128, { damping: 0 });
    drum.excite(3, 0.5);
    const e0 = drum.energy();
    let lo = e0;
    let hi = e0;
    for (let t = 0; t < 400; t++) {
      drum.step(0);
      const e = drum.energy();
      expect(Number.isFinite(e)).toBe(true);
      lo = Math.min(lo, e);
      hi = Math.max(hi, e);
    }
    // Symplectic leapfrog below the CFL limit keeps energy in a tight bounded band.
    expect(hi).toBeLessThan(e0 * 1.3);
    expect(lo).toBeGreaterThan(e0 * 0.7);
  });
  test('energy decays under positive damping (no drive)', () => {
    const drum = new AcousticMeatDrum(96, { damping: 0.15 });
    drum.excite(2, 0.6);
    const e0 = drum.energy();
    for (let t = 0; t < 300; t++) drum.step(0);
    expect(drum.energy()).toBeLessThan(e0);
  });
});

describe('organ 3 — EntropicNecroMatrix (irreversible necrosis)', () => {
  test('dead ↑, live ↓, budget ↓ monotone; reaches brain death', () => {
    const necro = new EntropicNecroMatrix(48, mulberry32(11));
    let dead = necro.deadCount();
    let live = necro.liveFraction();
    let budget = necro.budgetLeft();
    for (let t = 0; t < 1000; t++) {
      necro.step(t * 7, t * 13 + 3);
      expect(necro.deadCount()).toBeGreaterThanOrEqual(dead);
      expect(necro.liveFraction()).toBeLessThanOrEqual(live + 1e-9);
      expect(necro.budgetLeft()).toBeLessThanOrEqual(budget);
      dead = necro.deadCount();
      live = necro.liveFraction();
      budget = necro.budgetLeft();
    }
    expect(necro.brainDead()).toBe(true);
  });
});

describe('organ 4 — KleinBottleCortex (non-orientable identification)', () => {
  test('the seam flip is an involution and klein() lands in range', () => {
    const w = 16;
    const h = 12;
    const k = new KleinBottleCortex(w, h);
    for (let v = 0; v < h; v++) {
      // crossing the u-seam flips v → h−1−v; doing it twice returns v (involution).
      const [, v1] = k.klein(w, v); // one wrap
      expect(v1).toBe(h - 1 - v);
      const [, v2] = k.klein(w, v1);
      expect(v2).toBe(v);
    }
    for (let u = -5; u < w + 5; u++) {
      for (let v = -3; v < h + 3; v++) {
        const [uu, vv] = k.klein(u, v);
        expect(uu).toBeGreaterThanOrEqual(0);
        expect(uu).toBeLessThan(w);
        expect(vv).toBeGreaterThanOrEqual(0);
        expect(vv).toBeLessThan(h);
      }
    }
  });
});

describe('organ 5 — PendulumHive (kicked-rotor chaos)', () => {
  test('largest Lyapunov exponent is positive (chaos) for a strong kick', () => {
    const hive = new PendulumHive(16, 2.7, 0.15, mulberry32(13));
    expect(hive.lyapunov(3000)).toBeGreaterThan(0.1);
  });
  test('a weak kick (near-integrable) is far less chaotic than a strong one', () => {
    const weak = new PendulumHive(8, 0.4, 0, mulberry32(1)).lyapunov(3000);
    const strong = new PendulumHive(8, 3.5, 0, mulberry32(1)).lyapunov(3000);
    expect(strong).toBeGreaterThan(weak);
  });
});

describe('organ 6 — SlimeMoldHydra (split / fuse)', () => {
  test('node count is conserved across split/fuse; state stays bounded', () => {
    const hydra = new SlimeMoldHydra(60);
    const rng = mulberry32(17);
    for (let t = 0; t < 200; t++) {
      const k = 1 + (t % 4);
      const conflict = hydra.step(k, Math.sin(t), rng);
      expect(hydra.nodeCount()).toBe(60); // conservation
      expect(conflict).toBeGreaterThanOrEqual(0);
      expect(conflict).toBeLessThanOrEqual(1);
      expect(hydra.view().heads).toBe(k);
    }
  });
});

describe('organ 7 — ChronoWraith (delay-line buffers)', () => {
  test('core value at tick t equals the input from exactly d2 ticks ago', () => {
    const d2 = 30;
    const wraith = new ChronoWraith(5, d2);
    const fed: number[] = [];
    for (let t = 1; t <= 120; t++) {
      const x = t * 0.01; // distinct, nonzero
      wraith.step(x);
      fed.push(x);
      if (t > d2) expect(wraith.coreValue()).toBeCloseTo(fed[t - d2 - 1]!, 12);
    }
  });
});

describe('organ 8 — QuantumTunnelLattice (Born-rule edges)', () => {
  test('every node row of probabilities sums to 1, before and after evolution', () => {
    const tun = new QuantumTunnelLattice(40, mulberry32(19));
    const check = (): void => {
      for (let i = 0; i < 40; i++) {
        const s = tun.rowProbabilities(i).reduce((a, b) => a + b, 0);
        expect(s).toBeCloseTo(1, 10);
      }
    };
    check();
    const rng = mulberry32(20);
    for (let t = 0; t < 50; t++) tun.step(Math.sin(t), rng);
    check();
  });
});

describe('organ 9 — ThermodynamicEngine (heat / necrosis)', () => {
  test('heat ≥ 0; total heat non-increasing with no firing', () => {
    const thermo = new ThermodynamicEngine(64);
    thermo.step((i) => (i % 4 === 0 ? 1 : 0)); // load some heat
    let prev = thermo.totalHeat();
    for (let t = 0; t < 200; t++) {
      thermo.step(() => 0); // pure diffusion + venting
      const now = thermo.totalHeat();
      expect(now).toBeGreaterThanOrEqual(0);
      expect(now).toBeLessThanOrEqual(prev + 1e-9);
      prev = now;
    }
  });
  test('sustained hard firing eventually necrotises sectors (monotone)', () => {
    const thermo = new ThermodynamicEngine(32);
    let nec = 0;
    for (let t = 0; t < 400; t++) {
      thermo.step(() => 1);
      expect(thermo.necroticCount()).toBeGreaterThanOrEqual(nec);
      nec = thermo.necroticCount();
    }
    expect(nec).toBeGreaterThan(0);
  });
});

describe('organ 10 — CancerousOuroboros (bounded self-evolution)', () => {
  test('population is hard-capped and never NaN', () => {
    const ouro = new CancerousOuroboros(48);
    const rng = mulberry32(23);
    for (let t = 0; t < 500; t++) {
      const frac = ouro.step(5, Math.abs(Math.sin(t)), rng);
      expect(ouro.limbCount()).toBeLessThanOrEqual(48);
      expect(ouro.limbCount()).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(frac)).toBe(true);
      expect(ouro.view().births).toBeGreaterThanOrEqual(0);
      expect(ouro.view().deaths).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('meta-paradox layer', () => {
  test('plan probabilities sum to 1 and the retrocausal distance is monotone non-increasing', () => {
    const meta = new MetaParadoxLayer(29);
    let dist = meta.distanceToTarget();
    const d0 = dist;
    for (let t = 0; t < 600; t++) {
      meta.step([0.2, 0.1, 0.3, 0.1, 0.2, 0.1]);
      const probs = meta.planProbabilities();
      expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      const now = meta.distanceToTarget();
      expect(now).toBeLessThanOrEqual(dist + 1e-9); // pure contraction toward the fixed target
      dist = now;
    }
    expect(dist).toBeLessThan(d0); // it really converged toward its "future corpse"
  });
  test('decoheres to a valid plan when a plan dominates', () => {
    const meta = new MetaParadoxLayer(31);
    for (let t = 0; t < 400; t++) meta.step([0.95, 0, 0, 0, 0, 0]); // drive one plan hard
    expect(meta.isSuperposed()).toBe(false);
    expect(APEX_PLAN_NAMES).toContain(meta.plan());
  });
});

describe('cantor dust', () => {
  test('addresses have no base-3 digit equal to 1; count = 2^levels', () => {
    const L = 6;
    const dust = cantorDustAddresses(L);
    expect(dust.length).toBe(2 ** L);
    for (const n of dust) {
      let x = n;
      for (let d = 0; d < L; d++) {
        expect(x % 3).not.toBe(1);
        x = Math.floor(x / 3);
      }
    }
  });
});

describe('composite — ApexBrain', () => {
  test('bit-for-bit deterministic across identical seeds + inputs', () => {
    const a = new ApexBrain(0xabcdef);
    const b = new ApexBrain(0xabcdef);
    const inputs = seq(120, 250);
    for (const p of inputs) {
      a.tick(p);
      b.tick(p);
    }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });
  test('runs hundreds of beats without NaN; thought fields stay in range', () => {
    const brain = new ApexBrain(0x1234);
    for (const p of seq(400, 500)) {
      const th = brain.tick(p);
      for (const v of [th.vitality, th.agony, th.transcendence]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(APEX_PLAN_NAMES).toContain(th.plan);
      expect(Number.isFinite(th.motor.x)).toBe(true);
    }
    const snap = brain.snapshot();
    expect(snap.targetNeurons).toBe(APEX_BRAIN_TARGET_NEURONS);
    expect(snap.liveNeurons).toBeGreaterThan(0);
    expect(snap.liveNeurons).toBeLessThan(snap.targetNeurons); // honest: live ≪ the 1B target
  });
  test('staged-simulation transcendence crosses 1 → 2 → 3 with level', () => {
    const brain = new ApexBrain(0x9);
    expect(brain.tick({ threat: 0, energy: 1, chaos: 0, novelty: 0, level: 0 }).simulation).toBe(1);
    expect(brain.tick({ threat: 0, energy: 1, chaos: 0, novelty: 0, level: 600 }).simulation).toBe(
      2,
    );
    expect(brain.tick({ threat: 0, energy: 1, chaos: 0, novelty: 0, level: 1000 }).simulation).toBe(
      3,
    );
  });
});
