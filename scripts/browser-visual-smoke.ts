#!/usr/bin/env bun
/**
 * Browser visual smoke for the main WebGL dome.
 *
 * Starts the local Bun server, opens Chromium through Playwright, drives a handful of deterministic
 * localhost-only `window.__CQM__.step()` frames, samples the main WebGL canvas, and writes artifacts to
 * output/playwright/. This is deliberately separate from `bun run check`: it may download/launch a
 * browser through npx, so callers opt into the visual proof when they need it.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'output', 'playwright');
const RUNNER_DIR = join(OUT_DIR, 'npm-runner');
const BROWSERS_DIR = join(RUNNER_DIR, 'ms-playwright');
const NODE_EXECUTABLE = process.platform === 'win32' ? 'node.exe' : 'node';
const PORT = Number(process.env.CQM_VISUAL_SMOKE_PORT ?? 3107);
const PROJECT = process.env.CQM_VISUAL_SMOKE_PROJECT ?? 'cosmogonic-quantum-mechalogodrom';
const SITE_DIR = join(ROOT, 'site');
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

function runChecked(
  label: string,
  exe: string,
  args: string[],
  cwd: string,
  extraEnv: Record<string, string> = {},
): void {
  console.log(`visual-smoke: ${label}`);
  const result = spawnSync(exe, args, {
    cwd,
    env: { ...process.env, ...extraEnv, PLAYWRIGHT_BROWSERS_PATH: BROWSERS_DIR },
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
      const res = await fetch(`http://127.0.0.1:${PORT}/${PROJECT}/`, {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok && (await res.text()).includes('data-cqm-static-host="true"')) return;
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
  return String.raw`
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const baseUrl = process.env.CQM_VISUAL_SMOKE_URL;
const outDir = process.env.CQM_VISUAL_SMOKE_OUT;
const tiers = (process.env.CQM_VISUAL_SMOKE_TIERS ?? 'phone,desktop')
  .split(',')
  .map((tier) => tier.trim())
  .filter(Boolean);
const sampleSteps = Number(
  process.env.CQM_VISUAL_SMOKE_STEPS ?? process.env.CQM_VISUAL_SMOKE_FIRST_STEPS ?? 18,
);
const requestedScreenshotTimeoutMs = Number(
  process.env.CQM_VISUAL_SMOKE_SCREENSHOT_TIMEOUT_MS ?? 120_000,
);
const screenshotTimeoutMs = Number.isFinite(requestedScreenshotTimeoutMs)
  ? Math.max(30_000, requestedScreenshotTimeoutMs)
  : 120_000;

if (!baseUrl || !outDir) throw new Error('missing CQM_VISUAL_SMOKE_URL or CQM_VISUAL_SMOKE_OUT');
const baseOrigin = new URL(baseUrl).origin;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-webgl2'],
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

async function sampleCanvas(page, stepCount) {
  return await page.evaluate((steps) => {
    const api = window.__CQM__;
    if (!api || typeof api.step !== 'function') throw new Error('window.__CQM__.step missing');
    if (typeof api.pauseAutoFrames !== 'function') {
      throw new Error('window.__CQM__.pauseAutoFrames missing');
    }
    api.pauseAutoFrames();
    for (let i = 0; i < steps; i++) api.step(1 / 60);
    const canvas = document.getElementById('c');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#c canvas missing');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL context missing');
    const rect = canvas.getBoundingClientRect();
    const world = window.__CQM__?.world;
    const bigTreeEcology = api.bigTreeEcology?.snapshot?.({ foodId: 0 });
    if (!bigTreeEcology) throw new Error('window.__CQM__.bigTreeEcology.snapshot missing');
    return {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      drawingBufferWidth: gl.drawingBufferWidth,
      drawingBufferHeight: gl.drawingBufferHeight,
      automaticFramesActive: api.autoFramesActive,
      pixelReadback: false,
      frame: world?.state?.frame ?? null,
      elapsed: world?.state?.elapsed ?? null,
      qualityTier: world?.quality?.tier ?? null,
      entityCount: world?.entities?.list?.length ?? null,
      bigTreeEcology,
    };
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

async function runHabitatStressProbe(page) {
  return await page.evaluate(async () => {
    const api = window.__CQM__;
    if (!api?.world) throw new Error('window.__CQM__.world missing');
    const world = api.world;
    const camera = api.camera;
    const startFrame = world.state.frame;
    const startedAt = performance.now();
    let maxWorkerActive = 0;

    // Prove the exact Pages worker artifact while the static host is known healthy, before the
    // sustained software-WebGL workload can monopolize this constrained smoke environment.
    const workerUrl = new URL('./workers/simulation-worker.js', document.baseURI).href;
    let workerResponse;
    try {
      workerResponse = await fetch(workerUrl, { cache: 'no-store' });
    } catch (error) {
      throw new Error(
        'failed to fetch built simulation worker at ' +
          workerUrl +
          ': ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
    const workerBody = await workerResponse.text();

    // Keep the largest habitat, narrowest supported lens, and strongest dynamic scalars live for a
    // sustained foreground sample. Real rAF remains in control; this does not fabricate frame steps.
    do {
      world.state.viewIdx = 3;
      world.state.chaos = 10;
      world.state.entropy = 10;
      world.state.weatherIdx = 2;
      camera.fov = 35;
      camera.updateProjectionMatrix();
      const stats = world.workerPool?.getStats();
      maxWorkerActive = Math.max(maxWorkerActive, stats?.activeTasks ?? 0);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } while (performance.now() - startedAt < 15_000);

    const durationMs = performance.now() - startedAt;
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

    const canvas = document.getElementById('c');
    const gl =
      canvas instanceof HTMLCanvasElement
        ? canvas.getContext('webgl2') || canvas.getContext('webgl')
        : null;
    const debugRenderer = gl?.getExtension('WEBGL_debug_renderer_info') ?? null;
    const rendererVendor = gl
      ? String(gl.getParameter(debugRenderer?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR))
      : 'unavailable';
    const rendererName = gl
      ? String(gl.getParameter(debugRenderer?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER))
      : 'unavailable';
    return {
      tier: world.quality.tier,
      durationMs,
      framesAdvanced: endFrame - startFrame,
      observedFps: durationMs > 0 ? ((endFrame - startFrame) * 1000) / durationMs : 0,
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
        mode: world.workerPool ? 'worker-pool' : 'main-thread-packed',
        current: world.workerPool?.getStats() ?? null,
        maxActiveObserved: maxWorkerActive,
        perfSnapshot: world.getPerfSnapshot(),
        asset: {
          url: workerUrl,
          ok: workerResponse.ok,
          status: workerResponse.status,
          contentType: workerResponse.headers.get('content-type'),
          bytes: workerBody.length,
        },
      },
      renderer: {
        vendor: rendererVendor,
        name: rendererName,
        software: /swiftshader|llvmpipe|software rasterizer/i.test(rendererName),
        render: { ...api.renderer.info.render },
        memory: { ...api.renderer.info.memory },
      },
      perfHud: document.querySelector('#perf-hud')?.textContent?.trim() ?? '',
    };
  });
}

try {
  for (const tier of tiers) {
    console.log('visual-smoke: opening ' + tier);
    const context = await browser.newContext({
      viewport: tier === 'phone' ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      deviceScaleFactor: tier === 'phone' ? 2 : 1,
      isMobile: tier === 'phone',
      hasTouch: tier === 'phone',
    });
    await context.addInitScript(() => {
      try {
        localStorage.setItem('cqm.onboarding.dismissed', '1');
      } catch {
        /* localStorage may be unavailable in hardened browser contexts */
      }
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const badResponses = [];
    const requestFailures = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().startsWith(baseOrigin + '/')) {
        badResponses.push({ status: response.status(), url: response.url() });
      }
    });
    page.on('requestfailed', (request) => {
      if (request.url().startsWith(baseOrigin + '/')) {
        requestFailures.push({ error: request.failure()?.errorText ?? 'unknown', url: request.url() });
      }
    });

    await page.goto(tierUrl(tier), { waitUntil: 'domcontentloaded', timeout: 120000 });
    // The #c canvas is static index markup and is validated by sampleCanvas below. Waiting on a Playwright
    // locator here is redundant and can time out while a software-WebGL main thread is synchronously
    // constructing the World even though the canvas is already attached.
    await page.waitForFunction(() => Boolean(window.__CQM__?.step), null, { timeout: 120000 });
    console.log('visual-smoke: hook ready ' + tier);
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(50);
    const bootState = await waitForBootOverlayGone(page, tier);
    const onboardingState = await ensureOnboardingHidden(page, tier);
    console.log('visual-smoke: boot overlay gone ' + tier);

    console.log('visual-smoke: deterministic sample ' + tier);
    const metrics = await sampleCanvas(page, sampleSteps);

    const screenshotPath = join(outDir, 'visual-smoke-' + tier + '.png');
    const onboardingStateBeforeScreenshot = await ensureOnboardingHidden(page, tier);
    const captureQuiesced = metrics.automaticFramesActive === false;
    const captureIsolated = await page.evaluate(() => {
      const id = 'cqm-visual-smoke-canvas-isolation';
      document.getElementById(id)?.remove();
      const style = document.createElement('style');
      style.id = id;
      style.textContent =
        'html,body{background:#000!important}' +
        'body>*:not(#c){visibility:hidden!important}' +
        'html::before,html::after,body::before,body::after{display:none!important;content:none!important}' +
        '#c{visibility:visible!important;opacity:1!important}';
      document.head.appendChild(style);
      return document.getElementById(id) === style;
    });
    // The last fully rendered frame stays in the canvas. Stop submitting new WebGL work while the
    // compositor captures it, which is especially important for Playwright's SwiftShader fallback.
    await page.waitForTimeout(80);
    let screenshot;
    try {
      screenshot = await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        timeout: screenshotTimeoutMs,
      });
    } finally {
      await page.evaluate(() => {
        document.getElementById('cqm-visual-smoke-canvas-isolation')?.remove();
        window.__CQM__?.resumeAutoFrames?.();
      });
    }
    const screenshotMetrics = samplePng(screenshot);
    const bootStateAfterScreenshot = await readBootOverlay(page);
    const onboardingStateAfterScreenshot = await readOnboardingOverlay(page);
    console.log('visual-smoke: habitat stress probe ' + tier);
    const habitatStress = await runHabitatStressProbe(page);
    const result = {
      tier,
      url: page.url(),
      screenshotPath,
      screenshotBytes: screenshot.length,
      captureQuiesced,
      captureIsolated,
      metrics,
      screenshotMetrics,
      bootState,
      bootStateAfterScreenshot,
      onboardingState,
      onboardingStateBeforeScreenshot,
      onboardingStateAfterScreenshot,
      habitatStress,
      performanceClassification: habitatStress.renderer.software
        ? 'functional-software-renderer'
        : 'hardware-renderer-observation',
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors,
      badResponses: badResponses.slice(0, 20),
      requestFailures: requestFailures.slice(0, 20),
    };
    await writeFile(join(outDir, 'visual-smoke-' + tier + '.json'), JSON.stringify(result, null, 2));
    results.push(result);
    await context.close();

    if (pageErrors.length > 0) {
      throw new Error(tier + ': page errors: ' + pageErrors.join(' | '));
    }
    if (consoleErrors.length > 0) {
      throw new Error(tier + ': console errors: ' + consoleErrors.join(' | '));
    }
    if (badResponses.length > 0) {
      throw new Error(tier + ': failed static responses: ' + JSON.stringify(badResponses.slice(0, 10)));
    }
    if (requestFailures.length > 0) {
      throw new Error(
        tier + ': failed static requests: ' + JSON.stringify(requestFailures.slice(0, 10)),
      );
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
    if (!captureQuiesced) {
      throw new Error(tier + ': automatic render loop did not quiesce for visual capture');
    }
    if (!captureIsolated) {
      throw new Error(tier + ': canvas-only visual capture isolation was not installed');
    }
    if (!metrics || metrics.canvasWidth < 100 || metrics.canvasHeight < 100) {
      throw new Error(tier + ': canvas has invalid dimensions');
    }
    const screenshotLooksAlive =
      screenshotMetrics &&
      screenshotMetrics.brightRatio > 0.01 &&
      screenshotMetrics.avgLuma > 1 &&
      screenshotMetrics.uniqueBuckets >= 6;
    if (!screenshotLooksAlive) {
      throw new Error(
        tier +
          ': render appears blank or visually collapsed: ' +
          JSON.stringify({ screenshot: screenshotMetrics }),
      );
    }
    if (metrics.frame === null || metrics.frame < 1) {
      throw new Error(tier + ': world frames did not advance');
    }
    const ecology = metrics.bigTreeEcology;
    if (
      ecology.version !== 1 ||
      ecology.zone.entryRadius !== 240 ||
      ecology.zone.exitRadius !== 270 ||
      ecology.visits.capacity !== 72 ||
      ecology.food.capacity !== 20_000 ||
      ecology.neuralController.controllerCount !== 250 ||
      ecology.neuralController.modelReady !== true ||
      ecology.foodItem?.id !== 0 ||
      ecology.foodItem.kind !== 'fruit' ||
      ecology.foodItem.nourishment !== 28 ||
      !Number.isInteger(ecology.foodItem.generation) ||
      ecology.foodItem.generation < 1 ||
      !Number.isFinite(ecology.foodItem.position.x) ||
      !Number.isFinite(ecology.foodItem.position.y) ||
      !Number.isFinite(ecology.foodItem.position.z) ||
      !Number.isFinite(ecology.foodItem.interactionPoint.x) ||
      !Number.isFinite(ecology.foodItem.interactionPoint.y) ||
      !Number.isFinite(ecology.foodItem.interactionPoint.z)
    ) {
      throw new Error(tier + ': Big Tree ecology diagnostic contract is invalid');
    }
    if (
      ecology.food.available +
        ecology.food.reserved +
        ecology.food.consuming +
        ecology.food.respawning !==
      ecology.food.capacity
    ) {
      throw new Error(tier + ': Big Tree food-state census does not equal fixed capacity');
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
      throw new Error(tier + ': invalid flora draw-group count: ' + habitatStress.flora.meshDrawGroups);
    }
    if (!habitatStress.camera.allEightCornersVisible) {
      throw new Error(tier + ': TOP/FOV35 does not frame all eight habitat corners');
    }
    const workerModeIsValid =
      (habitatStress.workers.mode === 'worker-pool' &&
        habitatStress.workers.current &&
        habitatStress.workers.current.totalWorkers >= 1) ||
      (habitatStress.workers.mode === 'main-thread-packed' &&
        habitatStress.workers.current === null &&
        habitatStress.workers.perfSnapshot.workerTotal === 0 &&
        habitatStress.workers.perfSnapshot.workersReady === false);
    if (
      !workerModeIsValid ||
      !habitatStress.workers.asset.ok ||
      habitatStress.workers.asset.bytes < 100 ||
      !String(habitatStress.workers.asset.contentType).includes('javascript')
    ) {
      throw new Error(tier + ': simulation execution mode or built worker asset is invalid');
    }
    if (habitatStress.framesAdvanced < 1 || !Number.isFinite(habitatStress.observedFps)) {
      throw new Error(tier + ': sustained foreground performance sample did not advance');
    }
    console.log(
      'visual-smoke: OK ' +
        tier +
        ' frame=' +
        metrics.frame +
        ' screenshotLuma=' +
        (screenshotMetrics ? screenshotMetrics.avgLuma.toFixed(2) : 'n/a') +
        ' screenshotBuckets=' +
        (screenshotMetrics ? screenshotMetrics.uniqueBuckets : 'n/a'),
    );
    if (habitatStress.renderer.software) {
      console.log(
        'visual-smoke: ' + tier + ' used a software renderer; FPS is functional evidence only',
      );
    }
  }
  await writeFile(join(outDir, 'visual-smoke-summary.json'), JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
`;
}

if (TIERS.length === 0) fail('no tiers selected');
for (const tier of TIERS) {
  if (!VALID_TIERS.has(tier)) fail(`invalid tier "${tier}"`);
}
mkdirSync(OUT_DIR, { recursive: true });
runChecked('building exact GitHub Pages artifact', 'bun', ['run', 'pages'], ROOT, {
  GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY ?? `local/${PROJECT}`,
  GITHUB_SHA: process.env.GITHUB_SHA ?? 'visual-smoke',
});
if (!existsSync(join(SITE_DIR, 'index.html'))) fail('assembled site/index.html missing');
ensurePlaywright();
const runnerPath = join(RUNNER_DIR, 'browser-visual-smoke-runner.mjs');
writeFileSync(runnerPath, playwrightRunnerSource(), 'utf8');

console.log(`visual-smoke: starting Pages-only server on :${PORT}/${PROJECT}/`);
const server = spawn('bun', [join(ROOT, 'scripts', 'pages-smoke-server.ts')], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(PORT),
    CQM_PAGES_ROOT: SITE_DIR,
    CQM_PAGES_PROJECT: PROJECT,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
let exited = false;
let serverExitDetail = 'still running';
server.on('exit', (code, signal) => {
  exited = true;
  serverExitDetail = code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`;
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
  if (exited) {
    fail(
      `Pages server exited during readiness with ${serverExitDetail}` +
        (stderr ? `\nPages server stderr:\n${stderr}` : ''),
    );
  }
  console.log('visual-smoke: server healthy');
  const child = spawn(NODE_EXECUTABLE, [runnerPath], {
    cwd: RUNNER_DIR,
    env: {
      ...process.env,
      CQM_VISUAL_SMOKE_URL: `http://127.0.0.1:${PORT}/${PROJECT}/`,
      CQM_VISUAL_SMOKE_OUT: OUT_DIR,
      CQM_VISUAL_SMOKE_TIERS: TIERS.join(','),
      PLAYWRIGHT_BROWSERS_PATH: BROWSERS_DIR,
    },
    stdio: 'inherit',
  });
  const timeoutMs = Number(process.env.CQM_VISUAL_SMOKE_TIMEOUT_MS ?? 360000);
  const code = await waitForProcess(child, timeoutMs);
  if (code === -1) fail(`Playwright visual smoke timed out after ${timeoutMs}ms`);
  if (code === -2) fail('Playwright visual smoke failed to launch');
  if (code !== 0) {
    fail(
      `Playwright visual smoke exited with ${code}; Pages server ${serverExitDetail}` +
        (stderr ? `\nPages server stderr:\n${stderr}` : ''),
    );
  }
  if (exited) {
    fail(
      `Pages server exited before smoke completion with ${serverExitDetail}` +
        (stderr ? `\nPages server stderr:\n${stderr}` : ''),
    );
  }
  console.log(`visual-smoke: artifacts written to ${OUT_DIR}`);
} finally {
  if (!exited) stopProcessTree(server.pid);
  for (let i = 0; i < 20 && !exited; i++) await wait(100);
  if (!exited) killProcess(server.pid);
}
