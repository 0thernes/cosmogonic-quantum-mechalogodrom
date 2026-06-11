/**
 * AnalyticsSystem experiments (CONTRACTS V2). Falsifiable claims:
 * - regression slope sign AND exact per-minute magnitude on synthetic ramps,
 * - a step impulse fires exactly one omen per 30 s sim-time window (rate
 *   limited by `state.elapsed`, never wall clocks),
 * - the ring buffers are pre-allocated 120-sample Float64Arrays, never replaced.
 */
import { describe, expect, test } from 'bun:test';
import { AnalyticsSystem } from '../src/sim/analytics';
import { mulberry32 } from '../src/math/rng';
import type { AuditTrail } from '../src/logging/audit';
import type { QualityProfile, SimContext, SimState } from '../src/types';

/** Records audit calls for assertions; cast to AuditTrail to satisfy SimContext. */
class AuditStub {
  readonly calls: { action: string; detail: Record<string, unknown> | undefined }[] = [];

  record(action: string, detail?: Record<string, unknown>): void {
    this.calls.push({ action, detail });
  }

  omens(): number {
    return this.calls.filter((c) => c.action === 'omen').length;
  }
}

/** World pushes one analytics sample every 8th frame at the 60 Hz reference rate. */
const SAMPLE_DT = 8 / 60;

interface Fixture {
  ctx: SimContext;
  state: SimState;
  audit: AuditStub;
}

/** Minimal fake SimContext: analytics touches only `state` and `audit`. */
function makeFixture(): Fixture {
  const audit = new AuditStub();
  const state: SimState = {
    chaos: 1,
    mutations: 0,
    timeScale: 1,
    wireframe: false,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 0, z: 0 },
    viewIdx: 0,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    frame: 0,
    elapsed: 0,
  };
  const quality: QualityProfile = {
    tier: 'laptop' as const,
    isMobile: false,
    instanced: false,
    dprCap: 2,
    maxEntities: 650,
    quantumCount: 1500,
    maxLinks: 4000,
    shadows: true,
    starCount: 3000,
  };
  const ctx: SimContext = {
    scene: null as unknown as SimContext['scene'],
    quality,
    rng: mulberry32(42),
    grid: null as unknown as SimContext['grid'],
    morphs: [],
    geos: [],
    state,
    audit: audit as unknown as AuditTrail,
    sfx: () => {},
  };
  return { ctx, state, audit };
}

/** Advance sim time by one push cadence, then record a sample. */
function pushSample(
  sys: AnalyticsSystem,
  state: SimState,
  population: number,
  energy = 50,
  links = 12,
): void {
  state.elapsed += SAMPLE_DT;
  sys.push(population, energy, links);
}

describe('AnalyticsSystem', () => {
  test('trend stays 0 until at least two samples exist', () => {
    const { ctx, state } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    sys.analyze();
    expect(sys.trendPerMin).toBe(0);
    pushSample(sys, state, 100);
    sys.analyze();
    expect(sys.trendPerMin).toBe(0);
  });

  test('rising population ramp ⇒ positive slope at the exact per-minute rate', () => {
    const { ctx, state } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    for (let j = 0; j < 60; j++) {
      pushSample(sys, state, 100 + 2 * j);
    }
    sys.analyze();
    // +2 per sample, one sample per 8/60 s ⇒ +15/s ⇒ +900/min.
    expect(sys.trendPerMin).toBeGreaterThan(0);
    expect(sys.trendPerMin).toBeCloseTo(900, 4);
  });

  test('falling population ramp ⇒ negative slope at the exact per-minute rate', () => {
    const { ctx, state } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    for (let j = 0; j < 60; j++) {
      pushSample(sys, state, 400 - 2 * j);
    }
    sys.analyze();
    expect(sys.trendPerMin).toBeLessThan(0);
    expect(sys.trendPerMin).toBeCloseTo(-900, 4);
  });

  test('flat population ⇒ ~zero slope and zero omens', () => {
    const { ctx, state, audit } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    for (let j = 0; j < 60; j++) {
      pushSample(sys, state, 333);
    }
    sys.analyze();
    expect(sys.trendPerMin).toBeCloseTo(0, 6);
    expect(audit.omens()).toBe(0);
  });

  test('window slides: only the newest 120 samples drive the trend', () => {
    const { ctx, state } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    for (let j = 0; j < 120; j++) {
      pushSample(sys, state, 100); // old flat era — must be fully evicted
    }
    for (let j = 0; j < 120; j++) {
      pushSample(sys, state, 100 + j); // new ramp era fills the whole ring
    }
    sys.analyze();
    // +1 per sample ⇒ +7.5/s ⇒ +450/min; exact only if the flat era is gone.
    expect(sys.trendPerMin).toBeCloseTo(450, 4);
  });

  test('step impulse ⇒ omen fires once, suppressed within 30 s, refires after', () => {
    const { ctx, state, audit } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    for (let j = 0; j < 40; j++) {
      pushSample(sys, state, 100);
    }
    sys.analyze();
    expect(audit.omens()).toBe(0); // flat window: no outliers

    pushSample(sys, state, 500); // step impulse
    sys.analyze();
    expect(audit.omens()).toBe(1);

    sys.analyze(); // same anomalous window, still inside the cooldown
    expect(audit.omens()).toBe(1);

    pushSample(sys, state, 500); // second impulse, still inside the cooldown
    sys.analyze();
    expect(audit.omens()).toBe(1);

    state.elapsed += 31; // sim-time (not wall-clock) cooldown expiry
    sys.analyze();
    expect(audit.omens()).toBe(2);

    const omen = audit.calls.find((c) => c.action === 'omen');
    expect(omen?.detail).toBeDefined();
    expect(typeof omen?.detail?.z).toBe('number');
    expect(Math.abs(omen?.detail?.z as number)).toBeGreaterThan(2.5);
    expect(omen?.detail?.energyMean).toBe(50); // sibling rings feed the omen
    expect(omen?.detail?.linksMean).toBe(12);
  });

  test('anomaly screening waits for a minimum window (boot transients are not portents)', () => {
    const { ctx, state, audit } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    for (let j = 0; j < 10; j++) {
      pushSample(sys, state, 100);
    }
    pushSample(sys, state, 500);
    sys.analyze();
    expect(audit.omens()).toBe(0); // < 30 samples: suppressed
  });

  test('nameOmen names omen records with a monotonic index (audit fix C)', () => {
    const { ctx, state, audit } = makeFixture();
    const seen: number[] = [];
    const sys = new AnalyticsSystem(ctx, (i) => {
      seen.push(i);
      return `OMEN-${i}`;
    });
    for (let j = 0; j < 40; j++) {
      pushSample(sys, state, 100);
    }
    pushSample(sys, state, 500); // step impulse
    sys.analyze();
    expect(audit.omens()).toBe(1);
    state.elapsed += 31; // cooldown expiry; window still anomalous
    sys.analyze();
    expect(audit.omens()).toBe(2);
    const names = audit.calls.filter((c) => c.action === 'omen').map((c) => c.detail?.name);
    expect(names).toEqual(['OMEN-0', 'OMEN-1']);
    expect(seen).toEqual([0, 1]); // namer called once per RECORDED omen, not per analyze()
  });

  test('omen detail shape is unchanged when nameOmen is absent', () => {
    const { ctx, state, audit } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    for (let j = 0; j < 40; j++) {
      pushSample(sys, state, 100);
    }
    pushSample(sys, state, 500);
    sys.analyze();
    const omen = audit.calls.find((c) => c.action === 'omen');
    expect(omen?.detail).toBeDefined();
    expect(omen !== undefined && omen.detail !== undefined && 'name' in omen.detail).toBe(false);
  });

  test('rings are pre-allocated 120-sample Float64Arrays and never replaced', () => {
    const { ctx, state } = makeFixture();
    const sys = new AnalyticsSystem(ctx);
    const internals = sys as unknown as {
      population: Float64Array;
      energy: Float64Array;
      links: Float64Array;
      times: Float64Array;
    };
    for (const ring of [internals.population, internals.energy, internals.links, internals.times]) {
      expect(ring).toBeInstanceOf(Float64Array);
      expect(ring.length).toBe(120);
    }
    const before = internals.population;
    for (let j = 0; j < 500; j++) {
      pushSample(sys, state, j);
    }
    sys.analyze();
    expect(internals.population).toBe(before); // same object: ring reused, not regrown
    expect(internals.population.length).toBe(120);
  });
});
