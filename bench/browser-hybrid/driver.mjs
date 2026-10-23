/** Node Playwright driver; invoked by run.ts after bundling. Standard installed channels, no GPU flags. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright';

const [root, output, channel, mode] = process.argv.slice(2);
if (
  !root ||
  !output ||
  !['chrome', 'msedge'].includes(channel) ||
  !['kernel', 'integration', 'boundary'].includes(mode)
) {
  throw new Error('Use bun bench/browser-hybrid/run.ts chrome|msedge kernel|integration|boundary');
}
const errors = [];
const consoleMessages = [];
let browser;
let report = { status: 'failed', error: 'Run did not complete' };
let manifest;
let stopped = false;
let deadline;
const abort = new AbortController();
const interrupt = () => abort.abort();
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/fixture.js' || request.url === '/simulation-worker.js') {
      response.setHeader('content-type', 'text/javascript');
      response.end(await readFile(join(output, request.url.slice(1))));
    } else if (request.url === '/') {
      response.setHeader('content-type', 'text/html');
      response.end(
        '<!doctype html><meta charset="utf-8"><title>CQM bounded hybrid validation</title><script type="module" src="/fixture.js"></script>',
      );
    } else {
      response.writeHead(404).end('Not found');
    }
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

async function run() {
  manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  browser = await chromium.launch({ channel, headless: true, timeout: 20000 });
  if (stopped || abort.signal.aborted) {
    await browser.close();
    throw new Error('Run cancelled while launching browser');
  }
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) =>
    consoleMessages.push({ type: message.type(), text: message.text() }),
  );
  await page.goto(`http://127.0.0.1:${server.address().port}`, { timeout: 10000 });
  await page.waitForFunction(() => typeof window.runKernelValidation === 'function', undefined, {
    timeout: 10000,
  });
  report = await page.evaluate(
    (test) =>
      test === 'integration'
        ? window.runIntegrationValidation()
        : test === 'boundary'
          ? window.diagnoseBoundary()
          : window.runKernelValidation(),
    mode,
  );
  const changed = [];
  for (const [file, before] of Object.entries(manifest.sourceSha256)) {
    const after = createHash('sha256')
      .update(await readFile(join(root, file)))
      .digest('hex');
    if (before !== after) changed.push(file);
  }
  if (changed.length || errors.length) {
    report.status = 'failed';
    report.sourceChangedDuringRun = changed;
    if (errors.length) report.error = 'Uncaught browser exceptions occurred';
  }
}

try {
  await Promise.race([
    run(),
    new Promise((_, reject) => {
      deadline = setTimeout(() => {
        stopped = true;
        reject(new Error('Bounded browser deadline exceeded (90 seconds)'));
      }, 90000);
      abort.signal.addEventListener(
        'abort',
        () => {
          stopped = true;
          reject(new Error('Run interrupted'));
        },
        { once: true },
      );
    }),
  ]);
} catch (error) {
  report = { status: 'failed', error: String(error?.stack ?? error) };
} finally {
  stopped = true;
  clearTimeout(deadline);
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  try {
    await browser?.close();
  } catch (error) {
    report.cleanupError = String(error);
    report.status = 'failed';
  }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  report.browserChannel = channel;
  report.mode = mode;
  report.node = process.version;
  report.pageErrors = errors;
  report.consoleMessages = consoleMessages;
  report.buildManifest = manifest;
  const receipt = join(output, 'report.json');
  await writeFile(receipt, JSON.stringify(report, null, 2));
  await writeFile(
    join(dirname(output), `${mode}-${channel}-latest.json`),
    JSON.stringify({ status: report.status, receipt }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        status: report.status,
        receipt,
        checks: report.checks?.length ?? 0,
        failedChecks: report.checks?.filter((check) => !check.passed) ?? [],
        error: report.error,
      },
      null,
      2,
    ),
  );
  if (report.status !== 'passed') process.exitCode = 1;
}
