#!/usr/bin/env bun
/**
 * Browser visual smoke for the main WebGL dome.
 *
 * Starts the local Bun server, opens Chromium through Playwright, waits for bounded natural animation
 * frames, samples a full-viewport PNG, and writes artifacts to output/playwright/. This is deliberately
 * separate from `bun run check`: it installs/launches a browser, so callers opt into the visual proof
 * when they need it.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISUAL_SMOKE_RAF_GATE_SOURCE } from './browser-visual-smoke-raf-gate';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'output', 'playwright');
const RUNNER_DIR = join(OUT_DIR, 'npm-runner');
const BROWSERS_DIR = join(RUNNER_DIR, 'ms-playwright');
const NODE_EXECUTABLE = process.platform === 'win32' ? 'node.exe' : 'node';
const PORT = Number(process.env.CQM_VISUAL_SMOKE_PORT ?? 3107);
const VALID_TIERS = new Set(['phone', 'tablet', 'laptop', 'desktop', 'ultra', 'mega']);
const TIERS = (process.env.CQM_VISUAL_SMOKE_TIERS ?? 'phone,desktop')
  .split(',')
  .map((tier) => tier.trim())
  .filter((tier) => tier.length > 0);

function fail(msg: string): never {
  console.error(`visual-smoke: FAIL - ${msg}`);
  process.exit(1);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopProcessTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  process.kill(pid, 'SIGTERM');
}

function killProcess(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  process.kill(pid, 'SIGKILL');
}

function runChecked(label: string, exe: string, args: string[], cwd: string): void {
  console.log(`visual-smoke: ${label}`);
  const result = spawnSync(exe, args, {
    cwd,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS_DIR },
    stdio: 'inherit',
  });
  if (result.error) fail(`${label} failed to launch: ${result.error.message}`);
  if (result.status !== 0) {
    const outcome = result.status ?? `signal ${result.signal ?? 'unknown'}`;
    fail(`${label} exited with ${outcome}`);
  }
}

function ensurePlaywright(): void {
  mkdirSync(RUNNER_DIR, { recursive: true });
  const packagePath = join(ROOT, 'node_modules', 'playwright', 'package.json');
  if (!existsSync(packagePath)) fail('pinned Playwright dependency missing — run `bun install`');
  const cli = join(ROOT, 'node_modules', 'playwright', 'cli.js');
  if (!existsSync(cli)) fail('pinned Playwright CLI missing — run `bun install`');
  // The pinned CLI performs its own idempotent browser-presence check and install locking. Running
  // it every smoke avoids a racy home-grown readiness marker and never resolves a mutable latest tag.
  // Invoke the JavaScript entry point directly because Node cannot spawn a Windows .cmd shim without
  // a shell; keeping shell execution disabled also avoids command-line re-parsing.
  runChecked(
    'ensuring pinned Chromium browser',
    NODE_EXECUTABLE,
    [cli, 'install', 'chromium'],
    ROOT,
  );
}

async function waitForHealth(stderr: () => string): Promise<void> {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await wait(250);
  }
  fail(`server did not start on :${PORT}\n${stderr()}`);
}

async function waitForProcess(
  proc: ReturnType<typeof spawn>,
  timeoutMs: number,
): Promise<number | null> {
  return await new Promise((resolve) => {
    const timer = setTimeout(() => {
      stopProcessTree(proc.pid);
      resolve(-1);
    }, timeoutMs);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      console.error(err);
      resolve(-2);
    });
  });
}

function playwrightRunnerSource(): string {
  const rafGateSource = JSON.stringify(VISUAL_SMOKE_RAF_GATE_SOURCE);
  return String.raw`
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const baseUrl = process.env.CQM_VISUAL_SMOKE_URL;
const outDir = process.env.CQM_VISUAL_SMOKE_OUT;
const visualSmokeRafGateSource = ${rafGateSource};
const tiers = (process.env.CQM_VISUAL_SMOKE_TIERS ?? 'phone,desktop')
  .split(',')
  .map((tier) => tier.trim())
  .filter(Boolean);
// A single naturally presented frame proves foreground liveness without multiplying the full-world render
// cost. Callers may request a longer settle through the existing env knobs; retries remain one real frame.
const firstSampleSteps = Number(process.env.CQM_VISUAL_SMOKE_FIRST_STEPS ?? 1);
const retrySampleSteps = Number(process.env.CQM_VISUAL_SMOKE_RETRY_STEPS ?? 1);
const sampleAttempts = Number(process.env.CQM_VISUAL_SMOKE_ATTEMPTS ?? 4);
const operationTimeoutMs = Number(process.env.CQM_VISUAL_SMOKE_OPERATION_TIMEOUT_MS ?? 30000);
// Desktop's 60,000-flora full-fidelity frame can exceed 30s under Chromium SwiftShader even though
// hardware WebGL is far faster. Keep the stage finite without making software rendering a false fail.
const frameAdvanceTimeoutMs = Number(process.env.CQM_VISUAL_SMOKE_FRAME_TIMEOUT_MS ?? 90000);
const screenshotTimeoutMs = Number(process.env.CQM_VISUAL_SMOKE_SCREENSHOT_TIMEOUT_MS ?? 30000);
const stressDurationMs = Number(process.env.CQM_VISUAL_SMOKE_STRESS_MS ?? 15000);
const teardownTimeoutMs = Number(process.env.CQM_VISUAL_SMOKE_TEARDOWN_TIMEOUT_MS ?? 10000);

if (!baseUrl || !outDir) throw new Error('missing CQM_VISUAL_SMOKE_URL or CQM_VISUAL_SMOKE_OUT');

await mkdir(outDir, { recursive: true });
const summaryPath = join(outDir, 'visual-smoke-summary.json');
const runStartedAt = new Date().toISOString();
await rm(summaryPath, { force: true });
await writeFile(
  summaryPath,
  JSON.stringify(
    { status: 'running', requestedTiers: tiers, completedTiers: [], startedAt: runStartedAt, results: [] },
    null,
    2,
  ),
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function settleBounded(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

class StageTimeoutError extends Error {
  constructor(stage, timeoutMs) {
    super(stage + ' timed out after ' + timeoutMs + 'ms');
    this.name = 'StageTimeoutError';
    this.stage = stage;
    this.timeoutMs = timeoutMs;
  }
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function classifyFailure(error, lifecycle) {
  const message = errorText(error);
  if (lifecycle.pageCrashed || /target crashed|page crashed|renderer process crashed/i.test(message)) {
    return 'page-crash';
  }
  if (error instanceof StageTimeoutError) return 'stage-timeout';
  if (/timeout|timed out/i.test(message)) return 'playwright-timeout';
  if (lifecycle.currentStage === 'assertions') return 'assertion';
  return 'operation-error';
}

async function runStage(lifecycle, stage, timeoutMs, operation) {
  const startedAt = Date.now();
  lifecycle.currentStage = stage;
  const record = { stage, status: 'running', startedAt, durationMs: 0 };
  lifecycle.stages.push(record);
  console.log('visual-smoke: stage ' + lifecycle.tier + ' ' + stage);

  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const timeout = new StageTimeoutError(stage, timeoutMs);
      lifecycle.lastFailure = {
        stage,
        classification: 'stage-timeout',
        message: timeout.message,
      };
      reject(timeout);
      const page = lifecycle.page;
      if (page && !page.isClosed()) {
        void page.close({ runBeforeUnload: false }).catch(() => undefined);
      }
    }, timeoutMs);
  });

  try {
    const value = await Promise.race([Promise.resolve().then(operation), deadline]);
    record.status = 'ok';
    return value;
  } catch (error) {
    const classification = classifyFailure(error, lifecycle);
    record.status = 'failed';
    record.classification = classification;
    record.message = errorText(error);
    lifecycle.lastFailure = { stage, classification, message: record.message };
    throw error;
  } finally {
    clearTimeout(timer);
    record.durationMs = Date.now() - startedAt;
  }
}

async function writeFailureArtifact(report, lifecycle, error) {
  const classification = classifyFailure(error, lifecycle);
  report.status = 'failed';
  report.failure = {
    stage: lifecycle.lastFailure?.stage ?? lifecycle.currentStage,
    classification,
    message: errorText(error),
    pageCrashed: lifecycle.pageCrashed,
    browserDisconnected: lifecycle.browserDisconnected,
  };
  report.stages = lifecycle.stages;
  const path = join(outDir, 'visual-smoke-' + lifecycle.tier + '-failure.json');
  await writeFile(path, JSON.stringify(report, null, 2));
}

async function closeContextBounded(context) {
  if (!context) return;
  await settleBounded(context.close().catch(() => undefined), teardownTimeoutMs);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-webgl2'],
  timeout: operationTimeoutMs,
});
console.log('visual-smoke: Chromium launched');

const results = [];

function tierUrl(tier) {
  const url = new URL(baseUrl);
  url.searchParams.set('tier', tier);
  return url.toString();
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function samplePng(buffer) {
  const png = Buffer.from(buffer);
  if (
    png.length < 33 ||
    png[0] !== 0x89 ||
    png[1] !== 0x50 ||
    png[2] !== 0x4e ||
    png[3] !== 0x47
  ) {
    return null;
  }
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];
  let off = 8;
  while (off + 12 <= png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString('ascii', off + 4, off + 8);
    const start = off + 8;
    const end = start + len;
    if (end + 4 > png.length) return null;
    if (type === 'IHDR') {
      width = png.readUInt32BE(start);
      height = png.readUInt32BE(start + 4);
      bitDepth = png[start + 8] ?? 0;
      colorType = png[start + 9] ?? 0;
    } else if (type === 'IDAT') {
      idats.push(png.subarray(start, end));
    } else if (type === 'IEND') {
      break;
    }
    off = end + 4;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (width <= 0 || height <= 0 || bitDepth !== 8 || channels === 0 || idats.length === 0) {
    return null;
  }
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idats));
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  const stepX = Math.max(1, Math.floor(width / 320));
  const stepY = Math.max(1, Math.floor(height / 180));
  const buckets = new Set();
  let src = 0;
  let bright = 0;
  let alpha = 0;
  let lumaSum = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++] ?? 0;
    for (let x = 0; x < stride; x++) {
      const v = raw[src++] ?? 0;
      const left = x >= channels ? cur[x - channels] ?? 0 : 0;
      const up = prev[x] ?? 0;
      const upLeft = x >= channels ? prev[x - channels] ?? 0 : 0;
      if (filter === 0) cur[x] = v;
      else if (filter === 1) cur[x] = (v + left) & 255;
      else if (filter === 2) cur[x] = (v + up) & 255;
      else if (filter === 3) cur[x] = (v + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) cur[x] = (v + paeth(left, up, upLeft)) & 255;
      else return null;
    }
    if (y % stepY === 0) {
      for (let x = 0; x < width; x += stepX) {
        const p = x * channels;
        const r = cur[p] ?? 0;
        const g = cur[p + 1] ?? 0;
        const b = cur[p + 2] ?? 0;
        const a = channels === 4 ? cur[p + 3] ?? 0 : 255;
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumaSum += luma;
        if (a > 0) alpha++;
        if (luma > 8) bright++;
        if (count % 64 === 0) buckets.add([r >> 4, g >> 4, b >> 4, a >> 6].join(','));
        count++;
      }
    }
    prev.set(cur);
  }
  return {
    width,
    height,
    brightRatio: count > 0 ? bright / count : 0,
    alphaRatio: count > 0 ? alpha / count : 0,
    avgLuma: count > 0 ? lumaSum / count : 0,
    uniqueBuckets: buckets.size,
  };
}

async function readCanvasMetadata(page) {
  return await page.evaluate(() => {
    const canvas = document.getElementById('c');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#c canvas missing');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL context missing');
    const rect = canvas.getBoundingClientRect();
    const world = window.__CQM__?.world;
    return {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      drawingBufferWidth: gl.drawingBufferWidth,
      drawingBufferHeight: gl.drawingBufferHeight,
      frame: world?.state?.frame ?? null,
      elapsed: world?.state?.elapsed ?? null,
      qualityTier: world?.quality?.tier ?? null,
      entityCount: world?.entities?.list?.length ?? null,
    };
  });
}

async function waitForNaturalFrames(page, frameCount) {
  const armed = await page.evaluate((frames) => {
    const gate = window.__CQM_VISUAL_SMOKE_RAF_GATE__;
    if (!gate) throw new Error('visual-smoke rAF gate missing');
    return gate.pauseAfterWorldFrames(frames);
  }, frameCount);
  await page.waitForFunction(
    ({ targetFrame }) => {
      const currentFrame = window.__CQM__?.world?.state?.frame;
      const gate = window.__CQM_VISUAL_SMOKE_RAF_GATE__;
      return Number.isFinite(currentFrame) && currentFrame >= targetFrame && gate?.heldCount > 0;
    },
    armed,
    // Poll on an interval rather than another rAF callback: the WORLD frame must still advance through its
    // real rAF loop. The gate then holds the NEXT callback so screenshot/CDP work cannot starve behind
    // continuous software rendering; resuming requeues every held callback without fabricating a frame.
    { polling: 250, timeout: frameAdvanceTimeoutMs },
  );
  return await readCanvasMetadata(page);
}

async function resumeNaturalFrames(page) {
  return await page.evaluate(() => {
    const gate = window.__CQM_VISUAL_SMOKE_RAF_GATE__;
    if (!gate) throw new Error('visual-smoke rAF gate missing');
    return gate.resume();
  });
}

async function readBootOverlay(page) {
  return await page.evaluate(() => {
    const boot = document.getElementById('cqm-boot');
    if (!boot) {
      return {
        present: false,
        visible: false,
        done: true,
        opacity: 0,
        display: 'none',
        visibility: 'hidden',
        width: 0,
        height: 0,
      };
    }
    const style = getComputedStyle(boot);
    const rect = boot.getBoundingClientRect();
    const opacity = Number.parseFloat(style.opacity || '1');
    const visible =
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0 &&
      opacity > 0.05;
    return {
      present: true,
      visible,
      done: boot.classList.contains('done'),
      opacity,
      display: style.display,
      visibility: style.visibility,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function readOnboardingOverlay(page) {
  return await page.evaluate(() => {
    const overlay = document.getElementById('cqm-onboarding');
    if (!overlay) {
      return {
        present: false,
        visible: false,
        ariaHidden: 'true',
        opacity: 0,
        display: 'none',
        visibility: 'hidden',
        width: 0,
        height: 0,
      };
    }
    const style = getComputedStyle(overlay);
    const rect = overlay.getBoundingClientRect();
    const opacity = Number.parseFloat(style.opacity || '1');
    const ariaHidden = overlay.getAttribute('aria-hidden') ?? 'false';
    const visible =
      ariaHidden !== 'true' &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0 &&
      opacity > 0.05;
    return {
      present: true,
      visible,
      ariaHidden,
      opacity,
      display: style.display,
      visibility: style.visibility,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function ensureOnboardingHidden(page, tier) {
  let overlay = await readOnboardingOverlay(page);
  if (!overlay.visible) return overlay;
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.locator('#cqm-onboarding [data-go]').click({ timeout: 1000 }).catch(() => undefined);
  try {
    await page.waitForFunction(
      () => {
        const overlay = document.getElementById('cqm-onboarding');
        if (!overlay) return true;
        const style = getComputedStyle(overlay);
        const rect = overlay.getBoundingClientRect();
        const opacity = Number.parseFloat(style.opacity || '1');
        return (
          overlay.getAttribute('aria-hidden') === 'true' ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          opacity <= 0.05
        );
      },
      null,
      { timeout: 5000 },
    );
  } catch (err) {
    overlay = await readOnboardingOverlay(page);
    throw new Error(
      tier +
        ': onboarding overlay did not clear before visual capture: ' +
        JSON.stringify(overlay) +
        ' cause=' +
        (err instanceof Error ? err.message : String(err)),
    );
  }
  overlay = await readOnboardingOverlay(page);
  if (overlay.visible) {
    throw new Error(tier + ': onboarding overlay still visible: ' + JSON.stringify(overlay));
  }
  return overlay;
}

async function waitForBootOverlayGone(page, tier) {
  try {
    await page.waitForFunction(
      () => {
        const boot = document.getElementById('cqm-boot');
        if (!boot) return true;
        const style = getComputedStyle(boot);
        const rect = boot.getBoundingClientRect();
        const opacity = Number.parseFloat(style.opacity || '1');
        return (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          opacity <= 0.05
        );
      },
      null,
      { timeout: 120000 },
    );
  } catch (err) {
    const boot = await readBootOverlay(page);
    throw new Error(
      tier +
        ': boot overlay did not clear before visual capture: ' +
        JSON.stringify(boot) +
        ' cause=' +
        (err instanceof Error ? err.message : String(err)),
    );
  }
  await page.waitForTimeout(120);
  const boot = await readBootOverlay(page);
  if (boot.visible) {
    throw new Error(tier + ': boot overlay still visible before screenshot: ' + JSON.stringify(boot));
  }
  return boot;
}

async function startHabitatStressProbe(page) {
  return await page.evaluate(() => {
    const api = window.__CQM__;
    if (!api?.world) throw new Error('window.__CQM__.world missing');
    const world = api.world;
    const camera = api.camera;
    const previous = window.__CQM_VISUAL_SMOKE_STRESS__;
    if (previous?.rafId) cancelAnimationFrame(previous.rafId);
    const probe = {
      active: true,
      startFrame: world.state.frame,
      startedAt: performance.now(),
      maxWorkerActive: 0,
      rafId: 0,
    };
    window.__CQM_VISUAL_SMOKE_STRESS__ = probe;

    const observe = () => {
      if (!probe.active) return;
      // Keep the largest habitat, narrowest supported lens, and strongest dynamic scalars live for a
      // sustained foreground sample. Real rAF remains in control; this observer never fabricates steps.
      world.state.viewIdx = 3;
      world.state.chaos = 10;
      world.state.entropy = 10;
      world.state.weatherIdx = 2;
      camera.fov = 35;
      camera.updateProjectionMatrix();
      const stats = world.workerPool?.getStats();
      probe.maxWorkerActive = Math.max(probe.maxWorkerActive, stats?.activeTasks ?? 0);
      probe.rafId = requestAnimationFrame(observe);
    };
    observe();
    return { startFrame: probe.startFrame, startedAt: probe.startedAt };
  });
}

async function finishHabitatStressProbe(page) {
  return await page.evaluate(async (workerTimeoutMs) => {
    const api = window.__CQM__;
    if (!api?.world) throw new Error('window.__CQM__.world missing');
    const world = api.world;
    const camera = api.camera;
    const probe = window.__CQM_VISUAL_SMOKE_STRESS__;
    if (!probe) throw new Error('habitat stress probe was not started');
    probe.active = false;
    if (probe.rafId) cancelAnimationFrame(probe.rafId);

    const durationMs = performance.now() - probe.startedAt;
    const endFrame = world.state.frame;
    const corners = [];
    for (const x of [-1080, 1080]) {
      for (const y of [6, 720]) {
        for (const z of [-1080, 1080]) {
          const projected = new api.THREE.Vector3(x, y, z).project(camera);
          corners.push({
            x: projected.x,
            y: projected.y,
            z: projected.z,
            inside:
              Number.isFinite(projected.x) &&
              Number.isFinite(projected.y) &&
              Number.isFinite(projected.z) &&
              Math.abs(projected.x) <= 1.001 &&
              Math.abs(projected.y) <= 1.001 &&
              projected.z >= -1.001 &&
              projected.z <= 1.001,
          });
        }
      }
    }

    const controller = new AbortController();
    const workerTimer = setTimeout(() => controller.abort(), workerTimeoutMs);
    let workerResponse;
    let workerBody;
    try {
      workerResponse = await fetch('/workers/simulation-worker.js', {
        cache: 'no-store',
        signal: controller.signal,
      });
      workerBody = await workerResponse.text();
    } finally {
      clearTimeout(workerTimer);
    }
    const canvas = document.getElementById('c');
    const gl =
      canvas instanceof HTMLCanvasElement
        ? canvas.getContext('webgl2') || canvas.getContext('webgl')
        : null;
    const debugRenderer = gl?.getExtension('WEBGL_debug_renderer_info') ?? null;
    const result = {
      tier: world.quality.tier,
      measurementClass: 'headless-browser-liveness-not-production-fps',
      durationMs,
      framesAdvanced: endFrame - probe.startFrame,
      observedFps: durationMs > 0 ? ((endFrame - probe.startFrame) * 1000) / durationMs : 0,
      stress: {
        chaos: world.state.chaos,
        entropy: world.state.entropy,
        weatherIdx: world.state.weatherIdx,
      },
      camera: {
        viewIdx: world.state.viewIdx,
        fov: camera.fov,
        far: camera.far,
        position: camera.position.toArray(),
        allEightCornersVisible: corners.every((corner) => corner.inside),
        corners,
      },
      flora: {
        instances: world.alienFlora?.instanceCount ?? null,
        meshDrawGroups: world.alienFlora?.meshes?.length ?? null,
      },
      workers: {
        runtimeMode: world.workerPool ? 'worker-pool' : 'dormant-main-thread',
        current: world.workerPool?.getStats() ?? null,
        maxActiveObserved: probe.maxWorkerActive,
        perfSnapshot: world.getPerfSnapshot(),
        asset: {
          ok: workerResponse.ok,
          status: workerResponse.status,
          contentType: workerResponse.headers.get('content-type'),
          bytes: workerBody.length,
        },
      },
      renderer: {
        vendor: gl
          ? gl.getParameter(debugRenderer?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR)
          : 'unavailable',
        name: gl
          ? gl.getParameter(debugRenderer?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)
          : 'unavailable',
        render: { ...api.renderer.info.render },
        memory: { ...api.renderer.info.memory },
      },
      perfHud: document.querySelector('#perf-hud')?.textContent?.trim() ?? '',
    };
    delete window.__CQM_VISUAL_SMOKE_STRESS__;
    return result;
  }, Math.min(operationTimeoutMs, 10000));
}

let activeLifecycle = null;
browser.on('disconnected', () => {
  if (activeLifecycle) activeLifecycle.browserDisconnected = true;
});

try {
  for (const tier of tiers) {
    console.log('visual-smoke: opening ' + tier);
    const screenshotPath = join(outDir, 'visual-smoke-' + tier + '.png');
    const worldScreenshotPath = join(outDir, 'visual-smoke-' + tier + '-world.png');
    const resultPath = join(outDir, 'visual-smoke-' + tier + '.json');
    const failurePath = join(outDir, 'visual-smoke-' + tier + '-failure.json');
    await Promise.all([
      rm(screenshotPath, { force: true }),
      rm(worldScreenshotPath, { force: true }),
      rm(resultPath, { force: true }),
      rm(failurePath, { force: true }),
    ]);

    let context = null;
    let page = null;
    const consoleErrors = [];
    const pageErrors = [];
    const report = {
      tier,
      status: 'running',
      url: tierUrl(tier),
      consoleErrors,
      pageErrors,
    };
    const lifecycle = {
      tier,
      currentStage: 'setup',
      stages: [],
      page: null,
      pageCrashed: false,
      browserDisconnected: false,
      lastFailure: null,
    };
    activeLifecycle = lifecycle;

    try {
      context = await runStage(lifecycle, 'context-create', operationTimeoutMs, () =>
        browser.newContext({
          viewport: tier === 'phone' ? { width: 390, height: 844 } : { width: 1280, height: 720 },
          deviceScaleFactor: tier === 'phone' ? 2 : 1,
          isMobile: tier === 'phone',
          hasTouch: tier === 'phone',
        }),
      );
      context.setDefaultTimeout(operationTimeoutMs);
      context.setDefaultNavigationTimeout(120000);
      await runStage(lifecycle, 'init-script', operationTimeoutMs, async () => {
        await context.addInitScript({ content: visualSmokeRafGateSource });
        await context.addInitScript(() => {
          try {
            localStorage.setItem('cqm.onboarding.dismissed', '1');
          } catch {
            /* localStorage may be unavailable in hardened browser contexts */
          }
        });
      });
      page = await runStage(lifecycle, 'page-create', operationTimeoutMs, () => context.newPage());
      lifecycle.page = page;
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('crash', () => {
        lifecycle.pageCrashed = true;
      });

      await runStage(lifecycle, 'navigation', 125000, () =>
        page.goto(tierUrl(tier), { waitUntil: 'domcontentloaded', timeout: 120000 }),
      );
      report.url = page.url();
      await runStage(lifecycle, 'canvas-ready', 65000, () =>
        page.waitForSelector('#c', { state: 'attached', timeout: 60000 }),
      );
      await runStage(lifecycle, 'world-hook-ready', 125000, () =>
        page.waitForFunction(() => Boolean(window.__CQM__?.world), null, { timeout: 120000 }),
      );
      console.log('visual-smoke: hook ready ' + tier);
      await runStage(lifecycle, 'overlay-dismiss', operationTimeoutMs, async () => {
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(50);
      });
      const bootState = await runStage(lifecycle, 'boot-overlay', 125000, () =>
        waitForBootOverlayGone(page, tier),
      );
      const onboardingState = await runStage(lifecycle, 'onboarding-overlay', operationTimeoutMs, () =>
        ensureOnboardingHidden(page, tier),
      );
      Object.assign(report, { bootState, onboardingState });
      console.log('visual-smoke: boot overlay gone ' + tier);

      let metrics = null;
      let screenshot = null;
      let screenshotMetrics = null;
      let worldScreenshot = null;
      let worldScreenshotMetrics = null;
      let onboardingStateBeforeScreenshot = onboardingState;
      let samplingPaused = false;
      for (let attempt = 0; attempt < sampleAttempts; attempt++) {
        console.log('visual-smoke: sample ' + tier + ' attempt=' + attempt);
        const frameCount = attempt === 0 ? firstSampleSteps : retrySampleSteps;
        const metadata = await runStage(
          lifecycle,
          'natural-frames-' + attempt,
          frameAdvanceTimeoutMs + 5000,
          () => waitForNaturalFrames(page, frameCount),
        );
        samplingPaused = true;
        onboardingStateBeforeScreenshot = await runStage(
          lifecycle,
          'pre-screenshot-overlay-' + attempt,
          operationTimeoutMs,
          async () => {
            const state = await readOnboardingOverlay(page);
            if (state.visible) {
              throw new Error(
                tier + ': onboarding overlay became visible before capture: ' + JSON.stringify(state),
              );
            }
            return state;
          },
        );
        screenshot = await runStage(
          lifecycle,
          'viewport-screenshot-' + attempt,
          screenshotTimeoutMs + 5000,
          () =>
            page.screenshot({
              path: screenshotPath,
              fullPage: false,
              animations: 'disabled',
              timeout: screenshotTimeoutMs,
            }),
        );
        screenshotMetrics = samplePng(screenshot);
        await runStage(
          lifecycle,
          'world-proof-mask-' + attempt,
          operationTimeoutMs,
          () =>
            page.evaluate(() => {
              const canvas = document.getElementById('c');
              if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#c canvas missing');
              let style = document.getElementById('cqm-visual-smoke-world-proof-style');
              if (!style) {
                style = document.createElement('style');
                style.id = 'cqm-visual-smoke-world-proof-style';
                style.textContent =
                  'html.cqm-visual-smoke-world-proof body > *:not(#c) { visibility: hidden !important; }';
                document.head.append(style);
              }
              document.documentElement.classList.add('cqm-visual-smoke-world-proof');
            }),
        );
        worldScreenshot = await runStage(
          lifecycle,
          'world-proof-screenshot-' + attempt,
          screenshotTimeoutMs + 5000,
          () =>
            page.screenshot({
              path: worldScreenshotPath,
              fullPage: false,
              animations: 'disabled',
              timeout: screenshotTimeoutMs,
            }),
        );
        worldScreenshotMetrics = samplePng(worldScreenshot);
        await runStage(lifecycle, 'world-proof-unmask-' + attempt, operationTimeoutMs, () =>
          page.evaluate(() => {
            document.documentElement.classList.remove('cqm-visual-smoke-world-proof');
          }),
        );
        metrics = {
          ...metadata,
          sampleSource: 'viewport-world-png',
          brightRatio: worldScreenshotMetrics?.brightRatio ?? 0,
          alphaRatio: worldScreenshotMetrics?.alphaRatio ?? 0,
          avgLuma: worldScreenshotMetrics?.avgLuma ?? 0,
          uniqueBuckets: worldScreenshotMetrics?.uniqueBuckets ?? 0,
        };
        Object.assign(report, {
          screenshotPath,
          screenshotBytes: screenshot.length,
          worldScreenshotPath,
          worldScreenshotBytes: worldScreenshot.length,
          worldProofMask: 'body-direct-children-except-canvas',
          metrics,
          screenshotMetrics,
          worldScreenshotMetrics,
          onboardingStateBeforeScreenshot,
        });
        if (metrics.brightRatio > 0.01 && metrics.avgLuma > 1 && metrics.uniqueBuckets >= 6) break;
        await runStage(lifecycle, 'sampling-resume-' + attempt, operationTimeoutMs, () =>
          resumeNaturalFrames(page),
        );
        samplingPaused = false;
      }

      const bootStateAfterScreenshot = await runStage(
        lifecycle,
        'post-screenshot-boot-overlay',
        operationTimeoutMs,
        () => readBootOverlay(page),
      );
      const onboardingStateAfterScreenshot = await runStage(
        lifecycle,
        'post-screenshot-onboarding-overlay',
        operationTimeoutMs,
        () => readOnboardingOverlay(page),
      );
      Object.assign(report, { bootStateAfterScreenshot, onboardingStateAfterScreenshot });

      if (samplingPaused) {
        await runStage(lifecycle, 'sampling-resume', operationTimeoutMs, () =>
          resumeNaturalFrames(page),
        );
        samplingPaused = false;
      }

      console.log('visual-smoke: habitat stress probe ' + tier);
      await runStage(lifecycle, 'habitat-stress-start', operationTimeoutMs, () =>
        startHabitatStressProbe(page),
      );
      await runStage(lifecycle, 'habitat-stress-wait', stressDurationMs + 5000, () =>
        sleep(stressDurationMs),
      );
      await runStage(
        lifecycle,
        'habitat-stress-quiesce',
        frameAdvanceTimeoutMs + 5000,
        () => waitForNaturalFrames(page, 1),
      );
      const habitatStress = await runStage(
        lifecycle,
        'habitat-stress-finalize',
        operationTimeoutMs,
        () => finishHabitatStressProbe(page),
      );
      Object.assign(report, { habitatStress });

      await runStage(lifecycle, 'assertions', operationTimeoutMs, () => {
        if (pageErrors.length > 0) {
          throw new Error(tier + ': page errors: ' + pageErrors.join(' | '));
        }
        if (consoleErrors.length > 0) {
          throw new Error(tier + ': console errors: ' + consoleErrors.join(' | '));
        }
        if (bootStateAfterScreenshot.visible) {
          throw new Error(
            tier +
              ': screenshot captured visible boot overlay: ' +
              JSON.stringify(bootStateAfterScreenshot),
          );
        }
        if (onboardingStateAfterScreenshot.visible) {
          throw new Error(
            tier +
              ': screenshot captured visible onboarding overlay: ' +
              JSON.stringify(onboardingStateAfterScreenshot),
          );
        }
        if (!metrics || metrics.canvasWidth < 100 || metrics.canvasHeight < 100) {
          throw new Error(tier + ': canvas has invalid dimensions');
        }
        const worldScreenshotLooksAlive =
          worldScreenshotMetrics &&
          worldScreenshotMetrics.brightRatio > 0.01 &&
          worldScreenshotMetrics.avgLuma > 1 &&
          worldScreenshotMetrics.uniqueBuckets >= 6;
        if (!worldScreenshotLooksAlive) {
          throw new Error(
            tier +
              ': render appears blank or visually collapsed: ' +
              JSON.stringify({ canvas: metrics, worldScreenshot: worldScreenshotMetrics }),
          );
        }
        if (metrics.frame === null || metrics.frame < 1) {
          throw new Error(tier + ': world frames did not advance');
        }
        const expectedFlora = tier === 'phone' ? 20800 : 60000;
        if (habitatStress.flora.instances !== expectedFlora) {
          throw new Error(
            tier +
              ': flora census mismatch, expected ' +
              expectedFlora +
              ' but saw ' +
              habitatStress.flora.instances,
          );
        }
        if (
          typeof habitatStress.flora.meshDrawGroups !== 'number' ||
          habitatStress.flora.meshDrawGroups < 1 ||
          habitatStress.flora.meshDrawGroups > 9
        ) {
          throw new Error(
            tier + ': invalid flora draw-group count: ' + habitatStress.flora.meshDrawGroups,
          );
        }
        if (!habitatStress.camera.allEightCornersVisible) {
          throw new Error(tier + ': TOP/FOV35 does not frame all eight habitat corners');
        }
        if (
          habitatStress.workers.runtimeMode !== 'dormant-main-thread' ||
          habitatStress.workers.current !== null ||
          habitatStress.workers.perfSnapshot.workerTotal !== 0 ||
          habitatStress.workers.perfSnapshot.workersReady !== false ||
          !habitatStress.workers.asset.ok ||
          habitatStress.workers.asset.bytes < 100 ||
          !String(habitatStress.workers.asset.contentType).includes('javascript')
        ) {
          throw new Error(
            tier + ': dormant worker override or built worker asset does not match ADR 0010',
          );
        }
        if (
          habitatStress.framesAdvanced < 1 ||
          !Number.isFinite(habitatStress.observedFps) ||
          habitatStress.observedFps <= 0
        ) {
          throw new Error(tier + ': sustained foreground performance sample did not advance');
        }
      });

      report.status = 'passed';
      report.stages = lifecycle.stages;
      await runStage(lifecycle, 'success-artifact', operationTimeoutMs, () =>
        writeFile(resultPath, JSON.stringify(report, null, 2)),
      );
      // The staged write serializes while its own stage is still running; rewrite once after the
      // stage resolves so the durable receipt records the final ok status as well.
      report.stages = lifecycle.stages;
      await writeFile(resultPath, JSON.stringify(report, null, 2));
      results.push(report);
      console.log(
        'visual-smoke: OK ' +
          tier +
          ' frame=' +
          metrics.frame +
          ' bright=' +
          metrics.brightRatio.toFixed(3) +
          ' luma=' +
          metrics.avgLuma.toFixed(2) +
          ' buckets=' +
          metrics.uniqueBuckets +
          ' screenshotLuma=' +
          (screenshotMetrics ? screenshotMetrics.avgLuma.toFixed(2) : 'n/a') +
          ' screenshotBuckets=' +
          (screenshotMetrics ? screenshotMetrics.uniqueBuckets : 'n/a') +
          ' worldLuma=' +
          (worldScreenshotMetrics ? worldScreenshotMetrics.avgLuma.toFixed(2) : 'n/a') +
          ' worldBuckets=' +
          (worldScreenshotMetrics ? worldScreenshotMetrics.uniqueBuckets : 'n/a'),
      );
    } catch (error) {
      try {
        await writeFailureArtifact(report, lifecycle, error);
      } catch (artifactError) {
        console.error(
          'visual-smoke: could not write failure artifact for ' +
            tier +
            ': ' +
          errorText(artifactError),
        );
      }
      await writeFile(
        summaryPath,
        JSON.stringify(
          {
            status: 'failed',
            requestedTiers: tiers,
            completedTiers: results.map((result) => result.tier),
            failedTier: tier,
            startedAt: runStartedAt,
            completedAt: new Date().toISOString(),
            failure: report.failure ?? lifecycle.lastFailure,
            results,
          },
          null,
          2,
        ),
      ).catch(() => undefined);
      throw error;
    } finally {
      await closeContextBounded(context);
      activeLifecycle = null;
    }
  }
  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        status: 'passed',
        requestedTiers: tiers,
        completedTiers: results.map((result) => result.tier),
        startedAt: runStartedAt,
        completedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await settleBounded(browser.close().catch(() => undefined), teardownTimeoutMs);
}
`;
}

if (TIERS.length === 0) fail('no tiers selected');
for (const tier of TIERS) {
  if (!VALID_TIERS.has(tier)) fail(`invalid tier "${tier}"`);
}
if (!existsSync(join(ROOT, 'index.html'))) fail('index.html missing');
mkdirSync(OUT_DIR, { recursive: true });
ensurePlaywright();
const runnerPath = join(RUNNER_DIR, 'browser-visual-smoke-runner.mjs');
writeFileSync(runnerPath, playwrightRunnerSource(), 'utf8');

console.log(`visual-smoke: starting server on :${PORT}`);
const server = spawn('bun', ['server.ts'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
let exited = false;
server.on('exit', () => {
  exited = true;
});
server.stderr?.on('data', (chunk: Buffer) => {
  stderr += chunk.toString();
});
server.stdout?.on('data', (chunk: Buffer) => {
  if (process.env.CQM_VISUAL_SMOKE_SERVER_LOG === '1') process.stdout.write(chunk);
});
process.on('exit', () => {
  if (!exited) killProcess(server.pid);
});

try {
  await waitForHealth(() => stderr);
  console.log('visual-smoke: server healthy');
  const child = spawn(NODE_EXECUTABLE, [runnerPath], {
    cwd: RUNNER_DIR,
    env: {
      ...process.env,
      CQM_VISUAL_SMOKE_URL: `http://127.0.0.1:${PORT}/`,
      CQM_VISUAL_SMOKE_OUT: OUT_DIR,
      CQM_VISUAL_SMOKE_TIERS: TIERS.join(','),
      PLAYWRIGHT_BROWSERS_PATH: BROWSERS_DIR,
    },
    stdio: 'inherit',
  });
  // The default command validates phone + desktop serially. Their independent bounded stages can
  // legitimately exceed six minutes in software WebGL, so the parent bound must cover both tiers.
  const timeoutMs = Number(process.env.CQM_VISUAL_SMOKE_TIMEOUT_MS ?? 720000);
  const code = await waitForProcess(child, timeoutMs);
  if (code === -1) fail(`Playwright visual smoke timed out after ${timeoutMs}ms`);
  if (code === -2) fail('Playwright visual smoke failed to launch');
  if (code !== 0) fail(`Playwright visual smoke exited with ${code}`);
  console.log(`visual-smoke: artifacts written to ${OUT_DIR}`);
} finally {
  if (!exited) stopProcessTree(server.pid);
  for (let i = 0; i < 20 && !exited; i++) await wait(100);
  if (!exited) killProcess(server.pid);
}
