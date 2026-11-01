/**
 * `?perf=1` — opt-in per-system frame breakdown (render / UI layer).
 *
 * Wraps the per-frame methods (update / step / sync / advance / render / think…) of every subsystem the
 * World owns, the World's own update* helpers, and the renderer / post-FX passes with a wall-clock timer.
 * Shows a small overlay of the top systems by ms per frame plus draw calls, triangles, geometries,
 * textures and heap, and logs the same table to the console every few seconds (`window.__cqmPerf`).
 *
 * DETERMINISM-SAFE: timing only; it never reads RNG or changes what any method computes. Off by default:
 * without `?perf=1` nothing is wrapped and there is zero cost. Times are inclusive (a system that calls
 * another counts both), so the total row (world.step + render) is the honest frame figure.
 */

const METHOD_RE =
  /^(update|step|sync|advance|render|tick|think|simulate|animate|integrate|evolve)/i;

export interface PerfRow {
  name: string;
  msPerFrame: number;
  calls: number;
}

/** Pure: true when the URL search string asks for the perf breakdown. */
export function perfProbeRequested(search: string): boolean {
  return /[?&]perf=1(?:&|$)/.test(search);
}

/** Pure: per-frame rows from accumulated totals, highest first. */
export function perfRows(
  totals: Map<string, { ms: number; calls: number }>,
  frames: number,
  limit = 24,
): PerfRow[] {
  const f = Math.max(1, frames);
  return [...totals.entries()]
    .map(([name, v]) => ({ name, msPerFrame: v.ms / f, calls: v.calls / f }))
    .sort((a, b) => b.msPerFrame - a.msPerFrame)
    .slice(0, limit);
}

type AnyObj = Record<string, unknown>;

export class PerfProbe {
  readonly totals = new Map<string, { ms: number; calls: number }>();
  frames = 0;
  private readonly seen = new WeakSet<object>();
  private el: HTMLElement | null = null;
  private lastLog = 0;
  info: AnyObj = {};

  /** Wrap one method on `obj` (instance shadow; the prototype is untouched). */
  wrap(obj: AnyObj, method: string, label: string): void {
    const orig = obj[method];
    if (typeof orig !== 'function') return;
    const bucket = { ms: 0, calls: 0 };
    const prior = this.totals.get(label);
    this.totals.set(label, prior ?? bucket);
    const b = prior ?? bucket;
    obj[method] = function (this: unknown, ...args: unknown[]): unknown {
      const t0 = performance.now();
      try {
        return (orig as (...a: unknown[]) => unknown).apply(this, args);
      } finally {
        b.ms += performance.now() - t0;
        b.calls++;
      }
    };
  }

  /** Wrap the per-frame methods of `obj` and (one level down) of the subsystems it owns. */
  instrument(obj: AnyObj, label: string, depth = 1): void {
    if (!obj || typeof obj !== 'object' || this.seen.has(obj)) return;
    this.seen.add(obj);
    let proto: object | null = Object.getPrototypeOf(obj);
    const names = new Set<string>();
    while (proto && proto !== Object.prototype) {
      for (const n of Object.getOwnPropertyNames(proto)) names.add(n);
      proto = Object.getPrototypeOf(proto);
    }
    for (const n of names) {
      if (n === 'constructor' || !METHOD_RE.test(n)) continue;
      // The World's top-level step is timed separately as the frame total.
      if (label === 'world' && n === 'step') continue;
      this.wrap(obj, n, `${label}.${n}`);
    }
    if (depth <= 0) return;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (!v || typeof v !== 'object' || Array.isArray(v) || ArrayBuffer.isView(v)) continue;
      const ctor = (v as object).constructor?.name ?? '';
      // Skip three.js scene-graph objects and plain data — only owned subsystems.
      if (!ctor || ctor === 'Object' || ctor === 'Map' || ctor === 'Set') continue;
      if ((v as AnyObj).isObject3D || (v as AnyObj).isMaterial || (v as AnyObj).isBufferGeometry)
        continue;
      this.instrument(v as AnyObj, `${label === 'world' ? '' : label + '.'}${key}`, depth - 1);
    }
  }

  frameDone(renderer: { info?: { render?: AnyObj; memory?: AnyObj } } | null): void {
    this.frames++;
    const r = renderer?.info;
    if (r?.render)
      this.info = {
        drawCalls: r.render.calls,
        triangles: r.render.triangles,
        geometries: r.memory?.geometries,
        textures: r.memory?.textures,
      };
    const now = performance.now();
    if (now - this.lastLog < 2000) return;
    this.lastLog = now;
    const rows = perfRows(this.totals, this.frames);
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const heap = mem ? (mem.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : 'n/a';
    const head = `perf · ${this.frames} frames · draws ${String(this.info.drawCalls)} · tris ${String(this.info.triangles)} · geo ${String(this.info.geometries)} · tex ${String(this.info.textures)} · heap ${heap}`;
    (globalThis as unknown as { __cqmPerf: unknown }).__cqmPerf = { head, rows, info: this.info };
    console.table?.(
      rows.map((x) => ({
        system: x.name,
        ms: +x.msPerFrame.toFixed(2),
        calls: +x.calls.toFixed(1),
      })),
    );
    if (typeof document !== 'undefined') {
      if (!this.el) {
        this.el = document.createElement('pre');
        this.el.id = 'cqm-perf-probe';
        this.el.style.cssText =
          'position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:6px 8px;max-height:60vh;overflow:auto;font:11px/1.3 ui-monospace,monospace;color:#cfe;background:rgba(0,8,16,.82);border:1px solid #2a4;border-radius:4px;pointer-events:none;white-space:pre';
        document.body.appendChild(this.el);
      }
      this.el.textContent =
        head +
        '\n' +
        rows.map((x) => `${x.msPerFrame.toFixed(2).padStart(7)} ms  ${x.name}`).join('\n');
    }
    // Rolling window: reset so the numbers describe the last ~2 s, not the boot.
    for (const v of this.totals.values()) {
      v.ms = 0;
      v.calls = 0;
    }
    this.frames = 0;
  }
}
