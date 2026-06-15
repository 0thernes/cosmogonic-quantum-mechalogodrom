/**
 * Browser entrypoint: htmx activation, quality detection, engine boot,
 * persisted-state load, world construction, and the requestAnimationFrame loop.
 */
import 'htmx.org';
import * as THREE from 'three';
import { detectQuality } from './core/quality';
import { Engine } from './core/engine';
import { MemoryStore } from './memory/store';
import { AuditTrail } from './logging/audit';
import { createLogger } from './logging/logger';
import { World } from './world';
// Copilot side-chat (CONTRACTS V9): self-mounting read-only AI panel. UI shell — never touches sim.
import './ui/copilot';
// Access terminal (V34): self-mounting cryptographic puzzle that gates the 2nd super creature.
import './ui/access-puzzle';
// Help system (V36): self-mounting "HELP ME NOW" panel — repo-grounded answers, offline-safe.
import './ui/help-system';

// Legacy r128 color fidelity: the original rendered without color management;
// disable it BEFORE any THREE.Color is constructed (audit finding, 0.2.1).
THREE.ColorManagement.enabled = false;

const log = createLogger('main');

const canvas = document.getElementById('c');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('boot failure: #c canvas element is missing');
}

const quality = detectQuality();

/**
 * A friendly full-screen card shown when the WebGL context can't be created — so the app degrades to a
 * clear, actionable message instead of a blank screen + a raw console throw. The usual cause in dev is a
 * WebGL-context LEAK from repeated hot-reloads (the browser caps ~16 live contexts per process); this
 * build now frees its context on every reload (Engine.dispose + the HMR hook below), so it won't recur
 * once the GPU process is restarted once.
 */
function showWebglRecovery(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (document.getElementById('cqm-webgl-error')) return;
  const el = document.createElement('div');
  el.id = 'cqm-webgl-error';
  el.style.cssText =
    'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;text-align:center;' +
    'font:14px/1.6 ui-monospace,monospace;color:#e7e0ff;background:radial-gradient(circle at 50% 40%,#0b0a1e,#04030a)';
  el.innerHTML =
    '<div style="max-width:560px;border:1px solid rgba(150,120,255,.35);border-radius:14px;padding:22px 26px;background:rgba(12,9,28,.85);box-shadow:0 10px 40px rgba(0,0,0,.6)">' +
    '<div style="font-size:18px;font-weight:700;color:#c79bff;letter-spacing:.08em;margin-bottom:8px">⬢ GPU CONTEXT UNAVAILABLE</div>' +
    "<p>The browser couldn't create a WebGL context. This is almost always a <b>context leak from repeated hot-reloads</b> — a browser caps how many live WebGL contexts one process may hold (~16), and dev reloads can exhaust them.</p>" +
    '<p style="color:#9f93c8">Fix: <b>fully restart the browser</b> (close every tab in this window) once, then reload. This build frees its context on every reload, so it will not recur.</p>' +
    '<button id="cqm-webgl-reload" style="margin-top:12px;padding:8px 18px;border-radius:8px;border:1px solid rgba(150,120,255,.5);background:rgba(60,40,120,.5);color:#e9dcff;font:600 12px ui-monospace,monospace;cursor:pointer">↻ Reload</button>' +
    `<pre style="margin-top:12px;font-size:10px;color:#7a6fae;white-space:pre-wrap">${msg}</pre>` +
    '</div>';
  document.body.appendChild(el);
  el.querySelector('#cqm-webgl-reload')?.addEventListener('click', () => location.reload());
}

let engine: Engine | null = null;
let world: World | null = null;
let rafId = 0;
let resizeHandler: (() => void) | null = null;

function boot(): void {
  try {
    engine = new Engine(canvas as HTMLCanvasElement, quality);
  } catch (err) {
    // The renderer (WebGLRenderer) failed to get a context — degrade gracefully instead of a hard crash.
    log.warn('WebGL boot failed', { error: err instanceof Error ? err.message : String(err) });
    showWebglRecovery(err);
    return;
  }

  const store = new MemoryStore();
  const persisted = store.load() ?? store.defaults();
  persisted.sessions += 1;
  store.save(persisted);

  const audit = new AuditTrail();
  world = new World({ engine, quality, persisted, store, audit });

  resizeHandler = (): void => engine?.onResize();
  window.addEventListener('resize', resizeHandler);

  // Legacy parity: any first gesture unlocks audio (and restores persisted SFX).
  const unlock = (): void => world?.unlock();
  document.addEventListener('pointerdown', unlock, { once: true, passive: true });
  document.addEventListener('click', unlock, { once: true, passive: true });

  audit.record('boot', { session: persisted.sessions, seed: persisted.seed });
  log.info('boot', {
    seed: persisted.seed,
    session: persisted.sessions,
    mobile: quality.isMobile,
    maxEntities: quality.maxEntities,
  });

  // Dev-only inspection hook (localhost / 127.0.0.1 ONLY — never on the deployed static site). Exposes
  // the live world/engine so the preview + automation harness can DRIVE frames and introspect a
  // backgrounded tab (where rAF throttles to ~0 Hz). `step()` advances + renders one frame on demand.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    (window as unknown as { __CQM__: unknown }).__CQM__ = {
      world,
      engine,
      renderer: engine.renderer,
      scene: engine.scene,
      camera: engine.camera,
      THREE,
      step: (dt = 1 / 60): void => world?.step(dt),
    };
  }

  // rAF-timestamp delta; world.step clamps to 50ms so tab-switch gaps are safe. dt floored at 0.
  let last = performance.now();
  function frame(now: number): void {
    rafId = requestAnimationFrame(frame);
    const dt = Math.max(0, now - last) / 1000;
    last = now;
    world?.step(dt);
  }
  rafId = requestAnimationFrame(frame);
}

boot();

// HMR teardown — THE fix for the dev WebGL-context leak. Before a hot-replaced module re-boots, stop the
// rAF loop, drop listeners, and FREE the renderer/context (Engine.dispose → forceContextLoss). Without
// this, every reload leaks a context until `new WebGLRenderer` fails for good. No-op in production
// (import.meta.hot is undefined) and on a full page reload (the unload frees the context anyway).
const hot = (import.meta as unknown as { hot?: { dispose(cb: () => void): void } }).hot;
hot?.dispose(() => {
  cancelAnimationFrame(rafId);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  try {
    (world as unknown as { dispose?: () => void } | null)?.dispose?.();
  } catch {
    /* world teardown is best-effort */
  }
  engine?.dispose();
});
