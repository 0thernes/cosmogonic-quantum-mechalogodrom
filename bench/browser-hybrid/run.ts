/**
 * Portable bounded browser proof: bun bench/browser-hybrid/run.ts chrome|msedge kernel|integration|boundary
 * Requires the pinned Playwright dependency, an installed browser channel, and Node on PATH (or NODE_BINARY).
 * Bun builds the browser bundles; Node runs Playwright, matching the repository's existing browser smoke.
 * Output stays under ignored output/hybrid-browser; no browser install or unsafe GPU flags are used.
 */
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const channelArg = process.argv[2] ?? 'chrome';
const channel = channelArg === 'edge' ? 'msedge' : channelArg;
const mode = process.argv[3] ?? 'kernel';
if (
  !['chrome', 'msedge'].includes(channel) ||
  !['kernel', 'integration', 'boundary'].includes(mode)
) {
  throw new Error(
    'Usage: bun bench/browser-hybrid/run.ts chrome|msedge kernel|integration|boundary',
  );
}
const root = resolve(import.meta.dir, '../..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputRoot = join(root, 'output/hybrid-browser');
const output = join(outputRoot, `${mode}-${channel}-${stamp}`);
await mkdir(output, { recursive: true });
const sources = [
  'src/core/wilderness-webgpu.ts',
  'src/core/wilderness-compute.ts',
  'src/core/worker-pool.ts',
  'src/sim/wilderness-population.ts',
  'src/workers/simulation-worker.ts',
  'src/core/hybrid-compute.ts',
  'src/math/wild-entropy.ts',
  'src/math/zig-bridge.ts',
  'src/core/webgpu-detect.ts',
  'bench/browser-hybrid/fixture.ts',
  'bench/browser-hybrid/run.ts',
  'bench/browser-hybrid/driver.mjs',
];

async function sha256(path: string): Promise<string> {
  return new Bun.CryptoHasher('sha256').update(await Bun.file(path).arrayBuffer()).digest('hex');
}
async function sourceHashes(): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(sources.map(async (file) => [file, await sha256(join(root, file))])),
  );
}

try {
  const before = await sourceHashes();
  for (const [entrypoint, name] of [
    ['bench/browser-hybrid/fixture.ts', 'fixture.js'],
    ['src/workers/simulation-worker.ts', 'simulation-worker.js'],
  ] as const) {
    const result = await Bun.build({
      entrypoints: [join(root, entrypoint)],
      target: 'browser',
      format: 'esm',
    });
    if (!result.success || result.outputs.length !== 1)
      throw new Error(`Build failed: ${result.logs.join('\n')}`);
    await Bun.write(join(output, name), result.outputs[0]!);
  }
  const after = await sourceHashes();
  for (const file of sources)
    if (before[file] !== after[file]) throw new Error(`Source changed while building: ${file}`);
  await Bun.write(
    join(output, 'manifest.json'),
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        bun: Bun.version,
        sourceSha256: before,
        bundleSha256: {
          'fixture.js': await sha256(join(output, 'fixture.js')),
          'simulation-worker.js': await sha256(join(output, 'simulation-worker.js')),
        },
      },
      null,
      2,
    ),
  );
  const node = process.env.NODE_BINARY ?? Bun.which('node');
  if (!node)
    throw new Error(
      'Node is required for Playwright; install Node or set NODE_BINARY to its executable',
    );
  const child = Bun.spawn(
    [node, join(import.meta.dir, 'driver.mjs'), root, output, channel, mode],
    {
      cwd: root,
      stdin: 'ignore',
      stdout: 'inherit',
      stderr: 'inherit',
    },
  );
  const interrupt = (): void => {
    child.kill('SIGTERM');
  };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  // The Node driver owns a 90-second deadline and all browser/server cleanup. This outer limit covers
  // an unresponsive driver process after that cleanup budget; it cannot turn a timeout into a pass.
  const timeout = setTimeout(interrupt, 110000);
  try {
    process.exitCode = await child.exited;
  } finally {
    clearTimeout(timeout);
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
} catch (error) {
  const report = {
    status: 'failed',
    error: error instanceof Error ? (error.stack ?? error.message) : String(error),
    stage: 'bundle-or-launch',
    channel,
    mode,
  };
  const receipt = join(output, 'report.json');
  await Bun.write(receipt, JSON.stringify(report, null, 2));
  await Bun.write(
    join(outputRoot, `${mode}-${channel}-latest.json`),
    JSON.stringify({ status: report.status, receipt }, null, 2),
  );
  console.error(JSON.stringify({ ...report, receipt }, null, 2));
  process.exitCode = 1;
}
