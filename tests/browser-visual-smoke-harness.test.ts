import { beforeAll, describe, expect, test } from 'bun:test';
import { VISUAL_SMOKE_RAF_GATE_SOURCE } from '../scripts/browser-visual-smoke-raf-gate';

let source = '';

beforeAll(async () => {
  source = await Bun.file('scripts/browser-visual-smoke.ts').text();
});

describe('browser visual-smoke harness source contract', () => {
  test('uses bounded natural frames and whole-viewport PNG sampling without forced GL reads', () => {
    expect(source).toContain('async function waitForNaturalFrames(page, frameCount)');
    expect(VISUAL_SMOKE_RAF_GATE_SOURCE).toContain("'__CQM_VISUAL_SMOKE_RAF_GATE__'");
    expect(source).toContain('pauseAfterWorldFrames(frames)');
    expect(source).toContain('gate?.heldCount > 0');
    expect(source).toContain('async function resumeNaturalFrames(page)');
    expect(VISUAL_SMOKE_RAF_GATE_SOURCE).toContain('lastAllowedBatchTime ??= time');
    expect(VISUAL_SMOKE_RAF_GATE_SOURCE).toContain('if (time > lastAllowedBatchTime)');
    expect(VISUAL_SMOKE_RAF_GATE_SOURCE).toContain(
      'for (const [id, callback] of pending) schedule(id, callback)',
    );
    expect(source).toContain('{ polling: 250, timeout: frameAdvanceTimeoutMs }');
    expect(source).toContain('process.env.CQM_VISUAL_SMOKE_FIRST_STEPS ?? 1');
    expect(source).toContain('process.env.CQM_VISUAL_SMOKE_RETRY_STEPS ?? 1');
    expect(source).toContain('process.env.CQM_VISUAL_SMOKE_FRAME_TIMEOUT_MS ?? 90000');
    expect(source).toContain('process.env.CQM_VISUAL_SMOKE_TIMEOUT_MS ?? 720000');
    expect(source).toContain("sampleSource: 'viewport-world-png'");
    expect(source).toContain('screenshotMetrics = samplePng(screenshot)');
    expect(source).toContain('worldScreenshotMetrics = samplePng(worldScreenshot)');
    expect(source).toContain("'world-proof-screenshot-' + attempt");
    expect(source).toContain("'world-proof-mask-' + attempt");
    expect(source).toContain('body > *:not(#c) { visibility: hidden !important; }');
    expect(source).toContain("classList.remove('cqm-visual-smoke-world-proof')");
    expect(source).toContain("animations: 'disabled'");
    expect(source).toContain('fullPage: false');
    expect(source).toContain('timeout: screenshotTimeoutMs');
    expect(source).not.toContain('gl.readPixels');
    expect(source).not.toContain('api.step(');
    expect(source).not.toContain('window.__CQM__?.step');

    const naturalFrames = source.indexOf("'natural-frames-' + attempt");
    const screenshot = source.indexOf("'viewport-screenshot-' + attempt");
    const worldScreenshot = source.indexOf("'world-proof-screenshot-' + attempt");
    expect(naturalFrames).toBeGreaterThan(-1);
    expect(screenshot).toBeGreaterThan(naturalFrames);
    expect(worldScreenshot).toBeGreaterThan(screenshot);
  });

  test('rAF gate completes the target native batch before holding and resumes every callback', () => {
    type Callback = (time: number) => void;
    const nativeQueue = new Map<number, Callback>();
    let nextNativeId = 1;
    const host: {
      requestAnimationFrame: (callback: Callback) => number;
      cancelAnimationFrame: (id: number) => void;
      __CQM__: { world: { state: { frame: number } } };
      __CQM_VISUAL_SMOKE_RAF_GATE__?: {
        readonly heldCount: number;
        pauseAfterWorldFrames: (frames: number) => { startFrame: number; targetFrame: number };
        resume: () => number;
      };
    } = {
      requestAnimationFrame(callback) {
        const id = nextNativeId++;
        nativeQueue.set(id, callback);
        return id;
      },
      cancelAnimationFrame(id) {
        nativeQueue.delete(id);
      },
      __CQM__: { world: { state: { frame: 0 } } },
    };
    const flushNativeBatch = (time: number): void => {
      const batch = Array.from(nativeQueue.values());
      nativeQueue.clear();
      for (const callback of batch) callback(time);
    };

    Function('window', VISUAL_SMOKE_RAF_GATE_SOURCE)(host);
    const gate = host.__CQM_VISUAL_SMOKE_RAF_GATE__;
    expect(gate).toBeDefined();
    if (!gate) throw new Error('gate was not installed');

    const events: string[] = [];
    const worldLoop: Callback = (time) => {
      events.push('world:' + time);
      host.__CQM__.world.state.frame++;
      host.requestAnimationFrame(worldLoop);
    };
    const uiLoop: Callback = (time) => {
      events.push('ui:' + time);
      host.requestAnimationFrame(uiLoop);
    };
    host.requestAnimationFrame(worldLoop);
    host.requestAnimationFrame(uiLoop);
    flushNativeBatch(10);

    expect(gate.pauseAfterWorldFrames(1)).toEqual({ startFrame: 1, targetFrame: 2 });
    flushNativeBatch(20);
    expect(events).toEqual(['world:10', 'ui:10', 'world:20', 'ui:20']);
    expect(gate.heldCount).toBe(0);

    flushNativeBatch(30);
    expect(gate.heldCount).toBe(2);
    expect(events).toEqual(['world:10', 'ui:10', 'world:20', 'ui:20']);

    expect(gate.resume()).toBe(2);
    flushNativeBatch(40);
    expect(events).toEqual(['world:10', 'ui:10', 'world:20', 'ui:20', 'world:40', 'ui:40']);

    let cancelledRan = false;
    const cancelledId = host.requestAnimationFrame(() => {
      cancelledRan = true;
    });
    host.cancelAnimationFrame(cancelledId);
    flushNativeBatch(50);
    expect(cancelledRan).toBe(false);
  });

  test('splits stress setup, independent Node wait, and bounded finalization', () => {
    expect(source).toContain('async function startHabitatStressProbe(page)');
    expect(source).toContain('async function finishHabitatStressProbe(page)');
    expect(source).toContain('const stressDurationMs = Number(');
    expect(source).toContain('process.env.CQM_VISUAL_SMOKE_STRESS_MS ?? 15000');

    const start = source.indexOf("'habitat-stress-start'");
    const wait = source.indexOf("'habitat-stress-wait'");
    const quiesce = source.indexOf("'habitat-stress-quiesce'");
    const finish = source.indexOf("'habitat-stress-finalize'");
    expect(start).toBeGreaterThan(-1);
    expect(wait).toBeGreaterThan(start);
    expect(quiesce).toBeGreaterThan(wait);
    expect(finish).toBeGreaterThan(quiesce);
    expect(source.slice(wait, quiesce)).toContain('sleep(stressDurationMs)');
    expect(source.slice(quiesce, finish)).toContain('waitForNaturalFrames(page, 1)');
  });

  test('classifies crashes and timeouts and emits a focused failure artifact', () => {
    expect(source).toContain('class StageTimeoutError extends Error');
    expect(source).toContain("return 'stage-timeout'");
    expect(source).toContain("return 'page-crash'");
    expect(source).toContain("page.on('crash'");
    expect(source).toContain('page.close({ runBeforeUnload: false })');
    expect(source).toContain("'-failure.json'");
    expect(source).toContain('await writeFailureArtifact(report, lifecycle, error)');
    expect(source).toContain('report.stages = lifecycle.stages');
    expect(source).toContain('await settleBounded(context.close().catch(() => undefined)');
    expect(source).toContain('await rm(summaryPath, { force: true })');
    expect(source).toContain("status: 'running', requestedTiers: tiers");
    expect(source).toContain("status: 'failed'");
    expect(source).toContain("status: 'passed'");
    expect(source).toContain('completedTiers: results.map((result) => result.tier)');
  });

  test('retains the existing fidelity and habitat stress contract', () => {
    expect(source).toContain(
      "args: ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-webgl2']",
    );
    expect(source).toContain("viewport: tier === 'phone' ? { width: 390, height: 844 }");
    expect(source).toContain("deviceScaleFactor: tier === 'phone' ? 2 : 1");
    expect(source).toContain("const expectedFlora = tier === 'phone' ? 20800 : 60000");
    expect(source).toContain('world.state.chaos = 10');
    expect(source).toContain('world.state.entropy = 10');
    expect(source).toContain('world.state.weatherIdx = 2');
    expect(source).toContain('camera.fov = 35');
    expect(source).toContain("measurementClass: 'headless-browser-liveness-not-production-fps'");
    expect(source).toContain(
      "runtimeMode: world.workerPool ? 'worker-pool' : 'dormant-main-thread'",
    );
    expect(source).toContain("habitatStress.workers.runtimeMode !== 'dormant-main-thread'");
    expect(source).toContain('habitatStress.workers.perfSnapshot.workerTotal !== 0');
    expect(source).toContain('habitatStress.workers.perfSnapshot.workersReady !== false');
    expect(source).not.toContain("url.searchParams.set('fx'");
  });
});
