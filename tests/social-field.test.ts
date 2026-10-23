/**
 * Social field (src/sim/social-field.ts) + its worker-core executor (src/core/social-scan-pool.ts),
 * ADR 0019. The claims under test:
 *
 * 1. The kernel is a pure function of the packed snapshot: any split of the organisms into ranges,
 *    run in any order, gives bit-identical answers. That is what lets it use every core.
 * 2. Unbounded, it is exact against a brute-force scan; bounded, it never reads more than `budget`
 *    candidates per organism.
 * 3. The worker wire format round-trips exactly and rejects malformed jobs/replies.
 * 4. In a seeded world, answering the field with worker cores — on time, late, or never — leaves every
 *    organism's position bit-identical. Worlds of ≤ 2,000 organisms never use the field at all.
 * 5. Shared memory (phase 2): cores claim ranges atomically and answer in place; the owner never
 *    writes into a field a core may still write (it moves to fresh buffers instead of waiting), and
 *    the seeded world stays bit-identical under on-time, late, stalled and retired shared cores.
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { mulberry32 } from '../src/math/rng';
import { SpatialHash } from '../src/math/spatial-hash';
import { GRID_CELL, ULTRA_GRID_CELL } from '../src/sim/constants';
import { createGeometryCache } from '../src/sim/geometry-cache';
import { createMorphotypes } from '../src/sim/morphotypes';
import { createPhyla } from '../src/sim/phyla';
import { EntityManager } from '../src/sim/entities';
import { LoreEngine } from '../src/sim/lore';
import { getQuantizationConfig } from '../src/math/quantization';
import {
  allocSocialField,
  buildSocialGrid,
  copySocialInputs,
  copySocialSnapshot,
  isSharedSocialField,
  isSocialScanJob,
  isSocialScanOutputs,
  isSocialSharedInit,
  isSocialSharedJob,
  runSocialScanJob,
  runSocialSharedJob,
  scanSocialRange,
  sharedWord,
  writeSocialOutputs,
  SHARED_DONE,
  SHARED_FREE,
  SHARED_MAX_BOUND,
  SHARED_QUEUED,
  SHARED_RUNNING,
  SOCIAL_NEAREST,
  type SocialFieldBuffers,
  type SocialFieldParams,
  type SocialScanExecutor,
  type SocialScanJob,
  type SocialSharedCore,
  type SocialSharedInit,
  type SocialSharedJob,
  type SocialSharedOutcome,
} from '../src/sim/social-field';
import {
  SharedSocialScanPool,
  SocialScanPool,
  canShareSocialField,
  createSocialScanPool,
  formatSocialCompute,
  socialWorkerCount,
  type SocialWorkerLike,
} from '../src/core/social-scan-pool';
import { formatComputeLine, EMPTY_WORLD } from '../src/ui/perf-hud';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const P: SocialFieldParams = { radius: 32, budget: 64, cell: 16, extent: 812.5 };

function randomField(
  n: number,
  seed: number,
  p = P,
  spread = 120,
  make?: (bytes: number) => ArrayBufferLike,
): SocialFieldBuffers {
  const f = allocSocialField(n, p, make);
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const c = i % 9;
    f.px[i] = Math.cos(c) * 200 + (r() - 0.5) * spread;
    f.py[i] = (r() - 0.5) * 20;
    f.pz[i] = Math.sin(c) * 200 + (r() - 0.5) * spread;
    f.group[i] = i % 5;
    f.type[i] = i % 11;
    f.energy[i] = r() * 100;
    f.alive[i] = r() < 0.97 ? 1 : 0;
    f.hostile[i] = r() < 0.1 ? 1 : 0;
    f.shelter[i] = r() < 0.05 ? 1 : 0;
  }
  f.n = n;
  buildSocialGrid(f, p);
  return f;
}

const RESULT_KEYS = [
  'near',
  'nearD2',
  'kin',
  'kinD2',
  'sameType',
  'sameTypeD2',
  'fedKin',
  'fedKinEnergy',
  'count',
  'kinCount',
  'threatX',
  'threatZ',
  'threatCount',
] as const;

function results(f: SocialFieldBuffers): number[][] {
  return RESULT_KEYS.map((k) => {
    const len = k === 'near' || k === 'nearD2' ? f.n * SOCIAL_NEAREST : f.n;
    return Array.from(f[k].subarray(0, len));
  });
}

function cloneInputs(f: SocialFieldBuffers, p = P): SocialFieldBuffers {
  const g = allocSocialField(f.n, p);
  const s = copySocialInputs(f, p);
  g.n = s.n;
  for (const k of [
    'px',
    'py',
    'pz',
    'group',
    'type',
    'energy',
    'alive',
    'hostile',
    'shelter',
    'cellStart',
    'cellItems',
  ] as const)
    (g[k] as Float32Array).set(s[k] as Float32Array);
  return g;
}

describe('social field kernel', () => {
  test('any split into ranges, in any order, gives bit-identical answers', () => {
    const a = randomField(3000, 7);
    scanSocialRange(a, P, 0, a.n);
    const b = cloneInputs(a);
    const cuts = [0, 1, 517, 518, 1999, 2400, 3000];
    for (let k = cuts.length - 2; k >= 0; k--) scanSocialRange(b, P, cuts[k]!, cuts[k + 1]!);
    expect(results(b)).toEqual(results(a));
  });

  test('unbounded scan equals a brute-force neighbourhood', () => {
    const p = { ...P, budget: 1_000_000 };
    const f = randomField(500, 11, p, 400);
    scanSocialRange(f, p, 0, f.n);
    const r2 = p.radius * p.radius;
    for (let i = 0; i < f.n; i += 7) {
      let n = 0;
      let kn = 0;
      let tn = 0;
      let best = Infinity;
      let kinBest = Infinity;
      let fedE = -Infinity;
      for (let j = 0; j < f.n; j++) {
        if (j === i || f.alive[j] !== 1) continue;
        const dx = f.px[j]! - f.px[i]!;
        const dy = f.py[j]! - f.py[i]!;
        const dz = f.pz[j]! - f.pz[i]!;
        const dd = dx * dx + dz * dz;
        if (dd >= r2 || dd < 1e-8) continue;
        const d3 = dd + dy * dy;
        n++;
        best = Math.min(best, d3);
        if (f.group[j] === f.group[i]) {
          kn++;
          kinBest = Math.min(kinBest, d3);
          fedE = Math.max(fedE, f.energy[j]!);
        }
        const threat =
          f.shelter[i] !== 1 &&
          f.shelter[j] !== 1 &&
          (f.hostile[j] === 1 || f.group[j] !== f.group[i]) &&
          dd < r2 * 0.25;
        if (threat) tn++;
      }
      expect(f.count[i]).toBe(n);
      expect(f.kinCount[i]).toBe(kn);
      expect(f.threatCount[i]).toBe(tn);
      expect(f.nearD2[i * SOCIAL_NEAREST]).toBe(Math.fround(best));
      expect(f.kinD2[i]).toBe(Math.fround(kinBest));
      expect(f.fedKinEnergy[i]).toBe(Math.fround(fedE));
    }
  });

  test('a bounded scan reads at most `budget` candidates per organism', () => {
    const p = { ...P, budget: 16 };
    const f = randomField(4000, 3, p, 40); // very dense: every cell overflows the budget
    scanSocialRange(f, p, 0, f.n);
    for (let i = 0; i < f.n; i++) expect(f.count[i]!).toBeLessThanOrEqual(16);
    expect(Math.max(...Array.from(f.count.subarray(0, f.n)))).toBe(16);
  });
});

describe('worker wire format', () => {
  test('job → answers → write-back reproduces the direct scan exactly', () => {
    const a = randomField(2500, 5);
    scanSocialRange(a, P, 0, a.n);
    const b = cloneInputs(a);
    const inputs = copySocialInputs(b, P);
    let scratch: SocialFieldBuffers | null = null;
    for (const [from, to] of [
      [1250, 2500],
      [0, 1250],
    ] as const) {
      const job: SocialScanJob = { ticket: 1, from, to, params: P, inputs };
      expect(isSocialScanJob(job)).toBe(true);
      const run = runSocialScanJob(job, scratch);
      scratch = run.scratch;
      expect(isSocialScanOutputs(run.out, to - from)).toBe(true);
      writeSocialOutputs(b, from, run.out);
    }
    expect(results(b)).toEqual(results(a));
  });

  test('malformed jobs and replies are rejected at the boundary', () => {
    const f = randomField(100, 9);
    const inputs = copySocialInputs(f, P);
    const ok: SocialScanJob = { ticket: 1, from: 0, to: 100, params: P, inputs };
    expect(isSocialScanJob(ok)).toBe(true);
    expect(isSocialScanJob({ ...ok, to: 101 })).toBe(false);
    expect(isSocialScanJob({ ...ok, from: 60, to: 50 })).toBe(false);
    expect(isSocialScanJob({ ...ok, params: { ...P, budget: 1.5 } })).toBe(false);
    const badItems = { ...inputs, cellItems: inputs.cellItems.slice() };
    badItems.cellItems[3] = 100; // out of range index
    expect(isSocialScanJob({ ...ok, inputs: badItems })).toBe(false);
    expect(isSocialScanJob({ ...ok, inputs: { ...inputs, px: inputs.px.slice(1) } })).toBe(false);
    expect(isSocialScanJob(null)).toBe(false);
    const out = runSocialScanJob(ok).out;
    expect(isSocialScanOutputs(out, 100)).toBe(true);
    expect(isSocialScanOutputs(out, 99)).toBe(false);
    expect(isSocialScanOutputs({ ...out, kin: new Float32Array(100) }, 100)).toBe(false);
  });
});

/** In-process worker double: queues jobs, answers them with the real kernel on `deliver()`. */
class FakeWorker implements SocialWorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  queue: SocialScanJob[] = [];
  postMessage(job: SocialScanJob): void {
    this.queue.push(structuredClone(job));
  }
  terminate(): void {
    this.terminated = true;
  }
  deliver(tamper?: (reply: Record<string, unknown>) => void): void {
    for (const job of this.queue.splice(0)) {
      const reply: Record<string, unknown> = {
        ticket: job.ticket,
        from: job.from,
        to: job.to,
        ok: true,
        out: runSocialScanJob(job).out,
      };
      tamper?.(reply);
      this.onmessage?.({ data: structuredClone(reply) } as MessageEvent<unknown>);
    }
  }
}

describe('SocialScanPool', () => {
  const make = (n: number): { pool: SocialScanPool; workers: FakeWorker[] } => {
    const workers: FakeWorker[] = [];
    const pool = new SocialScanPool(n, () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    return { pool, workers };
  };

  test('answers on time are copied in and equal a main-thread scan', () => {
    const a = randomField(3000, 21);
    const b = cloneInputs(a);
    scanSocialRange(a, P, 0, a.n);
    const { pool, workers } = make(3);
    pool.dispatch(b, P, 6);
    pool.dispatch(b, P, 7);
    expect(pool.collect(b, 6)).toBe(false); // nothing back yet → caller scans itself
    for (const w of workers) w.deliver();
    expect(pool.collect(b, 7)).toBe(true);
    expect(results(b)).toEqual(results(a));
    expect(pool.collect(b, 7)).toBe(false); // answers are consumed once
    expect(pool.stats()).toMatchObject({
      workers: 3,
      dispatched: 2,
      served: 1,
      late: 2,
      retired: false,
    });
  });

  test('a core holds at most two snapshots; a third is skipped, not queued', () => {
    const f = randomField(2100, 2);
    const { pool, workers } = make(2);
    pool.dispatch(f, P, 1);
    pool.dispatch(f, P, 2);
    pool.dispatch(f, P, 3); // both cores already hold two snapshots
    expect(pool.stats().skippedBusy).toBe(1);
    expect(workers[0]!.queue).toHaveLength(2);
    for (const w of workers) w.deliver();
    expect(pool.collect(f, 3)).toBe(false); // never dispatched
    expect(pool.collect(f, 1)).toBe(false); // superseded by the ticket-3 collect above
    pool.dispatch(f, P, 4);
    for (const w of workers) w.deliver();
    expect(pool.collect(f, 4)).toBe(true);
  });

  test('a malformed or misranged reply retires the pool; the main thread takes over', () => {
    for (const tamper of [
      (r: Record<string, unknown>) => (r.from = (r.from as number) + 1),
      (r: Record<string, unknown>) => (r.out = { ...(r.out as object), count: new Int32Array(1) }),
      (r: Record<string, unknown>) => (r.ok = false),
    ]) {
      const f = randomField(2100, 4);
      const { pool, workers } = make(2);
      pool.dispatch(f, P, 1);
      workers[0]!.deliver(tamper);
      expect(pool.stats().retired).toBe(true);
      expect(workers.every((w) => w.terminated)).toBe(true);
      expect(pool.collect(f, 1)).toBe(false);
      pool.dispatch(f, P, 2);
      expect(workers[0]!.queue).toHaveLength(0);
    }
  });

  test('worker count leaves a core for the main thread and caps at 8', () => {
    expect(socialWorkerCount(undefined)).toBe(0);
    expect(socialWorkerCount(2)).toBe(0);
    expect(socialWorkerCount(4)).toBe(3);
    expect(socialWorkerCount(24)).toBe(8);
  });
});

function makeCtx(seed: number, maxEntities: number): SimContext {
  const rng = mulberry32(seed);
  const geos = createGeometryCache();
  const lore = new LoreEngine(seed);
  const phyla = createPhyla(rng, (i) => lore.name('tribe', i), geos.length);
  const morphs = createMorphotypes(rng, geos.length, phyla);
  const state: SimState = {
    chaos: 1.5,
    mutations: 0,
    timeScale: 1,
    renderMode: 'solid',
    sim: 1,
    weatherIdx: 0,
    temperature: 20,
    wind: { x: 1, z: 1 },
    viewIdx: 1,
    algoIdx: 0,
    songIdx: 0,
    algoStep: 0,
    algoMode: 'single',
    algoTimer: 0,
    frame: 0,
    elapsed: 0,
  };
  return {
    scene: new THREE.Scene(),
    quality: {
      tier: maxEntities > 5000 ? 'ultra' : 'desktop',
      isMobile: false,
      instanced: true,
      dprCap: 2,
      maxEntities,
      targetEntities: maxEntities,
      quantumCount: 10,
      maxLinks: maxEntities * 12,
      shadows: true,
      starCount: 10,
      quantization: getQuantizationConfig('ultra'),
      simRate: 15,
    },
    rng,
    grid: new SpatialHash<Entity>(maxEntities > 5000 ? ULTRA_GRID_CELL : GRID_CELL),
    morphs,
    geos,
    state,
    audit: { record: () => undefined, entries: () => [] } as unknown as AuditTrail,
    sfx: () => undefined,
  };
}

/** Run a seeded world and return every organism's final position as raw bits. */
function runWorld(
  pop: number,
  frames: number,
  executor: SocialScanExecutor | null,
  beforeUpdate?: (frame: number, em: EntityManager) => void,
  sanctuary?: (x: number, z: number) => boolean,
): {
  bits: number[];
  stats: { offloaded: number; local: number };
} {
  const ctx = makeCtx(0x5eed, pop);
  const em = new EntityManager(ctx);
  em.attachSocialScanner(executor);
  if (sanctuary) em.attachSanctuary(sanctuary);
  em.reset(pop);
  for (let f = 0; f < frames; f++) {
    ctx.state.frame++;
    ctx.state.elapsed += 1 / 60;
    if (ctx.state.frame % 2 === 0) {
      ctx.grid.clear();
      for (const e of em.list) ctx.grid.insert(e);
    }
    beforeUpdate?.(f, em);
    em.update(1 / 60, ctx.state.elapsed);
  }
  const pos = new Float64Array(em.list.length * 3);
  em.list.forEach((e, i) => {
    pos[i * 3] = e.position.x;
    pos[i * 3 + 1] = e.position.y;
    pos[i * 3 + 2] = e.position.z;
  });
  return {
    bits: Array.from(new Uint32Array(pos.buffer)),
    stats: { ...em.socialFieldStats() },
  };
}

/** Executor double: answers jobs in-process with an arbitrary range split; can be late on purpose. */
function syncExecutor(lateEvery: number): SocialScanExecutor {
  const pending = new Map<number, ReturnType<typeof copySocialInputs>>();
  let calls = 0;
  return {
    dispatch(f, p, ticket) {
      pending.set(ticket, copySocialInputs(f, p));
    },
    collect(f, ticket) {
      calls++;
      const inputs = pending.get(ticket);
      pending.delete(ticket);
      if (inputs === undefined || (lateEvery > 0 && calls % lateEvery === 0)) return false;
      const n = inputs.n;
      const cuts = [0, Math.floor(n / 3), Math.floor(n / 3) + 1, n];
      for (let k = cuts.length - 2; k >= 0; k--) {
        const job = { ticket, from: cuts[k]!, to: cuts[k + 1]!, params: P, inputs };
        writeSocialOutputs(f, job.from, runSocialScanJob(job).out);
      }
      return true;
    },
  };
}

describe('seeded world with worker cores', () => {
  test('on-time, sometimes-late and never-answering executors leave every position bit-identical', () => {
    const base = runWorld(2600, 24, null);
    expect(base.stats.local).toBeGreaterThan(0);
    const onTime = runWorld(2600, 24, syncExecutor(0));
    const flaky = runWorld(2600, 24, syncExecutor(3));
    const never = runWorld(2600, 24, { dispatch: () => undefined, collect: () => false });
    expect(onTime.stats.offloaded).toBeGreaterThan(20);
    expect(flaky.stats.local).toBeGreaterThan(5);
    expect(onTime.bits).toEqual(base.bits);
    expect(flaky.bits).toEqual(base.bits);
    expect(never.bits).toEqual(base.bits);
  }, 60_000);

  test('falsifier: an executor that corrupts its answers does change the world', () => {
    const exec = syncExecutor(0);
    const corrupt: SocialScanExecutor = {
      dispatch: (f, p, t) => exec.dispatch(f, p, t),
      collect: (f, t) => {
        const ok = exec.collect(f, t);
        if (ok) f.kin.fill(-1, 0, f.n); // drop every kin filament
        return ok;
      },
    };
    expect(runWorld(2600, 24, corrupt).bits).not.toEqual(runWorld(2600, 24, null).bits);
  }, 60_000);

  test('worlds at or below 2,000 organisms never touch the field', () => {
    const exec = syncExecutor(0);
    let dispatched = 0;
    const counting: SocialScanExecutor = {
      dispatch: (f, p, t) => {
        dispatched++;
        exec.dispatch(f, p, t);
      },
      collect: (f, t) => exec.collect(f, t),
    };
    const small = runWorld(1500, 12, counting);
    expect(dispatched).toBe(0);
    expect(small.stats).toEqual({ offloaded: 0, local: 0 });
    expect(small.bits).toEqual(runWorld(1500, 12, null).bits);
  }, 60_000);
});

describe('HUD social compute row', () => {
  test('reports worker cores and their measured share, appended to the ambient row', () => {
    expect(formatSocialCompute(0, NaN)).toBe('main thread');
    expect(formatSocialCompute(3, 0.964)).toBe('3 cores · 96% off-thread');
    expect(formatSocialCompute(3, NaN)).toBe('3 cores');
    const w = { ...EMPTY_WORLD, ambientCompute: 'CPU workers' };
    expect(formatComputeLine(w)).toBe('ambient: CPU workers · core brains: CPU');
    expect(formatComputeLine(w, formatSocialCompute(3, 1))).toBe(
      'ambient: CPU workers · social: 3 cores · 100% off-thread · core brains: CPU',
    );
    expect(formatSocialCompute(3, 0.5, true)).toBe('3 cores · shared memory · 50% off-thread');
    expect(formatSocialCompute(0, 0.5, true)).toBe('main thread');
  });
});

// ── Phase 2: shared memory ───────────────────────────────────────────────────────────────────────

const sab = (bytes: number): ArrayBufferLike => new SharedArrayBuffer(bytes);
const phase = (word: number): number => word & 3;

/**
 * What `postMessage` does to a shared-pool message: a new object graph whose typed arrays still view
 * the same SharedArrayBuffers. Built by hand because Bun 1.3.14's `structuredClone` copies a
 * SharedArrayBuffer into a plain ArrayBuffer, while its `postMessage` shares it.
 */
function cloneSharedMessage(message: SocialScanJob | SocialSharedInit | SocialSharedJob): unknown {
  if (!('kind' in message)) return structuredClone(message);
  if (message.kind === 'shared-init') return { ...message };
  const bind = message.bind;
  return {
    ...message,
    params: { ...message.params },
    ...(bind === undefined ? {} : { bind: { field: { ...bind.field }, control: bind.control } }),
  };
}

/**
 * In-process shared-memory core. Messages are cloned as `postMessage` clones them (SharedArrayBuffers
 * stay shared; see {@link cloneSharedMessage}), and `deliver()` runs the worker's own
 * {@link runSocialSharedJob}. `stall()` claims the next job's range and pauses mid-scan, like a core
 * the OS descheduled. While it holds the range it can `scribble()` garbage over it at any moment;
 * `finish()` completes the scan (optionally scribbling last) and publishes it DONE.
 */
class FakeSharedWorker implements SocialWorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  core: SocialSharedCore | null = null;
  queue: SocialSharedJob[] = [];
  outcomes: SocialSharedOutcome[] = [];
  postMessage(message: SocialScanJob | SocialSharedInit | SocialSharedJob): void {
    const m = cloneSharedMessage(message);
    if (isSocialSharedInit(m)) this.core = { core: m.core, progress: m.progress, bound: new Map() };
    else if (isSocialSharedJob(m)) this.queue.push(m);
    else throw new Error('a shared pool posted a non-shared message');
  }
  terminate(): void {
    this.terminated = true;
  }
  deliver(): void {
    for (const job of this.queue.splice(0)) this.outcomes.push(runSocialSharedJob(this.core!, job));
  }
  stall(): StalledCore {
    const job = this.queue.shift()!;
    const c = this.core!;
    if (job.bind !== undefined) {
      c.bound.delete(job.field);
      c.bound.set(job.field, job.bind);
      while (c.bound.size > SHARED_MAX_BOUND) c.bound.delete(c.bound.keys().next().value!);
    }
    const b = c.bound.get(job.field)!;
    const queued = sharedWord(job.ticket, SHARED_QUEUED);
    const running = sharedWord(job.ticket, SHARED_RUNNING);
    const claimed = Atomics.compareExchange(b.control, job.range, queued, running) === queued;
    const scribble = (): void => {
      if (!claimed) return;
      b.field.kin.fill(-1, job.from, job.to);
      b.field.count.fill(0, job.from, job.to);
      b.field.threatX.fill(1e6, job.from, job.to);
    };
    return {
      scribble,
      finish(last = false) {
        if (claimed) {
          scanSocialRange(b.field, job.params, job.from, job.to);
          if (last) scribble();
          Atomics.store(b.control, job.range, sharedWord(job.ticket, SHARED_DONE));
          Atomics.add(b.control, b.control.length - 1, 1);
        }
        Atomics.add(c.progress, c.core, 1);
      },
    };
  }
}

/** A core paused between claiming a range and publishing it. */
interface StalledCore {
  scribble(): void;
  finish(scribble?: boolean): void;
}

function sharedPool(n: number): { pool: SharedSocialScanPool; workers: FakeSharedWorker[] } {
  const workers: FakeSharedWorker[] = [];
  const pool = new SharedSocialScanPool(n, () => {
    const w = new FakeSharedWorker();
    workers.push(w);
    return w;
  });
  return { pool, workers };
}

/** The pool's control words for a field, read through a core's binding (range words, counter). */
function controlOf(w: FakeSharedWorker): Int32Array {
  return [...w.core!.bound.values()].at(-1)!.control;
}

describe('shared-memory protocol (core side)', () => {
  const setup = (): { f: SocialFieldBuffers; ref: SocialFieldBuffers; c: SocialSharedCore } => {
    const f = randomField(2400, 31, P, 120, sab);
    const ref = cloneInputs(f);
    scanSocialRange(ref, P, 0, ref.n);
    const c = { core: 0, progress: new Int32Array(sab(4)), bound: new Map() };
    return { f, ref, c };
  };
  const job = (f: SocialFieldBuffers, control: Int32Array, over: Partial<SocialSharedJob> = {}) =>
    ({
      kind: 'shared',
      ticket: 5,
      field: 1,
      range: 0,
      from: 0,
      to: f.n,
      n: f.n,
      params: P,
      bind: { field: f, control },
      ...over,
    }) as SocialSharedJob;

  test('a claimed range is answered in place, published DONE, counted, and equals a main scan', () => {
    const { f, ref, c } = setup();
    const control = new Int32Array(sab(8));
    control[0] = sharedWord(5, SHARED_QUEUED);
    f.kin.fill(-9);
    expect(runSocialSharedJob(c, job(f, control))).toBe('answered');
    expect(results(f)).toEqual(results(ref));
    expect(control[0]).toBe(sharedWord(5, SHARED_DONE));
    expect(control[1]).toBe(1);
    expect(c.progress[0]).toBe(1);
  });

  test('a range taken back, reassigned to a newer ticket, or already done is skipped untouched', () => {
    const { f, c } = setup();
    const control = new Int32Array(sab(8));
    f.kin.fill(-9);
    for (const word of [
      sharedWord(5, SHARED_FREE), // taken back by the owner
      sharedWord(7, SHARED_QUEUED), // stale job: the range now belongs to ticket 7
      sharedWord(5, SHARED_DONE),
      sharedWord(5, SHARED_RUNNING),
    ]) {
      control[0] = word;
      expect(runSocialSharedJob(c, job(f, control))).toBe('skipped');
      expect(control[0]).toBe(word);
    }
    expect(f.kin.every((v) => v === -9)).toBe(true);
    expect(control[1]).toBe(0);
    expect(c.progress[0]).toBe(4); // every job is counted as consumed, answered or not
  });

  test('a job for memory the core does not hold is invalid, never a write', () => {
    const { f, c } = setup();
    const control = new Int32Array(sab(8));
    control[0] = sharedWord(5, SHARED_QUEUED);
    expect(runSocialSharedJob(c, job(f, control, { bind: undefined }))).toBe('invalid');
    expect(runSocialSharedJob(c, job(f, control, { range: 1 }))).toBe('invalid'); // no such word
    expect(runSocialSharedJob(c, job(f, control, { n: f.px.length + 1, to: 0 }))).toBe('invalid');
    expect(control[0]).toBe(sharedWord(5, SHARED_QUEUED));
  });

  test('a core keeps at most SHARED_MAX_BOUND fields, evicting the oldest binding', () => {
    const { f, c } = setup();
    for (let id = 1; id <= SHARED_MAX_BOUND + 2; id++)
      runSocialSharedJob(c, job(f, new Int32Array(sab(8)), { field: id }));
    expect([...c.bound.keys()]).toEqual([3, 4, 5, 6]);
  });

  test('malformed shared messages are rejected at the boundary', () => {
    const f = randomField(100, 9, P, 120, sab);
    const control = new Int32Array(sab(8));
    const ok = job(f, control);
    expect(isSocialSharedJob(ok)).toBe(true);
    expect(isSocialSharedJob({ ...ok, bind: undefined })).toBe(true);
    expect(isSocialSharedJob({ ...ok, to: f.n + 1 })).toBe(false);
    expect(isSocialSharedJob({ ...ok, from: 60, to: 50 })).toBe(false);
    expect(isSocialSharedJob({ ...ok, range: -1 })).toBe(false);
    expect(isSocialSharedJob({ ...ok, params: { ...P, budget: 1.5 } })).toBe(false);
    expect(isSocialSharedJob({ ...ok, kind: 'copy' })).toBe(false);
    const plain = allocSocialField(100, P); // ArrayBuffer-backed: cores cannot share it
    expect(isSocialSharedJob({ ...ok, bind: { field: plain, control } })).toBe(false);
    expect(isSocialSharedJob({ ...ok, bind: { field: f, control: new Int32Array(2) } })).toBe(
      false,
    );
    const short = { ...f, kin: new Int32Array(sab(4 * 99)) };
    expect(isSocialSharedJob({ ...ok, bind: { field: short, control } })).toBe(false);
    const progress = new Int32Array(sab(8));
    expect(isSocialSharedInit({ kind: 'shared-init', core: 1, progress })).toBe(true);
    expect(isSocialSharedInit({ kind: 'shared-init', core: 2, progress })).toBe(false);
    expect(isSocialSharedInit({ kind: 'shared-init', core: 0, progress: new Int32Array(2) })).toBe(
      false,
    );
    expect(isSocialSharedJob(null)).toBe(false);
    expect(isSharedSocialField(f)).toBe(true);
    expect(isSharedSocialField(plain)).toBe(false);
  });
});

describe('SharedSocialScanPool', () => {
  test('answers written in place are collected from the counter, once, and equal a main scan', () => {
    const { pool, workers } = sharedPool(3);
    const f = randomField(3000, 21, P, 120, (b) => pool.makeBuffer(b));
    const ref = cloneInputs(f);
    scanSocialRange(ref, P, 0, ref.n);
    expect(pool.reclaim(f)).toBe(true);
    pool.dispatch(f, P, 6);
    expect(workers.map((w) => w.queue[0]!.bind !== undefined)).toEqual([true, true, true]);
    for (const w of workers) w.deliver();
    expect(workers.flatMap((w) => w.outcomes)).toEqual(['answered', 'answered', 'answered']);
    expect(pool.collect(f, 6)).toBe(true);
    expect(results(f)).toEqual(results(ref));
    expect(pool.collect(f, 6)).toBe(false); // consumed once
    expect(pool.reclaim(f)).toBe(true);
    pool.dispatch(f, P, 8);
    expect(workers.every((w) => w.queue[0]!.bind === undefined)).toBe(true); // bound once per core
    expect(pool.stats()).toMatchObject({
      workers: 3,
      dispatched: 2,
      served: 1,
      late: 1,
      shared: true,
      retired: false,
    });
  });

  test('late: unstarted ranges are taken back, and a core that arrives afterwards writes nothing', () => {
    const { pool, workers } = sharedPool(3);
    const f = randomField(3000, 22, P, 120, (b) => pool.makeBuffer(b));
    pool.dispatch(f, P, 1);
    workers[0]!.deliver(); // one core on time, two late
    expect(pool.collect(f, 1)).toBe(false);
    const control = controlOf(workers[0]!);
    expect([0, 1, 2].map((k) => phase(control[k]!))).toEqual([
      SHARED_DONE,
      SHARED_FREE,
      SHARED_FREE,
    ]);
    expect(pool.reclaim(f)).toBe(true); // nobody is writing: the owner may scan in place
    const ref = cloneInputs(f);
    scanSocialRange(ref, P, 0, ref.n);
    scanSocialRange(f, P, 0, f.n); // the owner answers it itself
    workers[1]!.deliver();
    workers[2]!.deliver();
    expect(workers[1]!.outcomes).toEqual(['skipped']);
    expect(workers[2]!.outcomes).toEqual(['skipped']);
    expect(results(f)).toEqual(results(ref));
  });

  test('a late core never writes into memory the owner is using: the owner moves, never waits', () => {
    const { pool, workers } = sharedPool(3);
    const f = randomField(3000, 23, P, 120, (b) => pool.makeBuffer(b));
    const ref = cloneInputs(f);
    scanSocialRange(ref, P, 0, ref.n);
    pool.dispatch(f, P, 1);
    const late = workers[0]!.stall(); // claimed, mid-scan
    workers[1]!.deliver();
    workers[2]!.deliver();
    expect(pool.collect(f, 1)).toBe(false);
    expect(pool.reclaim(f)).toBe(false); // core 0 is still writing into f
    // What EntityManager does: answer a copy of the snapshot in fresh shared buffers.
    const g = copySocialSnapshot(
      f,
      allocSocialField(f.px.length, P, (b) => pool.makeBuffer(b)),
      P,
    );
    expect(pool.reclaim(g)).toBe(true);
    scanSocialRange(g, P, 0, g.n);
    late.finish(true); // the late core finally writes — garbage, even — into the old buffers
    expect(results(g)).toEqual(results(ref));
    expect(Array.from(f.kin.subarray(0, 10))).toEqual(Array.from({ length: 10 }, () => -1)); // it wrote to f
    expect(pool.reclaim(f)).toBe(true); // and f is reusable once it is done
  });

  test('a field with a running core is never re-dispatched', () => {
    const { pool, workers } = sharedPool(2);
    const f = randomField(2500, 24, P, 120, (b) => pool.makeBuffer(b));
    pool.dispatch(f, P, 1);
    const late = workers[0]!.stall();
    workers[1]!.deliver();
    pool.dispatch(f, P, 3);
    expect(workers[1]!.queue).toHaveLength(0);
    expect(pool.stats().dispatched).toBe(1);
    late.finish();
  });

  test('a core holding two unconsumed jobs makes the next dispatch skip, not queue', () => {
    const { pool, workers } = sharedPool(2);
    const a = randomField(2100, 25, P, 120, (b) => pool.makeBuffer(b));
    const b = randomField(2100, 26, P, 120, (b2) => pool.makeBuffer(b2));
    pool.dispatch(a, P, 1);
    pool.dispatch(b, P, 2);
    pool.dispatch(a, P, 3);
    expect(pool.stats().skippedBusy).toBe(1);
    expect(workers[0]!.queue).toHaveLength(2);
    for (const w of workers) w.deliver();
    expect(pool.collect(a, 3)).toBe(false); // never dispatched
    expect(pool.collect(b, 2)).toBe(true);
  });

  test('binding mirrors stay in step: an evicted field is re-bound, never referenced unbound', () => {
    const { pool, workers } = sharedPool(2);
    const make = (b: number): ArrayBufferLike => pool.makeBuffer(b);
    const fields = Array.from({ length: SHARED_MAX_BOUND + 2 }, (_, i) =>
      randomField(2100, 40 + i, P, 120, make),
    );
    let ticket = 1;
    for (const f of [...fields, fields[0]!, fields[1]!]) {
      pool.dispatch(f, P, ticket);
      for (const w of workers) w.deliver();
      expect(pool.collect(f, ticket++)).toBe(true);
    }
    expect(workers.flatMap((w) => w.outcomes).every((o) => o === 'answered')).toBe(true);
  });

  test('ArrayBuffer fields are not reclaimed or dispatched; after retirement any idle field is', () => {
    const { pool, workers } = sharedPool(2);
    const plain = randomField(2100, 27);
    expect(pool.reclaim(plain)).toBe(false); // the owner should move it into shared memory
    pool.dispatch(plain, P, 1);
    expect(workers[0]!.queue).toHaveLength(0);
    expect(pool.collect(plain, 1)).toBe(false);
    pool.dispose();
    expect(pool.reclaim(plain)).toBe(true);
  });

  test('any message from a core, or a worker error, retires the pool; running fields stay held', () => {
    for (const fail of [
      (w: FakeSharedWorker) => w.onmessage?.({ data: { ok: false } } as MessageEvent<unknown>),
      (w: FakeSharedWorker) => w.onerror?.({} as ErrorEvent),
    ]) {
      const { pool, workers } = sharedPool(2);
      const f = randomField(2100, 28, P, 120, (b) => pool.makeBuffer(b));
      pool.dispatch(f, P, 1);
      const late = workers[0]!.stall();
      fail(workers[1]!);
      expect(pool.stats()).toMatchObject({ retired: true, workers: 0 });
      expect(workers.every((w) => w.terminated)).toBe(true);
      expect(pool.collect(f, 1)).toBe(false);
      expect(pool.reclaim(f)).toBe(false); // a terminated core may still be mid-scan
      pool.dispatch(
        randomField(2100, 29, P, 120, (b) => pool.makeBuffer(b)),
        P,
        2,
      );
      expect(workers[1]!.queue).toHaveLength(1); // only the ticket-1 job; nothing new
      late.finish();
      expect(pool.reclaim(f)).toBe(true);
    }
  });

  test('the shared pool is chosen only on cross-origin isolated pages', () => {
    expect(canShareSocialField({ crossOriginIsolated: true, SharedArrayBuffer })).toBe(true);
    expect(canShareSocialField({ crossOriginIsolated: false, SharedArrayBuffer })).toBe(false);
    expect(canShareSocialField({ crossOriginIsolated: true })).toBe(false);
    const spawn = (): SocialWorkerLike => new FakeSharedWorker();
    expect(createSocialScanPool(1, spawn, true)).toBeInstanceOf(SharedSocialScanPool);
    expect(createSocialScanPool(1, () => new FakeWorker(), false)).toBeInstanceOf(SocialScanPool);
  });
});

describe('seeded world with shared-memory cores', () => {
  /** Shared pool of fake cores plus a per-frame schedule for what they do before each update. */
  const scheduled = (schedule: (frame: number, workers: FakeSharedWorker[]) => void) => {
    const { pool, workers } = sharedPool(3);
    return { pool, workers, before: (frame: number) => schedule(frame, workers) };
  };

  test('on-time, late and retired shared cores leave every position bit-identical', () => {
    const base = runWorld(2600, 24, null);
    const onTime = scheduled((_, ws) => ws.forEach((w) => w.deliver()));
    // Cores run only every third frame, so a third of the snapshots are late at collect time and
    // their jobs arrive afterwards, stale.
    const flaky = scheduled((frame, ws) => {
      if (frame % 3 === 0) ws.forEach((w) => w.deliver());
    });
    const retired = scheduled((frame, ws) => {
      if (frame === 10) ws[1]!.onerror?.({} as ErrorEvent);
      ws.forEach((w) => w.deliver());
    });
    const runs = {
      onTime: runWorld(2600, 24, onTime.pool, onTime.before),
      flaky: runWorld(2600, 24, flaky.pool, flaky.before),
      retired: runWorld(2600, 24, retired.pool, retired.before),
    };
    expect(runs.onTime.stats.offloaded).toBeGreaterThan(20);
    expect(runs.flaky.stats.local).toBeGreaterThan(5);
    expect(retired.pool.stats().retired).toBe(true);
    expect(flaky.workers.flatMap((w) => w.outcomes)).toContain('skipped');
    expect(onTime.workers.flatMap((w) => w.outcomes)).not.toContain('invalid');
    for (const run of Object.values(runs)) expect(run.bits).toEqual(base.bits);
  }, 120_000);

  /**
   * A core that stalls mid-scan and keeps writing garbage through the update that consumes its
   * snapshot — the race shared memory makes possible. The writes land from inside `update()` through
   * the sanctuary predicate (called while packing and before each organism reads the field), every
   * 64th call, and the core publishes at the start of the next frame.
   * `honest` = the real owner; with `reclaim` ignored (the falsifier) the garbage reaches the world.
   * `resetAt` resets the population on that frame, dropping the stalled core's ticket uncollected,
   * so the next pack must notice the core on its own.
   */
  function stalledWorld(honest: boolean, resetAt = -1): number[] {
    const { pool, workers } = sharedPool(3);
    const executor: SocialScanExecutor = honest
      ? pool
      : {
          dispatch: (f, p, t) => pool.dispatch(f, p, t),
          collect: (f, t) => pool.collect(f, t),
          makeBuffer: (b) => pool.makeBuffer(b),
        };
    let frameNow = -1;
    let calls = 0;
    const stalls: { frame: number; core: StalledCore }[] = [];
    const before = (frame: number, em: EntityManager): void => {
      frameNow = frame;
      for (let i = stalls.length - 1; i >= 0; i--)
        if (stalls[i]!.frame < frame) stalls.splice(i, 1)[0]!.core.finish(true);
      // Every fourth snapshot, core 0 claims its range and stalls through the update that
      // collects this snapshot (the next one).
      if (frame % 4 === 1 && workers[0]!.queue.length > 0)
        stalls.push({ frame: frame + 1, core: workers[0]!.stall() });
      workers.forEach((w) => w.deliver());
      if (frame === resetAt) em.reset(2600);
    };
    const duringUpdate = (): boolean => {
      if (++calls % 64 === 0) for (const s of stalls) if (s.frame === frameNow) s.core.scribble();
      return false;
    };
    return runWorld(2600, 24, executor, before, duringUpdate).bits;
  }

  test('a core that stalls and writes during a later update never changes the world', () => {
    const noop = (): boolean => false;
    const base = runWorld(2600, 24, null, undefined, noop).bits;
    expect(stalledWorld(true)).toEqual(base);
    // Falsifier: an owner that does not reclaim scans in memory the stalled core still holds.
    expect(stalledWorld(false)).not.toEqual(base);
    // Same race when the snapshot's ticket is dropped by a reset instead of collected.
    const reset = (frame: number, em: EntityManager): void => {
      if (frame === 9) em.reset(2600);
    };
    const resetBase = runWorld(2600, 24, null, reset, noop).bits;
    expect(stalledWorld(true, 9)).toEqual(resetBase);
    expect(stalledWorld(false, 9)).not.toEqual(resetBase);
  }, 120_000);
});
