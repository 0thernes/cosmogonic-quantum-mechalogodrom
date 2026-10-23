/**
 * SOCIAL FIELD — the organism social neighbourhood as a structure-of-arrays kernel.
 *
 * The ambient social pass (ADR 0016) needs, for every organism every frame: its three nearest
 * neighbours, its nearest kin, its nearest same-type organism, the best-fed kin, the neighbour and kin
 * counts and the summed direction of close hostile neighbours. Scanning three.js objects for that cost
 * ~60 ms per frame at 10,000 organisms, almost all of it megamorphic property reads on `userData`.
 *
 * Here the population is packed once per frame into flat typed arrays, bucketed by a counting-sort
 * grid, and answered by {@link scanSocialRange} — a pure function of the buffers. Because it reads
 * only the frame-start snapshot and writes only its own range of the result arrays, any number of
 * workers (or a GPU port) can run disjoint ranges and the answers are bit-identical to one thread
 * running them all. That is the determinism contract that lets the social pass use every core.
 *
 * The scan is bounded: candidates are read nearest grid cells first and stop at `budget`, each cell
 * read as a ring buffer from a per-organism salt so neighbours sample different colony members.
 * Pure leaf module: typed arrays and numbers only; no three.js, no rng, no clock.
 */

/** Result slots per organism for the three nearest neighbours. */
export const SOCIAL_NEAREST = 3;

/** All buffers of one social field. Every array is indexed by snapshot index (0..n-1). */
export interface SocialFieldBuffers {
  /** Organisms in the snapshot. */
  n: number;
  /** Snapshot positions. */
  px: Float32Array;
  py: Float32Array;
  pz: Float32Array;
  /** setGroup (tribe) and typeId per organism. */
  group: Int32Array;
  type: Int32Array;
  /** Energy (50 when the organism carries none). */
  energy: Float32Array;
  /** 1 = alive at snapshot time. */
  alive: Uint8Array;
  /** 1 = strategy 1 (hostile regardless of tribe). */
  hostile: Uint8Array;
  /** 1 = inside a sanctuary at snapshot time (never hostile, never threatened). */
  shelter: Uint8Array;
  /** Grid: organisms bucketed by cell (counting sort). `cellStart` has cells + 1 entries. */
  cellStart: Int32Array;
  cellItems: Int32Array;
  /** Per-cell fill cursor used while building the grid. */
  cellCursor: Int32Array;
  /** Results: nearest three (index or −1) and their squared 3D distances. */
  near: Int32Array;
  nearD2: Float32Array;
  kin: Int32Array;
  kinD2: Float32Array;
  sameType: Int32Array;
  sameTypeD2: Float32Array;
  fedKin: Int32Array;
  fedKinEnergy: Float32Array;
  count: Int32Array;
  kinCount: Int32Array;
  threatX: Float32Array;
  threatZ: Float32Array;
  threatCount: Int32Array;
}

/** Geometry and budget of the scan. Identical on every core that runs a range. */
export interface SocialFieldParams {
  /** Interaction radius (XZ). */
  radius: number;
  /** Max candidates read per organism (raw, before the distance filter). */
  budget: number;
  /** Grid cell size. */
  cell: number;
  /** Half-width of the gridded square; positions outside are clamped into border cells. */
  extent: number;
}

/** Cells per side of the field grid. */
export function gridDim(p: SocialFieldParams): number {
  return Math.max(1, Math.ceil((2 * p.extent) / p.cell));
}

function cellCoord(v: number, p: SocialFieldParams, dim: number): number {
  const c = Math.floor((v + p.extent) / p.cell);
  return c < 0 ? 0 : c >= dim ? dim - 1 : c;
}

/** Allocate buffers for up to `capacity` organisms (backed by `make`, e.g. SharedArrayBuffer). */
export function allocSocialField(
  capacity: number,
  p: SocialFieldParams,
  make: (bytes: number) => ArrayBufferLike = (b) => new ArrayBuffer(b),
): SocialFieldBuffers {
  const cells = gridDim(p) ** 2;
  const f32 = (len: number): Float32Array => new Float32Array(make(len * 4));
  const i32 = (len: number): Int32Array => new Int32Array(make(len * 4));
  const u8 = (len: number): Uint8Array => new Uint8Array(make(len));
  return {
    n: 0,
    px: f32(capacity),
    py: f32(capacity),
    pz: f32(capacity),
    group: i32(capacity),
    type: i32(capacity),
    energy: f32(capacity),
    alive: u8(capacity),
    hostile: u8(capacity),
    shelter: u8(capacity),
    cellStart: i32(cells + 1),
    cellItems: i32(capacity),
    cellCursor: i32(cells),
    near: i32(capacity * SOCIAL_NEAREST),
    nearD2: f32(capacity * SOCIAL_NEAREST),
    kin: i32(capacity),
    kinD2: f32(capacity),
    sameType: i32(capacity),
    sameTypeD2: f32(capacity),
    fedKin: i32(capacity),
    fedKinEnergy: f32(capacity),
    count: i32(capacity),
    kinCount: i32(capacity),
    threatX: f32(capacity),
    threatZ: f32(capacity),
    threatCount: i32(capacity),
  };
}

/**
 * Bucket the packed positions into the grid (counting sort, stable in snapshot order). Call after
 * the per-organism arrays are filled for indices 0..n-1. O(n + cells), allocation-free.
 */
export function buildSocialGrid(f: SocialFieldBuffers, p: SocialFieldParams): void {
  const dim = gridDim(p);
  const cells = dim * dim;
  const start = f.cellStart;
  const cursor = f.cellCursor;
  start.fill(0, 0, cells + 1);
  for (let i = 0; i < f.n; i++) {
    const c = cellCoord(f.px[i]!, p, dim) * dim + cellCoord(f.pz[i]!, p, dim);
    start[c + 1] = start[c + 1]! + 1;
  }
  for (let c = 0; c < cells; c++) start[c + 1] = start[c + 1]! + start[c]!;
  cursor.set(start.subarray(0, cells));
  for (let i = 0; i < f.n; i++) {
    const c = cellCoord(f.px[i]!, p, dim) * dim + cellCoord(f.pz[i]!, p, dim);
    f.cellItems[cursor[c]!] = i;
    cursor[c] = cursor[c]! + 1;
  }
}

/**
 * Answer the social neighbourhood of organisms `from..to-1` (pure; reads the snapshot, writes only
 * those organisms' result slots). Disjoint ranges may run on different cores.
 */
export function scanSocialRange(
  f: SocialFieldBuffers,
  p: SocialFieldParams,
  from: number,
  to: number,
): void {
  const dim = gridDim(p);
  const r2 = p.radius * p.radius;
  const threatR2 = r2 * 0.25;
  const cr = Math.ceil(p.radius / p.cell);
  const { px, py, pz, group, type, energy, alive, hostile, shelter, cellStart, cellItems } = f;
  for (let i = from; i < to; i++) {
    const x = px[i]!;
    const y = py[i]!;
    const z = pz[i]!;
    const myGroup = group[i]!;
    const myType = type[i]!;
    const protectedHere = shelter[i] === 1;
    let n = 0;
    let kn = 0;
    let tx = 0;
    let tz = 0;
    let tn = 0;
    let d0 = Infinity;
    let d1 = Infinity;
    let d2 = Infinity;
    let n0 = -1;
    let n1 = -1;
    let n2 = -1;
    let kin = -1;
    let kinD = Infinity;
    let st = -1;
    let stD = Infinity;
    let fed = -1;
    let fedE = -Infinity;
    let taken = 0;
    const salt = Math.imul(i, 0x9e3779b1) >>> 0;
    const ccx = cellCoord(x, p, dim);
    const ccz = cellCoord(z, p, dim);
    // Ring order: centre cell, then each square ring outward; edges in a fixed order.
    for (let k = 0; k <= cr && taken < p.budget; k++) {
      const side = k === 0 ? 1 : 8 * k;
      for (let s = 0; s < side && taken < p.budget; s++) {
        let dx = 0;
        let dz = 0;
        if (k > 0) {
          const edge = 2 * k;
          if (s < edge) {
            dx = -k + s;
            dz = -k;
          } else if (s < 2 * edge) {
            dx = k;
            dz = -k + (s - edge);
          } else if (s < 3 * edge) {
            dx = k - (s - 2 * edge);
            dz = k;
          } else {
            dx = -k;
            dz = k - (s - 3 * edge);
          }
        }
        const gx = ccx + dx;
        const gz = ccz + dz;
        if (gx < 0 || gz < 0 || gx >= dim || gz >= dim) continue;
        const c = gx * dim + gz;
        const a = cellStart[c]!;
        const len = cellStart[c + 1]! - a;
        if (len === 0) continue;
        let off = salt % len;
        for (let t = 0; t < len && taken < p.budget; t++) {
          const j = cellItems[a + off]!;
          off = off + 1 === len ? 0 : off + 1;
          taken++;
          if (j === i || alive[j] !== 1) continue;
          const ddx = px[j]! - x;
          const ddy = py[j]! - y;
          const ddz = pz[j]! - z;
          const dd = ddx * ddx + ddz * ddz;
          if (dd >= r2 || dd < 1e-8) continue;
          const d3 = dd + ddy * ddy;
          n++;
          if (d3 < d0) {
            d2 = d1;
            n2 = n1;
            d1 = d0;
            n1 = n0;
            d0 = d3;
            n0 = j;
          } else if (d3 < d1) {
            d2 = d1;
            n2 = n1;
            d1 = d3;
            n1 = j;
          } else if (d3 < d2) {
            d2 = d3;
            n2 = j;
          }
          const gj = group[j]!;
          if (gj === myGroup) {
            kn++;
            if (d3 < kinD) {
              kinD = d3;
              kin = j;
            }
            const e = energy[j]!;
            if (e > fedE) {
              fedE = e;
              fed = j;
            }
          }
          if (type[j] === myType && d3 < stD) {
            stD = d3;
            st = j;
          }
          if (
            !protectedHere &&
            shelter[j] !== 1 &&
            (hostile[j] === 1 || gj !== myGroup) &&
            dd < threatR2
          ) {
            tx += ddx;
            tz += ddz;
            tn++;
          }
        }
      }
    }
    const b = i * SOCIAL_NEAREST;
    f.near[b] = n0;
    f.near[b + 1] = n1;
    f.near[b + 2] = n2;
    f.nearD2[b] = d0;
    f.nearD2[b + 1] = d1;
    f.nearD2[b + 2] = d2;
    f.kin[i] = kin;
    f.kinD2[i] = kinD;
    f.sameType[i] = st;
    f.sameTypeD2[i] = stD;
    f.fedKin[i] = fed;
    f.fedKinEnergy[i] = fedE;
    f.count[i] = n;
    f.kinCount[i] = kn;
    f.threatX[i] = tx;
    f.threatZ[i] = tz;
    f.threatCount[i] = tn;
  }
}

// ── Executors: answering a packed field off this thread ──────────────────────────────────────────

/**
 * Something that can answer a packed field elsewhere (worker cores, later a GPU). The owner packs
 * a snapshot, calls {@link dispatch}, and a later update calls {@link collect}: true means every
 * organism's results are in the field; false means they were not ready and the owner runs
 * {@link scanSocialRange} itself. Either way the answers are the same, so an executor can change
 * how fast the world runs but never what happens in it.
 *
 * A shared-memory executor (phase 2) also provides {@link makeBuffer} and {@link reclaim}: its cores
 * read the snapshot and write their answers in the field's own memory, so before writing into a
 * field (packing it, or scanning it after a false collect) the owner asks {@link reclaim}. False
 * means a late core may still be writing answers there; the owner then moves to fresh buffers and
 * leaves the old ones to that core. The owner never waits for a core.
 */
export interface SocialScanExecutor {
  dispatch(f: SocialFieldBuffers, p: SocialFieldParams, ticket: number): void;
  collect(f: SocialFieldBuffers, ticket: number): boolean;
  /** Allocator for new fields (e.g. SharedArrayBuffer), so the cores can read them in place. */
  makeBuffer?(bytes: number): ArrayBufferLike;
  /**
   * Take `f` back for this thread to write: cancel any range no core has started. False if a core
   * is still writing into `f`, or `f` is not memory the cores can share.
   */
  reclaim?(f: SocialFieldBuffers): boolean;
}

/** The snapshot a scan job reads: input arrays trimmed to the `n` packed organisms. */
export interface SocialScanInputs {
  n: number;
  px: Float32Array;
  py: Float32Array;
  pz: Float32Array;
  group: Int32Array;
  type: Int32Array;
  energy: Float32Array;
  alive: Uint8Array;
  hostile: Uint8Array;
  shelter: Uint8Array;
  cellStart: Int32Array;
  cellItems: Int32Array;
}

/** One executor job: answer organisms `from..to-1` of a snapshot. */
export interface SocialScanJob {
  ticket: number;
  from: number;
  to: number;
  params: SocialFieldParams;
  inputs: SocialScanInputs;
}

/** A job's answers, each array covering only `from..to-1` (`near`/`nearD2` hold 3 per organism). */
export interface SocialScanOutputs {
  near: Int32Array;
  nearD2: Float32Array;
  kin: Int32Array;
  kinD2: Float32Array;
  sameType: Int32Array;
  sameTypeD2: Float32Array;
  fedKin: Int32Array;
  fedKinEnergy: Float32Array;
  count: Int32Array;
  kinCount: Int32Array;
  threatX: Float32Array;
  threatZ: Float32Array;
  threatCount: Int32Array;
}

const OUTPUT_KEYS = [
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
] as const satisfies readonly (keyof SocialScanOutputs)[];

/** Per-organism input arrays of a snapshot (the grid's `cellStart` is sized by cells instead). */
const SNAPSHOT_KEYS = [
  'px',
  'py',
  'pz',
  'group',
  'type',
  'energy',
  'alive',
  'hostile',
  'shelter',
  'cellItems',
] as const satisfies readonly (keyof SocialFieldBuffers)[];

/**
 * Copy `src`'s packed snapshot (inputs and grid, not answers) into `dst`, which must be at least as
 * large; returns `dst`. Reads only input arrays, which no core ever writes.
 */
export function copySocialSnapshot(
  src: SocialFieldBuffers,
  dst: SocialFieldBuffers,
  p: SocialFieldParams,
): SocialFieldBuffers {
  const n = src.n;
  dst.n = n;
  for (const k of SNAPSHOT_KEYS)
    (dst[k] as Float32Array).set((src[k] as Float32Array).subarray(0, n));
  dst.cellStart.set(src.cellStart.subarray(0, gridDim(p) ** 2 + 1));
  return dst;
}

/** Copy the packed snapshot out of a field (the field can then be repacked freely). */
export function copySocialInputs(f: SocialFieldBuffers, p: SocialFieldParams): SocialScanInputs {
  const n = f.n;
  const cells = gridDim(p) ** 2;
  return {
    n,
    px: f.px.slice(0, n),
    py: f.py.slice(0, n),
    pz: f.pz.slice(0, n),
    group: f.group.slice(0, n),
    type: f.type.slice(0, n),
    energy: f.energy.slice(0, n),
    alive: f.alive.slice(0, n),
    hostile: f.hostile.slice(0, n),
    shelter: f.shelter.slice(0, n),
    cellStart: f.cellStart.slice(0, cells + 1),
    cellItems: f.cellItems.slice(0, n),
  };
}

/**
 * Run a job against its own snapshot copy. `scratch` (from a previous call) is reused when it is
 * large enough, so a long-lived worker allocates result space once. Returns the answers for the
 * job's range as fresh arrays (transferable) and the scratch to keep.
 */
export function runSocialScanJob(
  job: SocialScanJob,
  scratch: SocialFieldBuffers | null = null,
): { out: SocialScanOutputs; scratch: SocialFieldBuffers } {
  const { inputs, params, from, to } = job;
  const f =
    scratch !== null &&
    scratch.px.length >= inputs.n &&
    gridDim(params) ** 2 + 1 <= scratch.cellStart.length
      ? scratch
      : allocSocialField(Math.max(1, inputs.n), params);
  f.n = inputs.n;
  f.px.set(inputs.px);
  f.py.set(inputs.py);
  f.pz.set(inputs.pz);
  f.group.set(inputs.group);
  f.type.set(inputs.type);
  f.energy.set(inputs.energy);
  f.alive.set(inputs.alive);
  f.hostile.set(inputs.hostile);
  f.shelter.set(inputs.shelter);
  f.cellStart.set(inputs.cellStart);
  f.cellItems.set(inputs.cellItems);
  scanSocialRange(f, params, from, to);
  const a = from * SOCIAL_NEAREST;
  const b = to * SOCIAL_NEAREST;
  return {
    scratch: f,
    out: {
      near: f.near.slice(a, b),
      nearD2: f.nearD2.slice(a, b),
      kin: f.kin.slice(from, to),
      kinD2: f.kinD2.slice(from, to),
      sameType: f.sameType.slice(from, to),
      sameTypeD2: f.sameTypeD2.slice(from, to),
      fedKin: f.fedKin.slice(from, to),
      fedKinEnergy: f.fedKinEnergy.slice(from, to),
      count: f.count.slice(from, to),
      kinCount: f.kinCount.slice(from, to),
      threatX: f.threatX.slice(from, to),
      threatZ: f.threatZ.slice(from, to),
      threatCount: f.threatCount.slice(from, to),
    },
  };
}

/** Write a job's answers into the field at organism offset `from`. */
export function writeSocialOutputs(
  f: SocialFieldBuffers,
  from: number,
  out: SocialScanOutputs,
): void {
  for (const k of OUTPUT_KEYS) {
    const off = k === 'near' || k === 'nearD2' ? from * SOCIAL_NEAREST : from;
    (f[k] as Float32Array | Int32Array).set(out[k], off);
  }
}

/** The transferable buffers of a job's answers (for `postMessage(…, transfer)`). */
export function socialOutputBuffers(out: SocialScanOutputs): ArrayBuffer[] {
  return OUTPUT_KEYS.map((k) => out[k].buffer as ArrayBuffer);
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Boundary check for a job arriving at a worker. */
export function isSocialScanJob(v: unknown): v is SocialScanJob {
  if (typeof v !== 'object' || v === null) return false;
  const j = v as Partial<SocialScanJob>;
  const p = j.params;
  const s = j.inputs;
  if (!isInt(j.ticket) || !isInt(j.from) || !isInt(j.to) || !p || !s || !isInt(s.n)) return false;
  if (![p.radius, p.budget, p.cell, p.extent].every((x) => typeof x === 'number' && x > 0))
    return false;
  if (!isInt(p.budget) || gridDim(p) > 4096) return false;
  const n = s.n;
  if (n < 0 || j.from < 0 || j.to < j.from || j.to > n) return false;
  const sized = (a: unknown, ctor: unknown, len: number): boolean =>
    a instanceof (ctor as typeof Float32Array) && (a as Float32Array).length === len;
  return (
    sized(s.px, Float32Array, n) &&
    sized(s.py, Float32Array, n) &&
    sized(s.pz, Float32Array, n) &&
    sized(s.group, Int32Array, n) &&
    sized(s.type, Int32Array, n) &&
    sized(s.energy, Float32Array, n) &&
    sized(s.alive, Uint8Array, n) &&
    sized(s.hostile, Uint8Array, n) &&
    sized(s.shelter, Uint8Array, n) &&
    sized(s.cellStart, Int32Array, gridDim(p) ** 2 + 1) &&
    sized(s.cellItems, Int32Array, n) &&
    s.cellItems.every((x) => x >= 0 && x < n) &&
    s.cellStart.every((x, i, a) => x >= 0 && x <= n && (i === 0 || x >= a[i - 1]!))
  );
}

/** Boundary check for answers covering `count` organisms arriving back from an executor. */
export function isSocialScanOutputs(v: unknown, count: number): v is SocialScanOutputs {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return OUTPUT_KEYS.every((k) => {
    const a = o[k];
    const len = k === 'near' || k === 'nearD2' ? count * SOCIAL_NEAREST : count;
    const intArr =
      k === 'near' ||
      k === 'kin' ||
      k === 'sameType' ||
      k === 'fedKin' ||
      k === 'count' ||
      k === 'kinCount' ||
      k === 'threatCount';
    const typed = intArr ? a instanceof Int32Array : a instanceof Float32Array;
    return typed && (a as Int32Array | Float32Array).length === len;
  });
}

// ── Shared memory: cores answer a field in place (ADR 0019 phase 2) ──────────────────────────────

/**
 * With cross-origin isolation the field lives in SharedArrayBuffers. Cores read the snapshot where
 * the owner packed it and write their answers straight into its result arrays, so nothing is
 * copied, and completion is a counter the owner reads with `Atomics.load`, so it never depends on
 * the main thread yielding to receive a message.
 *
 * Each field has a control block: one word per range, then a completion counter. A word holds the
 * range's ticket and phase. Every move between phases is an atomic compare-and-swap, so the owner
 * and a core can never both own a range:
 *
 *   owner: dispatch          FREE|DONE → QUEUED(t)
 *   core:  claim             QUEUED(t) → RUNNING(t), scan in place, → DONE(t), counter + 1
 *   owner: take back         QUEUED(t) → FREE(t)   (the core then skips the job)
 *
 * The owner writes into a field only after taking it back with no range RUNNING. A core that is
 * still RUNNING keeps the field: the owner moves to fresh buffers instead of waiting for it.
 */
export const SHARED_FREE = 0;
export const SHARED_QUEUED = 1;
export const SHARED_RUNNING = 2;
export const SHARED_DONE = 3;

/** Control word for `phase` of `ticket`. Tickets wrap at 2^29; no range lives that long. */
export function sharedWord(ticket: number, phase: number): number {
  return ((ticket & 0x1fffffff) << 2) | phase;
}

/** Fields a core keeps bound at once (two slots, plus fields replaced by growth or a late core). */
export const SHARED_MAX_BOUND = 4;

/** A field as a core sees it: the shared arrays and the field's control block. */
export interface SocialSharedBinding {
  field: SocialFieldBuffers;
  control: Int32Array;
}

/** First message to a shared core: its index and the pool's per-core progress counters. */
export interface SocialSharedInit {
  kind: 'shared-init';
  core: number;
  progress: Int32Array;
}

/** Shared-memory job: answer organisms `from..to-1` of field `field` in place, as range `range`. */
export interface SocialSharedJob {
  kind: 'shared';
  ticket: number;
  field: number;
  range: number;
  from: number;
  to: number;
  n: number;
  params: SocialFieldParams;
  /** Present on a core's first job for this field: its buffers (shared by postMessage, not copied). */
  bind?: SocialSharedBinding;
}

/** One core's shared-memory state. `bound` is in binding order, which is also eviction order. */
export interface SocialSharedCore {
  core: number;
  progress: Int32Array;
  bound: Map<number, SocialSharedBinding>;
}

/** What a core did with a shared job. `invalid` means the job referenced memory it does not hold. */
export type SocialSharedOutcome = 'answered' | 'skipped' | 'invalid';

/**
 * Run one shared job on a core: bind the field if the job carries it, claim the range, scan it in
 * place, publish the answers, then count the job as consumed. A job whose range was taken back or
 * reassigned to a newer ticket is skipped without touching the field.
 */
export function runSocialSharedJob(c: SocialSharedCore, job: SocialSharedJob): SocialSharedOutcome {
  if (job.bind !== undefined) {
    c.bound.delete(job.field);
    c.bound.set(job.field, job.bind);
    while (c.bound.size > SHARED_MAX_BOUND) c.bound.delete(c.bound.keys().next().value!);
  }
  const b = c.bound.get(job.field);
  let outcome: SocialSharedOutcome = 'skipped';
  if (
    b === undefined ||
    job.range >= b.control.length - 1 ||
    job.n > b.field.px.length ||
    gridDim(job.params) ** 2 + 1 > b.field.cellStart.length
  ) {
    outcome = 'invalid';
  } else {
    const queued = sharedWord(job.ticket, SHARED_QUEUED);
    const running = sharedWord(job.ticket, SHARED_RUNNING);
    if (Atomics.compareExchange(b.control, job.range, queued, running) === queued) {
      scanSocialRange(b.field, job.params, job.from, job.to);
      Atomics.store(b.control, job.range, sharedWord(job.ticket, SHARED_DONE));
      Atomics.add(b.control, b.control.length - 1, 1);
      outcome = 'answered';
    }
  }
  Atomics.add(c.progress, c.core, 1);
  return outcome;
}

const isSharedInt32 = (a: unknown): a is Int32Array =>
  typeof SharedArrayBuffer !== 'undefined' &&
  a instanceof Int32Array &&
  a.buffer instanceof SharedArrayBuffer;

/** True when every array of `f` lives in a SharedArrayBuffer (so cores can answer it in place). */
export function isSharedSocialField(f: SocialFieldBuffers): boolean {
  if (typeof SharedArrayBuffer === 'undefined') return false;
  for (const k in f) {
    const a = f[k as keyof SocialFieldBuffers];
    if (typeof a !== 'number' && !(a.buffer instanceof SharedArrayBuffer)) return false;
  }
  return true;
}

const validParams = (p: SocialFieldParams | undefined): p is SocialFieldParams =>
  p !== undefined &&
  p !== null &&
  [p.radius, p.budget, p.cell, p.extent].every((x) => typeof x === 'number' && x > 0) &&
  isInt(p.budget) &&
  gridDim(p) <= 4096;

/**
 * Boundary check for a shared binding: shared arrays of the right types and consistent lengths.
 * Contents are not checked — shared memory can change after any check, and the kernel reads typed
 * arrays only, so a hostile value can produce a wrong answer but never an out-of-bounds write.
 */
function isSocialSharedBinding(v: unknown, p: SocialFieldParams): v is SocialSharedBinding {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Partial<SocialSharedBinding>;
  const f = b.field;
  if (!isSharedInt32(b.control) || b.control.length < 2 || typeof f !== 'object' || f === null)
    return false;
  if (!(f.px instanceof Float32Array)) return false;
  const cap = f.px.length;
  const shared = (a: unknown, ctor: unknown, len: number): boolean =>
    a instanceof (ctor as typeof Float32Array) &&
    (a as Float32Array).buffer instanceof SharedArrayBuffer &&
    (a as Float32Array).length === len;
  return (
    shared(f.px, Float32Array, cap) &&
    shared(f.py, Float32Array, cap) &&
    shared(f.pz, Float32Array, cap) &&
    shared(f.group, Int32Array, cap) &&
    shared(f.type, Int32Array, cap) &&
    shared(f.energy, Float32Array, cap) &&
    shared(f.alive, Uint8Array, cap) &&
    shared(f.hostile, Uint8Array, cap) &&
    shared(f.shelter, Uint8Array, cap) &&
    shared(f.cellItems, Int32Array, cap) &&
    f.cellStart instanceof Int32Array &&
    shared(f.cellStart, Int32Array, f.cellStart.length) &&
    f.cellStart.length >= gridDim(p) ** 2 + 1 &&
    shared(f.near, Int32Array, cap * SOCIAL_NEAREST) &&
    shared(f.nearD2, Float32Array, cap * SOCIAL_NEAREST) &&
    OUTPUT_KEYS.every(
      (k) =>
        k === 'near' ||
        k === 'nearD2' ||
        shared(f[k], f[k] instanceof Int32Array ? Int32Array : Float32Array, cap),
    )
  );
}

/** Boundary check for the first message a shared core receives. */
export function isSocialSharedInit(v: unknown): v is SocialSharedInit {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Partial<SocialSharedInit>;
  return (
    m.kind === 'shared-init' &&
    isSharedInt32(m.progress) &&
    isInt(m.core) &&
    m.core >= 0 &&
    m.core < m.progress.length
  );
}

/** Boundary check for a shared job arriving at a core (its binding, if any, included). */
export function isSocialSharedJob(v: unknown): v is SocialSharedJob {
  if (typeof v !== 'object' || v === null) return false;
  const j = v as Partial<SocialSharedJob>;
  return (
    j.kind === 'shared' &&
    isInt(j.ticket) &&
    isInt(j.field) &&
    isInt(j.range) &&
    isInt(j.from) &&
    isInt(j.to) &&
    isInt(j.n) &&
    j.range >= 0 &&
    j.from >= 0 &&
    j.to >= j.from &&
    j.n >= j.to &&
    validParams(j.params) &&
    (j.bind === undefined || isSocialSharedBinding(j.bind, j.params))
  );
}
