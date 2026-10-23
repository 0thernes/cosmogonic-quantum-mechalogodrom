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
  isSocialScanJob,
  isSocialScanOutputs,
  runSocialScanJob,
  scanSocialRange,
  writeSocialOutputs,
  SOCIAL_NEAREST,
  type SocialFieldBuffers,
  type SocialFieldParams,
  type SocialScanExecutor,
  type SocialScanJob,
} from '../src/sim/social-field';
import {
  SocialScanPool,
  formatSocialCompute,
  socialWorkerCount,
  type SocialWorkerLike,
} from '../src/core/social-scan-pool';
import { formatComputeLine, EMPTY_WORLD } from '../src/ui/perf-hud';
import type { AuditTrail } from '../src/logging/audit';
import type { Entity, SimContext, SimState } from '../src/types';

const P: SocialFieldParams = { radius: 32, budget: 64, cell: 16, extent: 812.5 };

function randomField(n: number, seed: number, p = P, spread = 120): SocialFieldBuffers {
  const f = allocSocialField(n, p);
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
): {
  bits: number[];
  stats: { offloaded: number; local: number };
} {
  const ctx = makeCtx(0x5eed, pop);
  const em = new EntityManager(ctx);
  em.attachSocialScanner(executor);
  em.reset(pop);
  for (let f = 0; f < frames; f++) {
    ctx.state.frame++;
    ctx.state.elapsed += 1 / 60;
    if (ctx.state.frame % 2 === 0) {
      ctx.grid.clear();
      for (const e of em.list) ctx.grid.insert(e);
    }
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
  });
});
