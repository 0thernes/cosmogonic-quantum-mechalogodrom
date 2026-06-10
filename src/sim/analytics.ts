/**
 * Rolling-window telemetry science (CONTRACTS V2 — analytics writer).
 *
 * Three pre-allocated 120-sample ring buffers (population / energy / links)
 * are fed every 8th frame by world.ts alongside the telemetry snapshot. Every
 * 60 frames, {@link AnalyticsSystem.analyze} fits a linear regression
 * (simple-statistics) to the population window and publishes the slope per
 * minute of sim time (`TelemetrySnapshot.trend`); the latest population sample
 * is screened against the window mean/stddev, and |z| > 2.5 outliers land in
 * the audit trail as `omen` entries, rate-limited to one per 30 s of sim time
 * (`SimState.elapsed`) — wall clocks are banned in sim logic.
 *
 * Allocation discipline (contract rule 5): the rings, the regression pairs,
 * and the point/value buffers are constructed once and reused forever.
 * `push()` is allocation-free; the only steady-state allocations are the
 * `{ m, b }` result object inside simple-statistics' `linearRegression` (one
 * per analyze(), i.e. one per second — off the per-frame path) and the omen
 * detail object (bounded by the 30 s rate limit).
 */
import { linearRegression, mean, standardDeviation, zScore } from 'simple-statistics';
import type { SimContext } from '../types';

/** Ring capacity: 120 samples ≈ 16 s of history at the 8-frame push cadence (60 Hz). */
const WINDOW = 120;

/** |z| beyond which the latest population sample is recorded as an omen. */
const Z_THRESHOLD = 2.5;

/** Minimum sim-seconds (`state.elapsed`) between omen records — never wall clocks. */
const OMEN_COOLDOWN_S = 30;

/**
 * Anomaly screening waits for this many samples (~4 s at the push cadence) so
 * boot transients and post-reset refills do not read as portents.
 */
const ANOMALY_MIN_SAMPLES = 30;

/** The regression x-axis is sim seconds; the published trend is per minute. */
const SEC_PER_MIN = 60;

/** Round to 2 decimals for the audit feed; the analysis itself stays full-precision. O(1). */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Rolling-window statistics over the live telemetry stream.
 *
 * Reads `SimState.elapsed` plus the population/energy/link counts the world
 * derives from EntityManager and Connectome; writes population anomalies into
 * `SimContext.audit` (philosophy rule 4: reads one system, writes another).
 *
 * Wiring (world.ts): `push(entities, energy, links)` every 8th frame with the
 * telemetry snapshot; `analyze()` every 60 frames; `trendPerMin` feeds
 * `TelemetrySnapshot.trend`.
 */
export class AnalyticsSystem {
  private readonly ctx: SimContext;

  /** Pre-allocated sample rings — never replaced (proved in tests/analytics.test.ts). */
  private readonly population = new Float64Array(WINDOW);
  private readonly energy = new Float64Array(WINDOW);
  private readonly links = new Float64Array(WINDOW);
  /** Sim time (`state.elapsed`, seconds) of each sample — the regression x-axis. */
  private readonly times = new Float64Array(WINDOW);

  /** Next ring write slot. */
  private head = 0;
  /** Filled sample count, saturating at {@link WINDOW}. */
  private count = 0;

  /** Last published population slope, per minute of sim time. */
  private trend = 0;

  /** Sim time of the last omen record; -Infinity ⇒ never recorded. */
  private lastOmenAt = Number.NEGATIVE_INFINITY;

  /**
   * Reused regression buffers (contract rule 5): `pairs` holds WINDOW [x, y]
   * tuples constructed once in the constructor; `points` and `values` are
   * reused arrays whose lengths are clamped to the live sample count on each
   * analyze() pass and refilled with references into `pairs`.
   */
  private readonly pairs: [number, number][] = [];
  private readonly points: [number, number][] = [];
  private readonly values: number[] = [];

  /** Stores the context and pre-allocates all buffers. O(WINDOW), once. */
  constructor(ctx: SimContext) {
    this.ctx = ctx;
    for (let i = 0; i < WINDOW; i++) {
      this.pairs.push([0, 0]);
    }
  }

  /**
   * Population slope per minute of sim time from the last {@link analyze}
   * pass; 0 until at least two samples have been analyzed. O(1).
   */
  get trendPerMin(): number {
    return this.trend;
  }

  /**
   * Record one telemetry sample (population, energy, link count), stamped with
   * the current sim time. Called by world.ts every 8th frame. O(1),
   * allocation-free: four typed-array writes and two index updates.
   */
  push(population: number, energy: number, links: number): void {
    const h = this.head;
    this.population[h] = population;
    this.energy[h] = energy;
    this.links[h] = links;
    this.times[h] = this.ctx.state.elapsed;
    this.head = (h + 1) % WINDOW;
    if (this.count < WINDOW) {
      this.count++;
    }
  }

  /**
   * Window statistics pass, called by world.ts every 60 frames.
   *
   * Fits `population ~ simTime` over the ring (oldest → newest) via
   * simple-statistics `linearRegression` and publishes the slope as
   * {@link trendPerMin}. Once the window holds {@link ANOMALY_MIN_SAMPLES},
   * the latest population sample is z-scored against the window; |z| > 2.5
   * records an `omen` audit entry (with window stats from all three rings),
   * at most once per {@link OMEN_COOLDOWN_S} seconds of sim time.
   *
   * O(w) where w = filled samples (≤ 120). No-op below two samples; a
   * zero-variance (flat) window has no outliers and a degenerate (zero-span)
   * time axis leaves the previous trend in place.
   */
  analyze(): void {
    const n = this.count;
    if (n < 2) {
      return;
    }
    const start = (this.head - n + WINDOW) % WINDOW;
    // Invariant: start indexes the oldest filled slot (n ≤ count ⇒ written).
    const t0 = this.times[start]!;
    this.points.length = n;
    this.values.length = n;
    for (let j = 0; j < n; j++) {
      const idx = (start + j) % WINDOW;
      // Invariant: j < n ≤ WINDOW, so the pair was pre-allocated in the constructor.
      const pair = this.pairs[j]!;
      // Invariant: idx ∈ [0, WINDOW) and inside the filled region of the ring.
      pair[0] = this.times[idx]! - t0; // x shifted to the window origin (slope-invariant, better conditioning)
      pair[1] = this.population[idx]!;
      this.points[j] = pair;
      this.values[j] = pair[1];
    }
    const fit = linearRegression(this.points);
    if (Number.isFinite(fit.m)) {
      this.trend = fit.m * SEC_PER_MIN;
    }

    if (n < ANOMALY_MIN_SAMPLES) {
      return;
    }
    const mu = mean(this.values);
    const sd = standardDeviation(this.values);
    if (sd <= 0) {
      return; // perfectly flat window: no outliers, and z is undefined.
    }
    // Invariant: n ≥ 2, so the newest value slot is filled.
    const latest = this.values[n - 1]!;
    const z = zScore(latest, mu, sd);
    if (Math.abs(z) <= Z_THRESHOLD) {
      return;
    }
    const now = this.ctx.state.elapsed;
    if (now - this.lastOmenAt < OMEN_COOLDOWN_S) {
      return; // rate limit: at most one omen per 30 s of sim time.
    }
    this.lastOmenAt = now;
    // Window means of the sibling rings make the omen self-describing (rare path).
    let energySum = 0;
    let linksSum = 0;
    for (let j = 0; j < n; j++) {
      const idx = (start + j) % WINDOW;
      // Invariant: idx is inside the filled region of the ring (as above).
      energySum += this.energy[idx]!;
      linksSum += this.links[idx]!;
    }
    this.ctx.audit.record('omen', {
      z: round2(z),
      population: latest,
      mean: round2(mu),
      stddev: round2(sd),
      trendPerMin: round2(this.trend),
      energyMean: round2(energySum / n),
      linksMean: round2(linksSum / n),
      elapsed: round2(now),
    });
  }
}
