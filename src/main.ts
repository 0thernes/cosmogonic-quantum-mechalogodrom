/**
 * Browser entrypoint: htmx activation, quality detection, engine boot,
 * persisted-state load, world construction, and the requestAnimationFrame loop.
 */
import 'htmx.org';
import * as THREE from 'three';
import { detectQuality } from './core/quality';
import { Engine } from './core/engine';
import { RenderGovernor } from './core/frame-governor';
import { mountPerfHud } from './ui/perf-hud';
import type { PerfHudWorldMetrics } from './ui/perf-hud';
import { PerformanceMonitor } from './core/perf-monitor';
import { MemoryStore } from './memory/store';
import { AuditTrail } from './logging/audit';
import { createLogger } from './logging/logger';
import { World } from './world';
// Center HUD (V56/V84): cyclable center popup for AI · HELP · AUDIT · NEURAL · MARKET · ARCHITECT · ARCHITECTURE.
import { initCenterHud } from './ui/center-hud';
import { initUiColumns } from './ui/ui-columns';
import { syncBottomDockHeight } from './ui/bottom-dock';
import { mountAlgoPickerShell } from './ui/algo-picker-shell';
// Toolbar keyboard navigation: roving tabindex + arrow keys for #bar buttons.
import { initToolbarKeyboard } from './ui/toolbar';
// PERF/LOAD (v0.20.0): the self-mounting click-to-open panels — copilot (V9), access-puzzle (V34),
// temple-access (V124), help-system (V36), audit-dock (V51), onboarding (V81), settings-panel (V81),
// panel-edge-toggles (V98) — are DEFERRED (see loadDeferredUi() below): dynamically imported after
// bootDone() so their ~131 KB of source (and copilot's import-time /api/copilot fetch) leave the
// render-blocking entry chunk for a lazy chunk fetched after first light. Each module self-mounts on
// import and guards document.readyState, so a late import Just Works; none is visible on frame 1 or
// touches sim state / RNG (access-puzzle→cqm:superhero-unlock and temple-access→cqm:force-ascension
// only fire on user interaction, long after World's {once:true} listeners are wired). Zero visual
// change to the first frame — the shell columns + toolbar above stay EAGER because they must paint.
// Boot loader (V121, USER #6): feeds the #cqm-boot overlay REAL stage timings, fades on first frame.
import { bootStage, bootPaint, bootDone, bootAbort } from './ui/boot-loader';
import { APEX_INDIVIDUATED } from './sim/godform';
import { ALPHABET_PANTHEON_SIZE } from './sim/alphabet-pantheon';

// Legacy r128 color fidelity: the original rendered without color management;
// disable it BEFORE any THREE.Color is constructed (audit finding, 0.2.1).
THREE.ColorManagement.enabled = false;

const log = createLogger('main');

/** Shell layout before WebGL boot — panels must paint in final positions on first frame. */
function initAppShell(): void {
  initUiColumns();
  mountAlgoPickerShell();
  initCenterHud();
  syncBottomDockHeight();
  document.documentElement.classList.add('cqm-shell-ready');
}

/**
 * V0.20.0 PERF/LOAD: import the self-mounting click-to-open panels AFTER first light, at idle, off the
 * boot critical path. Each module self-mounts on import (guarding document.readyState), so importing it
 * late is equivalent to importing it eagerly — the only difference is these ~131 KB no longer sit in the
 * render-blocking entry chunk (Bun splits each `import()` into its own lazily-fetched chunk). Successful
 * modules are mounted once; failed lazy fetches stay pending for a delayed retry so a transient chunk
 * error never breaks the running cosmos. Literal specifiers are required for Bun's static analysis.
 */
type DeferredUiModule =
  | 'copilot'
  | 'access-puzzle'
  | 'temple-access'
  | 'help-system'
  | 'audit-dock'
  | 'onboarding'
  | 'settings-panel'
  | 'panel-edge-toggles';

const deferredUiPending = new Set<DeferredUiModule>([
  'copilot',
  'access-puzzle',
  'temple-access',
  'help-system',
  'audit-dock',
  'onboarding',
  'settings-panel',
  'panel-edge-toggles',
]);
const DEFERRED_UI_RETRY_MS = 2_000;
const DEFERRED_UI_MAX_ATTEMPTS = 3;
const deferredUiAttempts = new Map<DeferredUiModule, number>();
let deferredUiLoading = false;
let deferredUiRetryTimer: number | null = null;
let deferredUiFallbackTimer: number | null = null;
let deferredUiRunTimer: number | null = null;
let deferredUiIdleCallback: number | null = null;
/** Own every entrypoint listener so HMR cannot leave closures bound to a disposed world. */
const mainLifecycle = new AbortController();

function loadDeferredUi(): void {
  if (!mainLifecycleActive() || deferredUiLoading || deferredUiPending.size === 0) return;
  deferredUiLoading = true;
  const failed =
    (name: DeferredUiModule) =>
    (err: unknown): void => {
      if (!mainLifecycleActive()) return;
      const attempts = deferredUiAttempts.get(name) ?? 0;
      if (attempts >= DEFERRED_UI_MAX_ATTEMPTS) deferredUiPending.delete(name);
      log.warn('deferred UI import failed', {
        module: name,
        attempts,
        exhausted: attempts >= DEFERRED_UI_MAX_ATTEMPTS,
        error: err instanceof Error ? err.message : String(err),
      });
    };
  const loaded = (name: DeferredUiModule): void => {
    if (!mainLifecycleActive()) return;
    deferredUiPending.delete(name);
  };
  const run = (): void => {
    if (!mainLifecycleActive()) {
      deferredUiLoading = false;
      return;
    }
    const tasks: Promise<void>[] = [];
    const track = (name: DeferredUiModule, load: () => Promise<unknown>): void => {
      if (!mainLifecycleActive() || !deferredUiPending.has(name)) return;
      deferredUiAttempts.set(name, (deferredUiAttempts.get(name) ?? 0) + 1);
      tasks.push(
        load().then(
          () => {
            if (mainLifecycleActive()) loaded(name);
          },
          (err: unknown) => {
            if (mainLifecycleActive()) failed(name)(err);
          },
        ),
      );
    };
    track('copilot', () => import('./ui/copilot'));
    track('access-puzzle', () => import('./ui/access-puzzle'));
    track('temple-access', () => import('./ui/temple-access'));
    track('help-system', () => import('./ui/help-system'));
    track('audit-dock', () => import('./ui/audit-dock'));
    track('onboarding', () => import('./ui/onboarding'));
    track('settings-panel', () => import('./ui/settings-panel'));
    track('panel-edge-toggles', () => import('./ui/panel-edge-toggles'));
    void Promise.allSettled(tasks).finally(() => {
      deferredUiLoading = false;
      if (!mainLifecycleActive()) return;
      // Successful modules stay removed from the pending set. A transient chunk failure gets one
      // bounded retry timer instead of being permanently suppressed by a one-shot global flag.
      if (deferredUiPending.size > 0 && deferredUiRetryTimer === null) {
        deferredUiRetryTimer = window.setTimeout(() => {
          deferredUiRetryTimer = null;
          if (!mainLifecycleActive()) return;
          loadDeferredUi();
        }, DEFERRED_UI_RETRY_MS);
      }
    });
  };
  const idleWindow = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof idleWindow.requestIdleCallback === 'function') {
    deferredUiIdleCallback = idleWindow.requestIdleCallback(
      () => {
        deferredUiIdleCallback = null;
        run();
      },
      { timeout: 1500 },
    );
  } else {
    deferredUiRunTimer = window.setTimeout(() => {
      deferredUiRunTimer = null;
      run();
    }, 0);
  }
}

const canvas = document.getElementById('c');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('boot failure: #c canvas element is missing');
}

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
    '<pre id="cqm-webgl-msg" style="margin-top:12px;font-size:10px;color:#7a6fae;white-space:pre-wrap"></pre>' +
    '</div>';
  document.body.appendChild(el);
  // The error string is a raw driver / three.js message (may contain < or >); assign it as TEXT, not
  // HTML, so it can never corrupt the card markup — matches the project's escape-everything convention.
  const msgEl = el.querySelector('#cqm-webgl-msg');
  if (msgEl) msgEl.textContent = msg;
  el.querySelector('#cqm-webgl-reload')?.addEventListener('click', () => location.reload());
}

let engine: Engine | null = null;
let world: World | null = null;
let rafId = 0;
let resizeHandler: (() => void) | null = null;

function mainLifecycleActive(): boolean {
  return !mainLifecycle.signal.aborted;
}

/** Dispose only this module instance's runtime objects; null-first makes repeated abort cleanup safe. */
function disposeRuntimeObjects(): void {
  const doomedWorld = world;
  world = null;
  try {
    doomedWorld?.dispose();
  } catch {
    /* world teardown is best-effort */
  }

  const doomedEngine = engine;
  engine = null;
  try {
    doomedEngine?.dispose();
  } catch {
    /* engine teardown is best-effort */
  }
}

/** Every asynchronous boot continuation must pass this gate before it can resurrect runtime state. */
function continueMainLifecycle(): boolean {
  if (mainLifecycleActive()) return true;
  disposeRuntimeObjects();
  return false;
}

/** Cancel all deferred-UI scheduling owned by this module instance. In-flight imports self-quarantine. */
function cancelDeferredUiScheduling(): void {
  if (deferredUiRetryTimer !== null) {
    window.clearTimeout(deferredUiRetryTimer);
    deferredUiRetryTimer = null;
  }
  if (deferredUiFallbackTimer !== null) {
    window.clearTimeout(deferredUiFallbackTimer);
    deferredUiFallbackTimer = null;
  }
  if (deferredUiRunTimer !== null) {
    window.clearTimeout(deferredUiRunTimer);
    deferredUiRunTimer = null;
  }
  if (deferredUiIdleCallback !== null) {
    const cancelIdleCallback = (
      window as unknown as { cancelIdleCallback?: (handle: number) => void }
    ).cancelIdleCallback;
    if (typeof cancelIdleCallback === 'function') {
      cancelIdleCallback.call(window, deferredUiIdleCallback);
    }
    deferredUiIdleCallback = null;
  }
  deferredUiLoading = false;
}

/** Preserve the post-shell fallback while keeping it out of an aborted quality-detection continuation. */
function scheduleDeferredUiFallback(): void {
  if (!mainLifecycleActive() || deferredUiFallbackTimer !== null) return;
  deferredUiFallbackTimer = window.setTimeout(() => {
    deferredUiFallbackTimer = null;
    if (!mainLifecycleActive()) return;
    loadDeferredUi();
  }, 2500);
}

async function boot(): Promise<void> {
  const quality = await detectQuality();
  if (!continueMainLifecycle()) return;

  const tShell = performance.now();
  initAppShell();
  bootStage('shell', `${Math.max(1, Math.round(performance.now() - tShell))} ms`);
  scheduleDeferredUiFallback();

  // V121 BOOT LOADER: stage the boot with paint yields so the overlay's 8 tiles fill with REAL
  // measured timings while the user watches — engine → seed → world → first light. Each `await
  // bootPaint()` guarantees the compositor presents the latest tile values before the next
  // synchronous block runs (World construction is one long block; the CSS animations are
  // compositor-driven so they keep spinning through it).
  bootStage(
    'quality',
    `${quality.tier.toUpperCase()} · ${quality.maxEntities.toLocaleString()} max`,
  );
  const tEngine = performance.now();
  try {
    engine = new Engine(canvas as HTMLCanvasElement, quality);
  } catch (err) {
    if (!continueMainLifecycle()) return;
    // The renderer (WebGLRenderer) failed to get a context — degrade gracefully instead of a hard crash.
    log.warn('WebGL boot failed', { error: err instanceof Error ? err.message : String(err) });
    bootAbort(); // the recovery card must never sit underneath the loading page
    showWebglRecovery(err);
    return;
  }
  if (!continueMainLifecycle()) return;
  bootStage('engine', `${Math.round(performance.now() - tEngine)} ms`);

  const store = new MemoryStore();
  const loaded = store.load() ?? store.defaults();
  // Food-only application checkpoint. Actor/visitor state deliberately starts clean every boot.
  const bigTreeEcology = store.loadBigTreeEcology();
  // V95: every browser reload starts a fresh cosmos — new seed, new creatures, new economy.
  // Preferences (audio, view, render, etc.) are kept; only the deterministic seed is reset.
  const persisted = {
    ...loaded,
    seed: (0xc05a06 ^ ((performance.now() * 1000) | 0)) >>> 0,
  };
  persisted.sessions += 1;
  store.save(persisted);
  bootStage('seed', `0x${persisted.seed.toString(16).toUpperCase()}`);
  await bootPaint();
  if (!continueMainLifecycle()) return;

  const audit = new AuditTrail();
  const tWorld = performance.now();
  const activeEngine = engine;
  if (!activeEngine) return;
  world = new World({
    engine: activeEngine,
    quality,
    persisted,
    store,
    audit,
    bigTreeEcology,
  });
  if (!continueMainLifecycle()) return;
  bootStage('world', `${Math.round(performance.now() - tWorld)} ms`);
  bootStage('entities', `grows → ${quality.targetEntities.toLocaleString()}`);
  bootStage('pantheon', `${APEX_INDIVIDUATED} apex · ${ALPHABET_PANTHEON_SIZE} glyphs`);
  await bootPaint();
  if (!continueMainLifecycle()) return;

  resizeHandler = (): void => engine?.onResize();
  window.addEventListener('resize', resizeHandler, { signal: mainLifecycle.signal });

  // Legacy parity: any first gesture unlocks audio (and restores persisted SFX).
  const unlock = (): void => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('click', unlock);
    world?.unlock();
  };
  const unlockOptions = { passive: true, signal: mainLifecycle.signal } as const;
  document.addEventListener('pointerdown', unlock, unlockOptions);
  document.addEventListener('click', unlock, unlockOptions);

  audit.record('boot', { session: persisted.sessions, seed: persisted.seed });
  log.info('boot', {
    seed: persisted.seed,
    session: persisted.sessions,
    mobile: quality.isMobile,
    maxEntities: quality.maxEntities,
  });

  // V-toolbar: enable arrow-key / Home / End navigation inside the bottom toolbar.
  initToolbarKeyboard();

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

  // V-GOV: render-side frame monitor. It reports FPS/quality to the HUD but never drops DPR,
  // post-FX, shadows, color, detail or sim cadence. Performance fixes must preserve fidelity.
  const governor = new RenderGovernor(quality.shadows);
  // Stage 1: a tiny render-layer perf chip — live FPS + locked-full quality + tier switch.
  // Render-only ⇒ determinism-safe; headless-safe (no-op without a DOM).
  const perfHud = mountPerfHud(quality.tier);
  const perfMonitor = new PerformanceMonitor(120, 1000);
  let fpsEma = 60;
  let perfFrame = 0;
  // rAF-timestamp delta; world.step clamps to 50ms so tab-switch gaps are safe. dt floored at 0.
  let last = performance.now();
  let firstLight = false;
  function frame(now: number): void {
    if (!mainLifecycleActive()) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.max(0, now - last) / 1000;
    last = now;
    governor.observe(dt);
    if (engine) governor.apply(engine);
    perfMonitor.recordFrame();
    world?.step(dt);
    // V121: the first rendered world frame retires the boot loader (FIRST LIGHT = total ms from
    // script start to a presented cosmos — the honest end-to-end boot figure).
    if (!firstLight) {
      firstLight = true;
      bootStage('firstlight', `${Math.round(performance.now())} ms total`);
      bootDone();
      // V0.20.0: the cosmos is on screen — pull the deferred click-to-open panels in at idle now.
      loadDeferredUi();
    }
    // Render-layer FPS EMA (capped) → throttled HUD update (every 12 frames, no per-frame DOM thrash).
    const fps = dt > 0 ? Math.min(1 / dt, 240) : fpsEma;
    fpsEma += (fps - fpsEma) * 0.1;
    if (++perfFrame % 12 === 0) {
      const metrics = perfMonitor.getMetrics();
      const w = world?.getPerfSnapshot();
      const worldMetrics: PerfHudWorldMetrics = w ?? {
        entities: 0,
        maxEntities: quality.maxEntities,
        connectomeLinks: 0,
        wildernessEntities: 0,
        wildernessChunks: 0,
        workerTotal: 0,
        workerActive: 0,
        workersReady: false,
        hardwareCores: Math.max(1, navigator.hardwareConcurrency ?? 8),
        simFrame: 0,
      };
      perfHud.update({
        fps: fpsEma,
        level: governor.level,
        frameMs: governor.emaMs > 0 ? governor.emaMs : metrics.avgFrameTime,
        p95Ms: metrics.p95FrameTime,
        heapMb: metrics.memoryMB,
        tier: quality.tier,
        world: worldMetrics,
      });
    }
  }
  if (!continueMainLifecycle()) return;
  rafId = requestAnimationFrame(frame);
  // ROBUSTNESS: the deferred click-to-open panels (⛓ ACCESS / ◈ STAGE II / 🗒 AUDIT toggles, copilot,
  // settings, …) load at FIRST LIGHT above — but first light rides requestAnimationFrame, which the
  // browser PAUSES ENTIRELY for a hidden/background tab (and can stall on a very slow boot). Without a
  // fallback those controls never mount until the tab is focused, so the persistent-nav row is left
  // missing ⛓ ACCESS / ◈ STAGE II and 🗒 AUDIT can't open. loadDeferredUi() is idempotent (guarded by
  // its per-module pending set), so ALSO pull it in after a short timeout AND the instant the tab becomes visible
  // — whichever fires first — so the full UI is always present regardless of tab visibility / cadence.
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible') {
        loadDeferredUi();
      } else {
        // Flush while the page is still fully scriptable; pagehide is the final best-effort fallback.
        world?.persistBigTreeEcology();
      }
    },
    { signal: mainLifecycle.signal },
  );
  window.addEventListener('pagehide', () => world?.persistBigTreeEcology(), {
    signal: mainLifecycle.signal,
  });
}

// Only the `new Engine(...)` construction inside boot() has its own try/catch; the rest of boot
// (MemoryStore/AuditTrail/`new World(...)` — dozens of GPU/three.js subsystem constructors) is
// unguarded. A throw there would otherwise become an unhandled rejection AND leave the #cqm-boot
// overlay up forever (it is torn down only by bootDone/bootAbort — there is no timeout fallback),
// stranding the user on a frozen loading screen. This catch guarantees the overlay is removed and a
// recovery card shown for ANY boot rejection. Lifecycle-cancellation early-returns resolve normally,
// so they never reach here; a successful boot resolves undefined and skips the handler.
boot().catch((err: unknown) => {
  log.warn('boot failed', { error: err instanceof Error ? err.message : String(err) });
  bootAbort();
  showWebglRecovery(err);
});

// ROBUSTNESS (USER: the "docs-row buttons are gone / AUDIT is wrecked" symptom, intermittently): the
// deferred click-to-open panels (⛓ ACCESS / ◈ STAGE II / 🗒 AUDIT / SETTINGS / HELP / COPILOT) mount only
// when loadDeferredUi() runs at FIRST LIGHT — inside the rAF loop. But rAF can be DELAYED or never fire: a
// backgrounded tab pauses rAF entirely, and a WebGL init failure never reaches first light. In those cases
// the panels would stay permanently unmounted and their toolbar buttons never appear. The post-shell
// fallback scheduled inside boot fires in a backgrounded tab (unlike rAF); loadDeferredUi is idempotent,
// so on a normal load first-light still wins and the timer becomes a no-op.

// HMR teardown — THE fix for the dev WebGL-context leak. Before a hot-replaced module re-boots, stop the
// rAF loop, drop listeners, and FREE the renderer/context (Engine.dispose → forceContextLoss). Without
// this, every reload leaks a context until `new WebGLRenderer` fails for good. No-op in production
// (import.meta.hot is undefined) and on a full page reload (the unload frees the context anyway).
//
// `import.meta.hot` MUST be referenced DIRECTLY — Bun's HMR runtime makes it a getter that throws
// "import.meta.hot.dispose cannot be used indirectly" if you alias it to a variable first. So we touch
// it inline in the guard and the call, never via a local. bun-types declares the member, so tsc is happy.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(rafId);
    rafId = 0;
    mainLifecycle.abort();
    cancelDeferredUiScheduling();
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    disposeRuntimeObjects();
  });
}
