/**
 * STAGE 1+ — perf HUD (render / UI layer — NOT src/sim, NOT src/math).
 *
 * Always-on chip showing live FPS, frame timing, population, connectome density, worker pool
 * utilization, memory, and tier — plus one-tap tier switching (`?tier=` reload).
 *
 * DETERMINISM-SAFE: reads only render-layer + read-only sim telemetry; never mutates sim/RNG.
 * Headless-safe: with no DOM it returns a no-op updater.
 */
import { Level } from '../core/frame-governor';

// Six-rung population ladder. The active tier may change population scale, never visual fidelity.
const TIERS = ['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega'] as const;

/** Governor level → short human label. Pure. Runtime monitor is locked full. */
export function qualityLabel(_level: Level): string {
  return 'full';
}

/** FPS → status bucket (drives the readout colour). Pure. */
export function fpsBucket(fps: number): 'good' | 'ok' | 'bad' {
  if (fps >= 50) return 'good';
  if (fps >= 25) return 'ok';
  return 'bad';
}

const BUCKET_COLOR: Record<'good' | 'ok' | 'bad', string> = {
  good: '#5fe39a',
  ok: '#ffce6b',
  bad: '#ff6b6b',
};

/** Read-only sim telemetry surfaced in the HUD (from World.getPerfSnapshot). */
export interface PerfHudWorldMetrics {
  entities: number;
  maxEntities: number;
  connectomeLinks: number;
  wildernessEntities: number;
  wildernessChunks: number;
  workerTotal: number;
  workerActive: number;
  workersReady: boolean;
  hardwareCores: number;
  simFrame: number;
}

/** Full HUD update payload — pure formatters consume this. */
export interface PerfHudSnapshot {
  fps: number;
  level: Level;
  frameMs: number;
  p95Ms: number;
  heapMb: number;
  tier: string;
  world: PerfHudWorldMetrics;
}

/** Format the timing row: `16 ms · p95 22 ms · 412 MB`. Pure. */
export function formatTimingLine(frameMs: number, p95Ms: number, heapMb: number): string {
  const ms = `${Math.round(frameMs)} ms`;
  const p95 = p95Ms > 0 ? ` · p95 ${Math.round(p95Ms)} ms` : '';
  const heap = heapMb > 0 ? ` · ${Math.round(heapMb)} MB` : '';
  return ms + p95 + heap;
}

/** Format the population row: `n 10,000/50,000 · links 40,120 · wild 640`. Pure. */
export function formatPopulationLine(w: PerfHudWorldMetrics): string {
  const n = `${w.entities.toLocaleString()}/${w.maxEntities.toLocaleString()}`;
  const links = w.connectomeLinks.toLocaleString();
  const wild =
    w.wildernessEntities > 0
      ? ` · wild ${w.wildernessEntities.toLocaleString()} (${w.wildernessChunks} ch)`
      : '';
  return `n ${n} · links ${links}${wild}`;
}

/** Format worker/cpu row: `cpu 16c · workers 16 (2 act)`. Pure. */
export function formatWorkerLine(w: PerfHudWorldMetrics): string {
  const cores = `${w.hardwareCores}c`;
  if (!w.workersReady || w.workerTotal === 0) return `cpu ${cores} · workers off`;
  const act = w.workerActive > 0 ? ` (${w.workerActive} act)` : '';
  return `cpu ${cores} · workers ${w.workerTotal}${act}`;
}

export interface PerfHud {
  /** Update the readout. O(1) text writes only. */
  update(snapshot: PerfHudSnapshot): void;
}

const NOOP: PerfHud = { update: () => undefined };

const EMPTY_WORLD: PerfHudWorldMetrics = {
  entities: 0,
  maxEntities: 0,
  connectomeLinks: 0,
  wildernessEntities: 0,
  wildernessChunks: 0,
  workerTotal: 0,
  workerActive: 0,
  workersReady: false,
  hardwareCores: 1,
  simFrame: 0,
};

/**
 * Mount the perf chip into the document and return an updater. Headless-safe: returns a no-op updater
 * when there is no DOM (e.g. under `bun test`), so importing/calling this never throws off-browser.
 */
export function mountPerfHud(currentTier: string): PerfHud {
  if (typeof document === 'undefined' || !document.body) return NOOP;

  const mountParent = document.getElementById('perf-slot') ?? document.body;
  if (document.getElementById('perf-hud')) return NOOP;

  const el = document.createElement('div');
  el.id = 'perf-hud';

  const fpsEl = document.createElement('span');
  const qEl = document.createElement('span');
  qEl.className = 'perf-hud-quality';
  const line1 = document.createElement('div');
  line1.appendChild(fpsEl);
  line1.appendChild(document.createTextNode(' · '));
  line1.appendChild(qEl);

  const timingEl = document.createElement('div');
  timingEl.className = 'perf-hud-metrics';
  const popEl = document.createElement('div');
  popEl.className = 'perf-hud-metrics';
  const workerEl = document.createElement('div');
  workerEl.className = 'perf-hud-metrics';

  const tierRow = document.createElement('div');
  tierRow.className = 'perf-hud-row';
  for (const t of TIERS) {
    const b = document.createElement('button');
    b.textContent = t === currentTier ? `[${t}]` : t;
    b.title = `Switch to the ${t} tier (reloads)`;
    b.className = 'perf-hud-tier' + (t === currentTier ? ' current' : '');
    b.addEventListener('click', () => {
      const u = new URL(window.location.href);
      u.searchParams.set('tier', t);
      window.location.href = u.toString();
    });
    tierRow.appendChild(b);
  }

  const hint = document.createElement('div');
  hint.className = 'perf-hud-hint';
  hint.textContent = 'fly: drag · scroll · WASD';

  el.appendChild(line1);
  el.appendChild(timingEl);
  el.appendChild(popEl);
  el.appendChild(workerEl);
  el.appendChild(tierRow);
  el.appendChild(hint);
  mountParent.appendChild(el);

  return {
    update(snapshot: PerfHudSnapshot): void {
      const bucket = fpsBucket(snapshot.fps);
      fpsEl.textContent = `${Math.round(snapshot.fps)} fps`;
      fpsEl.style.color = BUCKET_COLOR[bucket];
      qEl.textContent = `q: ${qualityLabel(snapshot.level)} · ${snapshot.tier}`;
      timingEl.textContent = formatTimingLine(snapshot.frameMs, snapshot.p95Ms, snapshot.heapMb);
      popEl.textContent = formatPopulationLine(snapshot.world);
      workerEl.textContent = formatWorkerLine(snapshot.world);
    },
  };
}

/** Headless default for tests importing format helpers. */
export { EMPTY_WORLD };
