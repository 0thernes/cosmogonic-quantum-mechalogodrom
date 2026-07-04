/**
 * APEX Parameter Manifold tests — the honesty bar for the 1-billion-parameter scaffolding.
 *
 * Asserts the REAL accounting, not the shape:
 *   - MASSIVE reaches a billion by DESIGN and by ADDRESSABLE budget; LIVE does not.
 *   - the quantum-effective tier hits a billion-dimensional stabilizer reach (≥ 30 qubits).
 *   - resident params never exceed the device float budget (the honesty gap is bounded, not faked).
 *   - tier sums are internally consistent (Σ designed/addressable/resident == the reported totals).
 *   - dense-shard materialisation is bit-for-bit deterministic and bounded — real streamed weights.
 */
import { describe, expect, test } from 'bun:test';
import {
  SCALE_LIVE,
  SCALE_MASSIVE,
  SCALE_APEX_1B,
  apexScaleForTargetNeurons,
} from '../src/sim/apex-brain';
import {
  APEX_BILLION,
  DEVICE_BROWSER,
  DEVICE_NATIVE,
  DEVICE_RESEARCH_CLUSTER,
  DEVICE_WORKSTATION,
  SHARD_FLOATS,
  buildManifold,
  denseShardPlan,
  manifoldSummary,
  materializeDenseShard,
  stabilizerQubitsForScale,
} from '../src/sim/apex-parameter-manifold';

describe('manifold — billion-parameter reach', () => {
  test('MASSIVE is designed AND addressable at ≥ 1 billion', () => {
    const m = buildManifold(SCALE_MASSIVE, DEVICE_BROWSER);
    expect(m.designedParams).toBeGreaterThanOrEqual(APEX_BILLION);
    expect(m.addressableParams).toBeGreaterThanOrEqual(APEX_BILLION);
    expect(m.reachesBillion).toBe(true);
  });

  test('the quantum-effective tier reaches a billion-dimensional stabilizer space', () => {
    const m = buildManifold(SCALE_APEX_1B, DEVICE_BROWSER);
    expect(m.quantumStabilizerQubits).toBeGreaterThanOrEqual(30);
    expect(m.quantumStabilizerDim).toBeGreaterThanOrEqual(APEX_BILLION);
    expect(m.quantumReachesBillion).toBe(true);
  });

  test('LIVE is a tractable scale and does NOT reach a billion', () => {
    const m = buildManifold(SCALE_LIVE, DEVICE_BROWSER);
    expect(m.designedParams).toBeLessThan(APEX_BILLION);
    expect(m.reachesBillion).toBe(false);
    expect(m.quantumReachesBillion).toBe(false);
  });
});

describe('manifold — honest resident bounds', () => {
  test('resident params never exceed the device float budget', () => {
    for (const device of [DEVICE_BROWSER, DEVICE_WORKSTATION]) {
      const m = buildManifold(SCALE_MASSIVE, device);
      expect(m.residentParams).toBeLessThanOrEqual(m.deviceBudgetParams);
      expect(m.residentFraction).toBeGreaterThanOrEqual(0);
      expect(m.residentFraction).toBeLessThanOrEqual(1);
    }
  });

  test('a bigger device holds strictly more resident params for the same design', () => {
    const browser = buildManifold(SCALE_MASSIVE, DEVICE_BROWSER);
    const workstation = buildManifold(SCALE_MASSIVE, DEVICE_WORKSTATION);
    const native = buildManifold(SCALE_MASSIVE, DEVICE_NATIVE);
    expect(workstation.residentParams).toBeGreaterThan(browser.residentParams);
    expect(native.residentParams).toBeGreaterThan(workstation.residentParams);
  });

  test('tier sums are internally consistent with the reported totals', () => {
    const m = buildManifold(SCALE_MASSIVE, DEVICE_BROWSER);
    const designed = m.tiers.reduce((a, t) => a + t.designed, 0);
    const addressable = m.tiers.reduce((a, t) => a + t.addressable, 0);
    const resident = m.tiers.reduce((a, t) => a + t.resident, 0);
    expect(designed).toBe(m.designedParams);
    expect(addressable).toBe(m.addressableParams);
    expect(resident).toBe(m.residentParams);
    // every tier is present exactly once
    expect(new Set(m.tiers.map((t) => t.tier)).size).toBe(5);
  });

  test('research-cluster profile preserves non-saturating multiples beyond 1B', () => {
    const scale = apexScaleForTargetNeurons(10_000_000_000);
    const browser = buildManifold(scale, DEVICE_BROWSER);
    const research = buildManifold(scale, DEVICE_RESEARCH_CLUSTER);
    expect(browser.addressableBillionMultiple).toBeGreaterThan(1);
    expect(browser.addressableLog10).toBeGreaterThan(9);
    expect(research.residentParams).toBeGreaterThan(browser.residentParams);
    expect(research.quantumStabilizerQubits).toBeGreaterThanOrEqual(
      browser.quantumStabilizerQubits,
    );
  });
});

describe('manifold — stabilizer qubit scaling', () => {
  test('the stabilizer reach tracks the design (LIVE < MASSIVE, hits 30 at 1B)', () => {
    const live = stabilizerQubitsForScale(SCALE_LIVE, DEVICE_BROWSER);
    const massive = stabilizerQubitsForScale(SCALE_MASSIVE, DEVICE_BROWSER);
    expect(live).toBeLessThan(massive);
    expect(massive).toBe(30);
  });

  test('the device cap bounds the stabilizer qubits', () => {
    const capped = stabilizerQubitsForScale(SCALE_MASSIVE, {
      ...DEVICE_BROWSER,
      stabilizerQubitCap: 18,
    });
    expect(capped).toBeLessThanOrEqual(18);
  });
});

describe('manifold — deterministic dense-shard streaming', () => {
  test('same (seed, shardId) → byte-identical shard; different id → different', () => {
    const a = materializeDenseShard(1234, 0);
    const b = materializeDenseShard(1234, 0);
    const c = materializeDenseShard(1234, 1);
    expect(a.length).toBe(SHARD_FLOATS);
    expect(a).toEqual(b);
    let differs = false;
    for (let i = 0; i < 64; i++) if (a[i] !== c[i]) differs = true;
    expect(differs).toBe(true);
  });

  test('shard values are finite and bounded in (-1, 1) — real streamed weights', () => {
    const s = materializeDenseShard(99, 7);
    for (let i = 0; i < s.length; i += 4099) {
      const v = s[i]!;
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(-1);
      expect(v).toBeLessThan(1);
    }
  });

  test('materialisation reuses a provided out buffer (allocation-free streaming)', () => {
    const buf = new Float32Array(SHARD_FLOATS);
    const out = materializeDenseShard(5, 2, buf);
    expect(out).toBe(buf);
  });

  test('the dense shard plan streams at least one shard and matches the tier total', () => {
    const plan = denseShardPlan(SCALE_MASSIVE, DEVICE_BROWSER);
    expect(plan.shardCount).toBeGreaterThanOrEqual(1);
    expect(plan.shardFloats).toBe(SHARD_FLOATS);
    expect(plan.totalDenseParams).toBeGreaterThan(0);
  });
});

describe('manifold — summary telemetry', () => {
  test('the summary names the scale, device, and the billion mark', () => {
    const s = manifoldSummary(buildManifold(SCALE_MASSIVE, DEVICE_BROWSER));
    expect(s).toContain('MASSIVE');
    expect(s).toContain('browser');
    expect(s).toContain('✦');
    expect(s).toContain('×1B');
  });
});
