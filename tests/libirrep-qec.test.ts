/**
 * Deterministic QEC acceptance tests for the rotated planar surface code
 * [[d², 1, d]] and its MWPM decoder (src/sim/libirrep-qec.ts).
 *
 * Falsifiable, closed-form assertions:
 *  - zero error ⇒ zero syndrome;
 *  - syndrome = H_Z · e (mod 2) matches a hand-computed plaquette parity;
 *  - EVERY weight-1 X-error on d=3 is corrected (logical Z preserved);
 *  - a documented fraction of weight-2 errors is corrected;
 *  - determinism: same input ⇒ identical output.
 */
import { describe, expect, test } from 'bun:test';
import {
  buildSurfaceCode,
  surfaceCodeXSyndrome,
  surfaceCodeSyndrome,
  mwpmDecode,
  bpOsdDecode,
  toricCodeSyndrome,
  logicalPreserved,
  qecDecodingProxy,
} from '../src/sim/libirrep-qec';

describe('rotated surface code structure', () => {
  test('d=3 has 9 data qubits and CSS-orthogonal checks (H_X · H_Zᵀ = 0)', () => {
    const code = buildSurfaceCode(3);
    expect(code.nQubits).toBe(9);
    expect(code.distance).toBe(3);
    // Every X-stabilizer overlaps every Z-stabilizer on an even number of
    // qubits (CSS orthogonality — the defining surface-code property).
    for (const xr of code.hX) {
      const xset = new Set(xr);
      for (const zr of code.hZ) {
        let overlap = 0;
        for (const q of zr) if (xset.has(q)) overlap++;
        expect(overlap % 2).toBe(0);
      }
    }
  });

  test('logical operators have weight d and anticommute', () => {
    const code = buildSurfaceCode(3);
    expect(code.logicalZ.length).toBe(3);
    expect(code.logicalX.length).toBe(3);
    // L_X (col 0) and L_Z (row 0) share exactly qubit 0 ⇒ symplectic product 1.
    const zset = new Set(code.logicalZ);
    let overlap = 0;
    for (const q of code.logicalX) if (zset.has(q)) overlap++;
    expect(overlap % 2).toBe(1);
  });
});

describe('syndrome = H·e (mod 2)', () => {
  test('zero error ⇒ zero syndrome', () => {
    const code = buildSurfaceCode(3);
    const s = surfaceCodeXSyndrome(code, new Uint8Array(code.nQubits));
    expect(Array.from(s.checks).every((b) => b === 0)).toBe(true);
  });

  test('single X-error fires exactly the Z-checks containing that qubit', () => {
    const code = buildSurfaceCode(3);
    for (let q = 0; q < code.nQubits; q++) {
      const e = new Uint8Array(code.nQubits);
      e[q] = 1;
      const s = surfaceCodeXSyndrome(code, e);
      // Closed form: check i fires iff qubit q ∈ row i.
      for (let i = 0; i < code.hZ.length; i++) {
        const expected = code.hZ[i]!.includes(q) ? 1 : 0;
        expect(s.checks[i]).toBe(expected);
      }
    }
  });

  test('surfaceCodeSyndrome legacy entry agrees with symplectic product', () => {
    const code = buildSurfaceCode(3);
    const lat = new Uint8Array(9);
    lat[4] = 1; // center qubit
    const a = surfaceCodeSyndrome(lat, 3, 3);
    const b = surfaceCodeXSyndrome(code, lat);
    expect(Array.from(a.checks)).toEqual(Array.from(b.checks));
  });
});

describe('MWPM decoder corrects errors', () => {
  test('EVERY weight-1 X-error on d=3 is corrected (logical preserved)', () => {
    const code = buildSurfaceCode(3);
    for (let q = 0; q < code.nQubits; q++) {
      const e = new Uint8Array(code.nQubits);
      e[q] = 1;
      const s = surfaceCodeXSyndrome(code, e);
      const dec = mwpmDecode(s.checks, 3);
      const residual = new Uint8Array(code.nQubits);
      for (let i = 0; i < code.nQubits; i++) residual[i] = (e[i]! ^ dec.error[i]!) & 1;
      // (1) correction reproduces the syndrome, (2) no logical flip.
      const rs = surfaceCodeXSyndrome(code, residual);
      expect(Array.from(rs.checks).every((b) => b === 0)).toBe(true);
      expect(logicalPreserved(code, residual)).toBe(true);
    }
  });

  test('decoder correction always reproduces the syndrome (valid coset)', () => {
    const code = buildSurfaceCode(3);
    // Enumerate all weight-2 errors; correction must always satisfy syndrome.
    for (let i = 0; i < code.nQubits; i++) {
      for (let j = i + 1; j < code.nQubits; j++) {
        const e = new Uint8Array(code.nQubits);
        e[i] = 1;
        e[j] = 1;
        const s = surfaceCodeXSyndrome(code, e);
        const dec = mwpmDecode(s.checks, 3);
        const residual = new Uint8Array(code.nQubits);
        for (let q = 0; q < code.nQubits; q++) residual[q] = (e[q]! ^ dec.error[q]!) & 1;
        const rs = surfaceCodeXSyndrome(code, residual);
        expect(Array.from(rs.checks).every((b) => b === 0)).toBe(true);
      }
    }
  });

  test('a documented fraction of weight-2 errors is corrected (d=3)', () => {
    const code = buildSurfaceCode(3);
    let total = 0;
    let corrected = 0;
    for (let i = 0; i < code.nQubits; i++) {
      for (let j = i + 1; j < code.nQubits; j++) {
        const e = new Uint8Array(code.nQubits);
        e[i] = 1;
        e[j] = 1;
        const s = surfaceCodeXSyndrome(code, e);
        const dec = mwpmDecode(s.checks, 3);
        const residual = new Uint8Array(code.nQubits);
        for (let q = 0; q < code.nQubits; q++) residual[q] = (e[q]! ^ dec.error[q]!) & 1;
        total++;
        if (logicalPreserved(code, residual)) corrected++;
      }
    }
    // d=3 guarantees correction up to floor((d-1)/2)=1 error. Weight-2 errors
    // are at the code's correction boundary: by design a fraction lie on / push
    // a logical chain and are uncorrectable. The DECODER is exact-MWPM, so this
    // fraction is a deterministic property of the code, not a tunable. Measured:
    // exactly 18 of the 36 weight-2 X-error patterns on d=3 are corrected.
    expect(total).toBe(36);
    expect(corrected).toBe(18);
  });
});

describe('distance argument is load-bearing', () => {
  test('d=5 corrects EVERY weight-1 AND EVERY weight-2 X-error', () => {
    const code = buildSurfaceCode(5);
    const check = (e: Uint8Array): boolean => {
      const s = surfaceCodeXSyndrome(code, e);
      const dec = mwpmDecode(s.checks, 5);
      const residual = new Uint8Array(code.nQubits);
      for (let q = 0; q < code.nQubits; q++) residual[q] = (e[q]! ^ dec.error[q]!) & 1;
      const rs = surfaceCodeXSyndrome(code, residual);
      const validCoset = Array.from(rs.checks).every((b) => b === 0);
      return validCoset && logicalPreserved(code, residual);
    };
    for (let i = 0; i < code.nQubits; i++) {
      const e1 = new Uint8Array(code.nQubits);
      e1[i] = 1;
      expect(check(e1)).toBe(true); // weight-1: always (d=5 ⇒ t=2)
      for (let j = i + 1; j < code.nQubits; j++) {
        const e2 = new Uint8Array(code.nQubits);
        e2[i] = 1;
        e2[j] = 1;
        expect(check(e2)).toBe(true); // weight-2: always (within t=2)
      }
    }
  });
});

describe('determinism (Manhattan law: no RNG / Date.now)', () => {
  test('same syndrome ⇒ identical decode, twice', () => {
    const code = buildSurfaceCode(5);
    const e = new Uint8Array(code.nQubits);
    e[7] = 1;
    e[13] = 1;
    const s = surfaceCodeXSyndrome(code, e);
    const a = mwpmDecode(s.checks, 5);
    const b = mwpmDecode(s.checks, 5);
    expect(Array.from(a.error)).toEqual(Array.from(b.error));
    expect(a.confidence).toBe(b.confidence);
  });

  test('qecDecodingProxy is deterministic and uses the distance argument', () => {
    const a = qecDecodingProxy(3, 5);
    const b = qecDecodingProxy(3, 5);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
    // Distance is load-bearing: zero weight ⇒ perfect stability.
    expect(qecDecodingProxy(0, 5)).toBe(1.0);
    // Larger distance tolerates the same defect load with >= stability.
    expect(qecDecodingProxy(2, 7)).toBeGreaterThanOrEqual(qecDecodingProxy(2, 3));
  });

  test('bpOsdDecode delegates to the real decoder', () => {
    const code = buildSurfaceCode(3);
    const e = new Uint8Array(code.nQubits);
    e[4] = 1;
    const s = surfaceCodeXSyndrome(code, e);
    const dec = bpOsdDecode(s.checks, 10, 3);
    const residual = new Uint8Array(code.nQubits);
    for (let i = 0; i < code.nQubits; i++) residual[i] = (e[i]! ^ dec.error[i]!) & 1;
    expect(logicalPreserved(code, residual)).toBe(true);
  });
});

describe('toric syndrome (periodic parity)', () => {
  test('zero error ⇒ zero syndrome; single error fires checks', () => {
    const s0 = toricCodeSyndrome(new Uint8Array(9), 3, 3);
    expect(Array.from(s0.checks).every((b) => b === 0)).toBe(true);
    const lat = new Uint8Array(9);
    lat[0] = 1;
    const s1 = toricCodeSyndrome(lat, 3, 3);
    // Qubit 0 participates in plaquettes whose corner set includes it.
    expect(Array.from(s1.checks).some((b) => b === 1)).toBe(true);
  });
});
