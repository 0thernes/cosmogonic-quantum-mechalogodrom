/**
 * Static lifecycle seals for browser-only UI modules. Bun's test runtime has no DOM here, so these
 * source-level checks pin the HMR/idempotency contracts that prevent duplicate listeners and leaked
 * observers across dev reloads.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

function src(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('UI lifecycle static contracts', () => {
  test('InputSystem attaches DOM listeners through its AbortController', () => {
    const code = src('src/ui/input.ts');
    expect(code).not.toContain("addEventListener('pointerdown', down);");
    expect(code).not.toContain("addEventListener('click', (e) => {");
    expect((code.match(/signal: this\.ac\.signal/g) ?? []).length).toBeGreaterThan(18);
  });

  test('InputSystem teardown clears held state and the apocalypse timer before listeners', () => {
    const code = src('src/ui/input.ts');
    const start = code.indexOf('dispose(): void');
    const end = code.indexOf('/** Live lowercase', start);
    const dispose = code.slice(start, end);
    expect(dispose).toContain('this.clearHeldInput()');
    expect(dispose.indexOf('this.clearHeldInput()')).toBeLessThan(
      dispose.indexOf('this.ac.abort()'),
    );
  });

  test('deferred UI keeps failed modules pending and schedules a bounded retry', () => {
    const code = src('src/main.ts');
    expect(code).toContain('const deferredUiPending = new Set<DeferredUiModule>');
    expect(code).toContain('deferredUiPending.delete(name)');
    expect(code).toContain('Promise.allSettled(tasks)');
    expect(code).toContain('deferredUiRetryTimer = window.setTimeout');
    expect(code).toContain('DEFERRED_UI_MAX_ATTEMPTS = 3');
    expect(code).toContain('attempts >= DEFERRED_UI_MAX_ATTEMPTS');
    expect(code).toContain(
      'if (!mainLifecycleActive() || deferredUiLoading || deferredUiPending.size === 0) return',
    );
    expect(code).toContain('const mainLifecycle = new AbortController()');
    expect(code).toContain('mainLifecycle.abort()');
    expect(code).toContain('deferredUiFallbackTimer = window.setTimeout');
    expect((code.match(/2500\);/g) ?? []).length).toBe(1);
    expect(code).toContain('signal: mainLifecycle.signal');
    expect(code).toContain("document.removeEventListener('pointerdown', unlock)");
    expect(code).toContain("document.removeEventListener('click', unlock)");
    // HMR may abort while quality/WebGPU detection or a boot-loader paint yield is pending. Every
    // continuation must stop before constructing a replacement World or scheduling its rAF loop.
    expect(code).toMatch(
      /const quality = await detectQuality\(\);\s*if \(!continueMainLifecycle\(\)\) return;/,
    );
    expect(
      (code.match(/await bootPaint\(\);\s*if \(!continueMainLifecycle\(\)\) return;/g) ?? [])
        .length,
    ).toBe(2);
    expect(code).toContain('if (!mainLifecycleActive()) return;');
    expect(code).toContain('const doomedWorld = world;');
    expect(code).toContain('const doomedEngine = engine;');
    expect(code).toContain('disposeRuntimeObjects()');
    // Idle work is actively cancelled where the browser supports it; already-started imports and
    // Promise settlement callbacks are quarantined by the lifecycle signal and cannot enqueue retries.
    expect(code).toContain('deferredUiIdleCallback = idleWindow.requestIdleCallback');
    expect(code).toContain('cancelIdleCallback.call(window, deferredUiIdleCallback)');
    expect(code).toContain('if (mainLifecycleActive()) loaded(name)');
    expect(code).toContain('if (mainLifecycleActive()) failed(name)(err)');
    expect(code).toMatch(
      /Promise\.allSettled\(tasks\)\.finally\([\s\S]{0,180}if \(!mainLifecycleActive\(\)\) return;/,
    );
  });

  test('localhost visual capture can quiesce and resume only the automatic frame loop', () => {
    const main = src('src/main.ts');
    const smoke = src('scripts/browser-visual-smoke.ts');
    expect(main).toContain('let automaticFramesEnabled = true');
    expect(main).toContain('pauseAutoFrames: (): void =>');
    expect(main).toContain('resumeAutoFrames: (): void =>');
    expect(main).toContain('if (rafId !== 0) cancelAnimationFrame(rafId)');
    expect(main).toContain('last = performance.now()');
    expect(main).toContain('requestAutomaticFrame()');
    expect(smoke).toContain("throw new Error('window.__CQM__.pauseAutoFrames missing')");
    expect(main).toContain('bigTreeEcology: {');
    expect(main).toContain('world?.getBigTreeEcologySnapshot(query) ?? null');
    expect(smoke).toContain("throw new Error('window.__CQM__.bigTreeEcology.snapshot missing')");
    expect(smoke).toContain('api.bigTreeEcology?.snapshot?.({ foodId: 0 })');
    expect(smoke).toContain("ecology.foodItem.kind !== 'fruit'");
    expect(smoke).toContain("tier + ': Big Tree ecology diagnostic contract is invalid'");
    expect(smoke).toContain('timeout: screenshotTimeoutMs');
    expect(smoke).toContain('window.__CQM__?.resumeAutoFrames?.()');
    expect(smoke).toContain('pixelReadback: false');
    expect(smoke).not.toContain('gl.readPixels');
    expect(smoke).toContain("'body>*:not(#c){visibility:hidden!important}'");
    expect(smoke).toContain("mode: world.workerPool ? 'worker-pool' : 'main-thread-packed'");
    expect(smoke).toContain("runChecked('building exact GitHub Pages artifact'");
    expect(smoke).toContain("join(SITE_DIR, 'index.html')");
    expect(smoke).toContain('CQM_PAGES_PROJECT: PROJECT');
    expect(smoke).not.toContain("spawn('bun', ['server.ts'])");
    expect(smoke).toContain("page.on('requestfailed'");
    expect(smoke).toContain('data-cqm-static-host="true"');
    expect(smoke).toContain('Pages server exited during readiness');
    expect(smoke).toContain('Pages server exited before smoke completion');
    expect(smoke.indexOf('api.pauseAutoFrames()')).toBeLessThan(
      smoke.indexOf('screenshot = await page.screenshot'),
    );
    expect(smoke.indexOf('window.__CQM__?.resumeAutoFrames?.()')).toBeGreaterThan(
      smoke.indexOf('screenshot = await page.screenshot'),
    );
  });

  test('brain slot visualizers are idempotent and accessible', () => {
    const code = src('src/ui/brain-slots.ts');
    expect(code).toContain('cqmBrainSlotsWired');
    expect(code).toContain("canvas.setAttribute('aria-label'");
    expect(code).toContain('devicePixelRatio');
    expect(code).toContain('function drawGrid');
    expect(code).not.toContain('function drawBars');
    expect(code).not.toContain('Date.now()');
  });

  test('modal overlays close from Escape immediately after opening', () => {
    const access = src('src/ui/access-puzzle.ts');
    const settings = src('src/ui/settings-panel.ts');
    expect(access).toContain("aria-modal', 'true'");
    expect(access).toContain('wireClose(this.modal');
    expect(access).toContain('this.toggle.focus()');
    expect(settings).toContain('this.modal.focus()');
  });

  test('hot-reload teardown mirrors fullscreen and superhero HUD listeners', () => {
    const centerHud = src('src/ui/center-hud.ts');
    const superheroHud = src('src/ui/superhero-hud.ts');
    const world = src('src/world.ts');
    expect(centerHud).toContain("document.removeEventListener('fullscreenchange', scheduleFit)");
    expect(superheroHud).toContain('dispose(): void');
    expect(world).toContain('this.superheroHud.dispose()');
  });

  test('onboarding overlay clears the inline display:none/opacity:0 before adding .on', () => {
    const code = src('src/ui/onboarding.ts');
    // glassPanel()/overlayPanel() set `display:none; opacity:0` inline; an inline style always
    // beats the `.on` class rule (it carries no !important), so toggling the class alone can
    // never show the element. Pin that the open path sets these inline properties directly.
    expect(code).toMatch(/this\.root\.style\.display\s*=\s*['"]flex['"]/);
    expect(code).toMatch(/this\.root\.style\.opacity\s*=\s*['"]1['"]/);
  });
});

describe('world integration cadence static contracts', () => {
  test('driveSuper steps symbiosis and myth ritual exactly once per apex beat', () => {
    const code = src('src/world.ts');
    const start = code.indexOf('private driveSuper');
    const end = code.indexOf('  /** V34', start);
    const driveSuper = code.slice(start, end);
    expect((driveSuper.match(/this\.symbiosis\.step\(\)/g) ?? []).length).toBe(1);
    expect((driveSuper.match(/this\.mythRitual\.step\(\)/g) ?? []).length).toBe(1);
  });
});

describe('persistent dock controls (owner-critical)', () => {
  // The owner relies on a PAUSE control in the always-visible dock, immediately next to MUTE, to
  // freeze all motion and roam/inspect. It was silently removed once (relocated into SETTINGS at
  // V103). These seals keep it present AND correctly wired so it cannot regress unnoticed again.
  test('PAUSE + MUTE live ONCE in the green bottom toolbar (de-duplicated from the center HUD)', () => {
    const index = src('index.html');
    const centerHud = src('src/ui/center-hud.ts');
    // The green bottom toolbar (index.html #bar) is the SINGLE home for these controls.
    expect(index).toContain('data-action="pause"');
    expect(index).toContain('data-action="mute"');
    // They must NOT be duplicated in the center-hud persist-nav (owner UX: no double buttons).
    expect(centerHud).not.toContain("'⏸ PAUSE'");
    expect(centerHud).not.toContain("mkAct('🔇 MUTE'");
  });

  test('PANEL toolbar button dispatches openMasterPanel AND the center HUD listens for it', () => {
    const input = src('src/ui/input.ts');
    const index = src('index.html');
    const world = src('src/world.ts');
    const centerHud = src('src/ui/center-hud.ts');
    const copilot = src('src/ui/copilot.ts');
    expect(index).toContain('data-action="panel"');
    expect(input).toMatch(/panel:\s*'openMasterPanel'/);
    expect(world).toContain('openMasterPanel:');
    expect(world).toContain("new CustomEvent('cqm:open-master-panel')");
    // The button was DEAD because nothing handled the event — seal that the center HUD now listens.
    expect(centerHud).toContain("'cqm:open-master-panel'");
    expect(centerHud).toContain('onOpenMasterPanel');
    // And the explicit Copilot fallback handle that world.openMasterPanel calls must exist.
    expect(world).toContain('window.cqmCopilot?.toggle(true)');
    expect(copilot).toContain('window.cqmCopilot =');
    expect(copilot).toContain('toggle(open?: boolean)');
    expect(copilot).toContain('const serverApi = serverApiAvailable()');
    // Merely mounting the closed panel must not probe seven external LLMs. The boot tail uses the
    // inert catalog; live populateStaticProviders remains user-triggered inside diagnostics.
    const prepopulate = copilot.slice(copilot.indexOf('// Pre-populate provider list'));
    expect(prepopulate).toContain('if (!serverApi)');
    expect(prepopulate).toContain('populateStaticProviderCatalog');
    expect(prepopulate).not.toContain('populateStaticProviders(sel, prov)');
  });

  test('pause action is wired to a true freeze (timeScale -> 0)', () => {
    const input = src('src/ui/input.ts');
    const world = src('src/world.ts');
    // Delegated [data-action="pause"] resolves to UiActions.togglePause.
    expect(input).toMatch(/pause:\s*'togglePause'/);
    // togglePause performs a real freeze (timeScale set to 0) as the first step of the three-state
    // cycle RUNNING → SUSPENDED → FROZEN → RUNNING — not merely a slow-motion multiplier.
    expect(world).toMatch(/togglePause:[\s\S]{0,800}timeScale\s*=\s*0/);
    // And it surfaces EACH paused state so the owner has unambiguous feedback.
    expect(world).toMatch(/togglePause:[\s\S]{0,900}'SUSPENDED/);
    expect(world).toMatch(/togglePause:[\s\S]{0,900}'FROZEN/);
    // SUSPENDED mode must freeze sim bodies but still let the free camera consume real UI delta.
    expect(world).toMatch(
      /stepSuspended\(uiDt: number, vt: number\)[\s\S]{0,600}this\.updateCamera\(0,\s*uiDt,\s*vt\)/,
    );
    // …yet creatures stay ALIVE IN PLACE (owner #4): the suspended branch advances a visual-only clock
    // and feeds it to the instanced shader time, so bodies writhe/shimmer where they stand while their
    // TRAVEL (position) is frozen — not a stiff, wholly-dead freeze.
    expect(world).toMatch(
      /if \(s\.timeScale === 0\)[\s\S]{0,700}this\.pauseVisualClock\s*\+=\s*uiDt/,
    );
    // The suspended/frozen frame feeds that visual clock (vt) into the instanced shader's uTime.
    expect(world).toMatch(/fr\.t\s*=\s*vt/);
  });

  test('Archon panel five-card telemetry is live, not clock-fabricated', () => {
    const panel = src('src/ui/super-panel.ts');
    const world = src('src/world.ts');
    expect(panel).not.toContain('Date.now()');
    expect(panel).toContain('interface ArchonInfo');
    for (const key of [
      'surprise',
      'aggression',
      'deception',
      'curiosity',
      'dreaming',
      'hallucinating',
      'reasoning',
      'selfAware',
      'novelty',
      'ignition',
      'confidence',
    ]) {
      expect(panel).toContain(key);
    }
    expect(world).toContain('const mindSnap = this.superMinds[i]?.snapshot?.() ?? null');
    expect(world).toContain('confidence: mindSnap?.metacog?.confidence ?? 0');
  });
});
