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

function command(name: string): string {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function runChecked(label: string, exe: string, args: string[], cwd: string): void {
  console.log(`visual-smoke: ${label}`);
  const result = spawnSync(exe, args, {
    cwd,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS_DIR },
    stdio: 'inherit',
  });
  if (result.status !== 0) fail(`${label} exited with ${result.status}`);
}

function ensurePlaywright(): void {
  mkdirSync(RUNNER_DIR, { recursive: true });
  const packageJsonPath = join(RUNNER_DIR, 'package.json');
  if (!existsSync(packageJsonPath)) {
    writeFileSync(packageJsonPath, '{"private":true,"type":"module"}\n', 'utf8');
  }
  if (!existsSync(join(RUNNER_DIR, 'node_modules', 'playwright', 'package.json'))) {
    runChecked(
      'installing local Playwright package',
      command('npm'),
      ['install', '--no-save', 'playwright'],
      RUNNER_DIR,
    );
  }
  if (!existsSync(join(BROWSERS_DIR, '.chromium-ready'))) {
    runChecked(
      'installing Chromium browser for Playwright',
      command('npx'),
      ['playwright', 'install', 'chromium'],
      RUNNER_DIR,
    );
    writeFileSync(join(BROWSERS_DIR, '.chromium-ready'), `${new Date().toISOString()}\n`, 'utf8');
  }
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
const firstSampleSteps = Number(process.env.CQM_VISUAL_SMOKE_FIRST_STEPS ?? 18);
const retrySampleSteps = Number(process.env.CQM_VISUAL_SMOKE_RETRY_STEPS ?? 6);
const sampleAttempts = Number(process.env.CQM_VISUAL_SMOKE_ATTEMPTS ?? 4);

if (!baseUrl || !outDir) throw new Error('missing CQM_VISUAL_SMOKE_URL or CQM_VISUAL_SMOKE_OUT');

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
  await page.evaluate((steps) => {
    const api = window.__CQM__;
    if (!api || typeof api.step !== 'function') throw new Error('window.__CQM__.step missing');
    for (let i = 0; i < steps; i++) api.step(1 / 60);
  }, stepCount);
  await page.waitForTimeout(80);
  return await page.evaluate(() => {
    const canvas = document.getElementById('c');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#c canvas missing');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL context missing');
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.min(320, gl.drawingBufferWidth || canvas.width));
    const h = Math.max(1, Math.min(180, gl.drawingBufferHeight || canvas.height));
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let bright = 0;
    let alpha = 0;
    let lumaSum = 0;
    const buckets = new Set();
    for (let p = 0; p < pixels.length; p += 4) {
      const r = pixels[p] ?? 0;
      const g = pixels[p + 1] ?? 0;
      const b = pixels[p + 2] ?? 0;
      const a = pixels[p + 3] ?? 0;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumaSum += luma;
      if (a > 0) alpha++;
      if (luma > 8) bright++;
      if ((p / 4) % 64 === 0) buckets.add([r >> 4, g >> 4, b >> 4, a >> 6].join(','));
    }
    const world = window.__CQM__?.world;
    return {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      drawingBufferWidth: gl.drawingBufferWidth,
      drawingBufferHeight: gl.drawingBufferHeight,
      brightRatio: bright / (w * h),
      alphaRatio: alpha / (w * h),
      avgLuma: lumaSum / (w * h),
      uniqueBuckets: buckets.size,
      frame: world?.state?.frame ?? null,
      elapsed: world?.state?.elapsed ?? null,
      qualityTier: world?.quality?.tier ?? null,
      entityCount: world?.entities?.list?.length ?? null,
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
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(tierUrl(tier), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#c', { state: 'attached', timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.__CQM__?.step), null, { timeout: 120000 });
    console.log('visual-smoke: hook ready ' + tier);
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(50);
    const bootState = await waitForBootOverlayGone(page, tier);
    const onboardingState = await ensureOnboardingHidden(page, tier);
    console.log('visual-smoke: boot overlay gone ' + tier);

    let metrics = null;
    for (let attempt = 0; attempt < sampleAttempts; attempt++) {
      console.log('visual-smoke: sample ' + tier + ' attempt=' + attempt);
      metrics = await sampleCanvas(page, attempt === 0 ? firstSampleSteps : retrySampleSteps);
      if (metrics.brightRatio > 0.01 && metrics.avgLuma > 1 && metrics.uniqueBuckets >= 6) break;
    }

    const screenshotPath = join(outDir, 'visual-smoke-' + tier + '.png');
    const onboardingStateBeforeScreenshot = await ensureOnboardingHidden(page, tier);
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: false });
    const screenshotMetrics = samplePng(screenshot);
    const bootStateAfterScreenshot = await readBootOverlay(page);
    const onboardingStateAfterScreenshot = await readOnboardingOverlay(page);
    const result = {
      tier,
      url: page.url(),
      screenshotPath,
      screenshotBytes: screenshot.length,
      metrics,
      screenshotMetrics,
      bootState,
      bootStateAfterScreenshot,
      onboardingState,
      onboardingStateBeforeScreenshot,
      onboardingStateAfterScreenshot,
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors,
    };
    await writeFile(join(outDir, 'visual-smoke-' + tier + '.json'), JSON.stringify(result, null, 2));
    results.push(result);
    await context.close();

    if (pageErrors.length > 0) {
      throw new Error(tier + ': page errors: ' + pageErrors.join(' | '));
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
    const canvasLooksAlive =
      metrics.brightRatio > 0.01 && metrics.avgLuma > 1 && metrics.uniqueBuckets >= 6;
    const screenshotLooksAlive =
      screenshotMetrics &&
      screenshotMetrics.brightRatio > 0.01 &&
      screenshotMetrics.avgLuma > 1 &&
      screenshotMetrics.uniqueBuckets >= 6;
    if (!canvasLooksAlive && !screenshotLooksAlive) {
      throw new Error(
        tier +
          ': render appears blank or visually collapsed: ' +
          JSON.stringify({ canvas: metrics, screenshot: screenshotMetrics }),
      );
    }
    if (metrics.frame === null || metrics.frame < 1) {
      throw new Error(tier + ': world frames did not advance');
    }
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
        (screenshotMetrics ? screenshotMetrics.uniqueBuckets : 'n/a'),
    );
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
  const node = process.platform === 'win32' ? 'node.exe' : 'node';
  const child = spawn(node, [runnerPath], {
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
  const timeoutMs = Number(process.env.CQM_VISUAL_SMOKE_TIMEOUT_MS ?? 240000);
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
