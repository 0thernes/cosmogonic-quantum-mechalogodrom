import { describe, expect, test } from 'bun:test';
import { QuantumRegister, type GateName } from '../src/math/quantum';
import { QuantumCircuitSystem } from '../src/sim/qcircuit';
import { mulberry32 } from '../src/math/rng';
import type { PuppetEvent, SimContext, SimState } from '../src/types';

/** Tolerance for unitary identities (contract: 1e-12). */
const EPS_UNITARY = 1e-12;
/** Tolerance for probability normalization (contract: 1e-9). */
const EPS_NORM = 1e-9;

/** Minimal honest SimState for headless qcircuit tests. */
function makeState(chaos: number): SimState {
  return {
    chaos,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    weatherIdx: 0,
    temperature: 15,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
}

/**
 * QuantumCircuitSystem reads only `ctx.rng` and `ctx.state.chaos` (documented on its
 * constructor), so a two-field context stands in for the full bag in headless tests.
 */
function makeCtx(seed: number, chaos: number): SimContext {
  const partial: Pick<SimContext, 'rng' | 'state'> = {
    rng: mulberry32(seed),
    state: makeState(chaos),
  };
  return partial as SimContext;
}

/** Scrambles a register into a non-trivial entangled state with a fixed gate program. */
function scramble(reg: QuantumRegister): void {
  reg.apply('h', 0);
  reg.apply('rx', 1, undefined, 1.234);
  reg.apply('cx', 2, 0);
  reg.apply('t', 1);
  reg.apply('ry', 2, undefined, 0.7);
  reg.apply('cz', 1, 2);
}

describe('QuantumRegister construction', () => {
  test('throws for qubit counts outside [1, 8] and non-integers', () => {
    expect(() => new QuantumRegister(0)).toThrow(RangeError);
    expect(() => new QuantumRegister(9)).toThrow(RangeError);
    expect(() => new QuantumRegister(-3)).toThrow(RangeError);
    expect(() => new QuantumRegister(2.5)).toThrow(RangeError);
  });

  test('accepts every width 1..8 and starts in |0...0> with zero entropy', () => {
    for (let n = 1; n <= 8; n++) {
      const reg = new QuantumRegister(n);
      expect(reg.qubits).toBe(n);
      const p = reg.probabilities();
      expect(p.length).toBe(1 << n);
      expect(p[0]).toBe(1);
      for (let i = 1; i < p.length; i++) expect(p[i]).toBe(0);
      expect(reg.entropy()).toBe(0);
    }
  });
});

describe('QuantumRegister gates', () => {
  test('H on every qubit gives the uniform distribution (max entropy)', () => {
    const reg = new QuantumRegister(3);
    reg.apply('h', 0);
    reg.apply('h', 1);
    reg.apply('h', 2);
    const p = reg.probabilities();
    for (let i = 0; i < 8; i++) {
      expect(Math.abs((p[i] ?? 0) - 0.125)).toBeLessThan(EPS_UNITARY);
    }
    expect(Math.abs(reg.entropy() - 1)).toBeLessThan(EPS_UNITARY);
  });

  test('H·H = identity within 1e-12 on a scrambled state', () => {
    const reg = new QuantumRegister(3);
    scramble(reg);
    const before = Array.from(reg.probabilities());
    reg.apply('h', 1);
    reg.apply('h', 1);
    const after = reg.probabilities();
    for (let i = 0; i < before.length; i++) {
      expect(Math.abs((after[i] ?? 0) - (before[i] ?? 0))).toBeLessThan(EPS_UNITARY);
    }
  });

  test('X flips |0> to |1> and back', () => {
    const reg = new QuantumRegister(1);
    reg.apply('x', 0);
    let p = reg.probabilities();
    expect(Math.abs((p[1] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
    expect(Math.abs(p[0] ?? 0)).toBeLessThan(EPS_UNITARY);
    reg.apply('x', 0);
    p = reg.probabilities();
    expect(Math.abs((p[0] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
  });

  test('H·Z·H = X (basis-change identity)', () => {
    const reg = new QuantumRegister(1);
    reg.apply('h', 0);
    reg.apply('z', 0);
    reg.apply('h', 0);
    const p = reg.probabilities();
    expect(Math.abs((p[1] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
  });

  test('S·S = Z and T·T = S (verified through the H sandwich)', () => {
    const viaZ = new QuantumRegister(1);
    viaZ.apply('h', 0);
    viaZ.apply('s', 0);
    viaZ.apply('s', 0);
    viaZ.apply('h', 0);
    expect(Math.abs((viaZ.probabilities()[1] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);

    const viaS = new QuantumRegister(1);
    viaS.apply('h', 0);
    viaS.apply('t', 0);
    viaS.apply('t', 0);
    viaS.apply('t', 0);
    viaS.apply('t', 0); // T^4 = Z
    viaS.apply('h', 0);
    expect(Math.abs((viaS.probabilities()[1] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
  });

  test('rx(pi) and ry(pi) act as X on probabilities; Y flips |0>', () => {
    for (const gate of ['rx', 'ry'] as const) {
      const reg = new QuantumRegister(2);
      reg.apply(gate, 1, undefined, Math.PI);
      const p = reg.probabilities();
      expect(Math.abs((p[2] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
    }
    const reg = new QuantumRegister(1);
    reg.apply('y', 0);
    expect(Math.abs((reg.probabilities()[1] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
  });

  test('diagonal gates (z, s, t, rz, cz) never change basis probabilities', () => {
    const reg = new QuantumRegister(3);
    scramble(reg);
    const before = Array.from(reg.probabilities());
    reg.apply('z', 0);
    reg.apply('s', 1);
    reg.apply('t', 2);
    reg.apply('rz', 0, undefined, 2.345);
    reg.apply('cz', 2, 1);
    const after = reg.probabilities();
    for (let i = 0; i < before.length; i++) {
      expect(Math.abs((after[i] ?? 0) - (before[i] ?? 0))).toBeLessThan(EPS_UNITARY);
    }
  });

  test('CX flips the target only when the control is set', () => {
    const reg = new QuantumRegister(2);
    reg.apply('cx', 1, 0); // control |0> — nothing happens
    expect(Math.abs((reg.probabilities()[0] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
    reg.apply('x', 0); // |01> = index 1
    reg.apply('cx', 1, 0); // control set — flip target → |11> = index 3
    expect(Math.abs((reg.probabilities()[3] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
  });

  test('SWAP exchanges qubits: |01> becomes |10>', () => {
    const reg = new QuantumRegister(2);
    reg.apply('x', 0); // index 1
    reg.apply('swap', 0, 1); // → index 2
    const p = reg.probabilities();
    expect(Math.abs((p[2] ?? 0) - 1)).toBeLessThan(EPS_UNITARY);
    expect(Math.abs(p[1] ?? 0)).toBeLessThan(EPS_UNITARY);
  });

  test('argument validation: bad targets, missing control, missing theta', () => {
    const reg = new QuantumRegister(3);
    expect(() => reg.apply('h', 3)).toThrow(RangeError);
    expect(() => reg.apply('h', -1)).toThrow(RangeError);
    expect(() => reg.apply('h', 1.5)).toThrow(RangeError);
    expect(() => reg.apply('cx', 0)).toThrow(TypeError);
    expect(() => reg.apply('cx', 0, 0)).toThrow(RangeError);
    expect(() => reg.apply('swap', 1, 3)).toThrow(RangeError);
    expect(() => reg.apply('rx', 0)).toThrow(TypeError);
    expect(() => reg.apply('rz', 0, undefined, Number.NaN)).toThrow(TypeError);
  });
});

describe('QuantumRegister Bell pair (H + CX entanglement)', () => {
  test('probabilities split 0.5/0.5 between |00> and |11>', () => {
    const reg = new QuantumRegister(2);
    reg.apply('h', 0);
    reg.apply('cx', 1, 0);
    const p = reg.probabilities();
    expect(Math.abs((p[0] ?? 0) - 0.5)).toBeLessThan(EPS_UNITARY);
    expect(Math.abs(p[1] ?? 0)).toBeLessThan(EPS_UNITARY);
    expect(Math.abs(p[2] ?? 0)).toBeLessThan(EPS_UNITARY);
    expect(Math.abs((p[3] ?? 0) - 0.5)).toBeLessThan(EPS_UNITARY);
  });

  test('entropy is exactly 1 bit — 0.5 normalized over the 2-qubit (2-bit) maximum', () => {
    const reg = new QuantumRegister(2);
    reg.apply('h', 0);
    reg.apply('cx', 1, 0);
    expect(Math.abs(reg.entropy() - 0.5)).toBeLessThan(EPS_UNITARY);
  });

  test('measurement lands only on |00> or |11> and collapses the register', () => {
    for (const seed of [1, 2, 3, 4, 5, 99, 12345]) {
      const reg = new QuantumRegister(2);
      reg.apply('h', 0);
      reg.apply('cx', 1, 0);
      const outcome = reg.measure(mulberry32(seed));
      expect(outcome === 0 || outcome === 3).toBeTrue();
      const p = reg.probabilities();
      expect(p[outcome]).toBe(1);
      expect(reg.entropy()).toBe(0);
    }
  });
});

describe('QuantumRegister measurement determinism (contract rule 7)', () => {
  test('same seed, same circuit, same outcome — and one rng draw per measure', () => {
    const make = (): QuantumRegister => {
      const reg = new QuantumRegister(5);
      scramble(reg);
      reg.apply('h', 3);
      reg.apply('cx', 4, 3);
      return reg;
    };
    const rngA = mulberry32(0xc0ffee);
    const rngB = mulberry32(0xc0ffee);
    const a = make();
    const b = make();
    expect(a.measure(rngA)).toBe(b.measure(rngB));
    // Streams stayed in lockstep ⇒ measure consumed exactly the same number of draws.
    expect(rngA()).toBe(rngB());
  });

  test('reset() returns any state to |0...0>', () => {
    const reg = new QuantumRegister(4);
    scramble(reg);
    reg.reset();
    const p = reg.probabilities();
    expect(p[0]).toBe(1);
    expect(reg.entropy()).toBe(0);
  });
});

describe('QuantumRegister numerical hygiene', () => {
  test('probabilities sum to 1 within 1e-9 after a 300-gate seeded random circuit', () => {
    const gates: readonly GateName[] = [
      'h',
      'x',
      'y',
      'z',
      's',
      't',
      'rx',
      'ry',
      'rz',
      'cx',
      'cz',
      'swap',
    ];
    const reg = new QuantumRegister(5);
    const rng = mulberry32(0xbeef);
    for (let i = 0; i < 300; i++) {
      // Invariant: floor(rng()*len) ∈ [0, len) — always a valid index.
      const gate = gates[Math.floor(rng() * gates.length)]!;
      const target = Math.floor(rng() * 5);
      const control = (target + 1 + Math.floor(rng() * 4)) % 5; // always != target
      reg.apply(gate, target, control, rng() * Math.PI * 2);
    }
    const p = reg.probabilities();
    let sum = 0;
    for (let i = 0; i < p.length; i++) sum += p[i] ?? 0;
    expect(Math.abs(sum - 1)).toBeLessThan(EPS_NORM);
  });

  test('probabilities() returns the same reused buffer every call', () => {
    const reg = new QuantumRegister(3);
    expect(reg.probabilities()).toBe(reg.probabilities());
  });

  test('entropy() does not invalidate the probabilities() buffer', () => {
    const reg = new QuantumRegister(3);
    scramble(reg);
    const p = reg.probabilities();
    const snapshot = Array.from(p);
    reg.entropy();
    for (let i = 0; i < snapshot.length; i++) {
      expect(p[i]).toBe(snapshot[i] ?? -1);
    }
  });
});

describe('QuantumCircuitSystem', () => {
  const AETHON: PuppetEvent = { name: 'AETHON', action: 'stokes the chaos' };
  const SELENE: PuppetEvent = { name: 'SELENE', action: 'shifts to RAIN' };
  const KRONOS: PuppetEvent = { name: 'KRONOS', action: 'reshapes 12 organisms' };

  test('starts un-collapsed with zero entropy and a 32-entry reused band buffer', () => {
    const sys = new QuantumCircuitSystem(makeCtx(7, 2));
    expect(sys.lastCollapse).toBe(-1);
    expect(sys.entropy).toBe(0);
    const bands = sys.bands();
    expect(bands.length).toBe(32);
    expect(sys.bands()).toBe(bands); // reused buffer, not a fresh allocation
  });

  test('band hues are always in [0, 1)', () => {
    const sys = new QuantumCircuitSystem(makeCtx(11, 9.5));
    sys.onPuppetEvent(SELENE);
    sys.onPuppetEvent(AETHON);
    for (let i = 0; i < 20; i++) sys.update();
    const bands = sys.bands();
    for (let i = 0; i < bands.length; i++) {
      const h = bands[i] ?? -1;
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
  });

  test('puppet events build superposition: entropy rises after SELENE (H gate)', () => {
    const sys = new QuantumCircuitSystem(makeCtx(3, 1));
    sys.onPuppetEvent(SELENE);
    sys.update(); // update() refreshes the cached entropy
    expect(sys.entropy).toBeGreaterThan(0);
  });

  test('measures on every 8th update and exposes the collapse index', () => {
    const sys = new QuantumCircuitSystem(makeCtx(21, 5));
    sys.onPuppetEvent(SELENE);
    sys.onPuppetEvent(AETHON);
    for (let i = 0; i < 7; i++) sys.update();
    expect(sys.lastCollapse).toBe(-1);
    sys.update(); // 8th
    expect(sys.lastCollapse).toBeGreaterThanOrEqual(0);
    expect(sys.lastCollapse).toBeLessThan(32);
  });

  test('full event/update replay is deterministic for the same seed and chaos', () => {
    const drive = (seed: number, chaos: number) => {
      const sys = new QuantumCircuitSystem(makeCtx(seed, chaos));
      sys.onPuppetEvent(SELENE);
      sys.onPuppetEvent(AETHON);
      sys.onSortSwap(4, 9);
      sys.onPuppetEvent(KRONOS);
      sys.onSortSwap(7, 7); // colliding qubits exercise the nudge-apart path
      for (let i = 0; i < 16; i++) sys.update(); // two measurement collapses
      return { entropy: sys.entropy, collapse: sys.lastCollapse, bands: Array.from(sys.bands()) };
    };
    expect(drive(42, 3)).toEqual(drive(42, 3));
  });

  test('chaos feeds the gates: different chaos diverges the band spectrum', () => {
    const drive = (chaos: number) => {
      const sys = new QuantumCircuitSystem(makeCtx(42, chaos));
      sys.onPuppetEvent(AETHON); // rx(chaos·π/4) — chaos-dependent
      for (let i = 0; i < 4; i++) sys.update(); // ry drift is chaos-dependent too
      return Array.from(sys.bands());
    };
    expect(drive(0.5)).not.toEqual(drive(3));
  });

  test('accepts an injected register and degrades two-qubit sequences at width 1', () => {
    const sys = new QuantumCircuitSystem(makeCtx(5, 2), new QuantumRegister(1));
    sys.onPuppetEvent(SELENE); // h only — no cz partner exists
    sys.onPuppetEvent(KRONOS); // x only — no swap partner exists
    sys.onSortSwap(3, 8); // degenerates to x
    for (let i = 0; i < 9; i++) sys.update();
    const bands = sys.bands();
    expect(bands.length).toBe(32); // band count is fixed regardless of register width
    expect(sys.lastCollapse).toBeGreaterThanOrEqual(0);
    expect(sys.lastCollapse).toBeLessThan(2); // 1-qubit register has 2 basis states
  });

  test('unknown puppet names are ignored (register untouched)', () => {
    const touched = new QuantumCircuitSystem(makeCtx(1, 1));
    touched.onPuppetEvent({ name: 'NYARLATHOTEP', action: 'whispers' });
    const pristine = new QuantumCircuitSystem(makeCtx(1, 1));
    expect(touched.entropy).toBe(0);
    expect(touched.lastCollapse).toBe(-1);
    expect(Array.from(touched.bands())).toEqual(Array.from(pristine.bands()));
  });
});
