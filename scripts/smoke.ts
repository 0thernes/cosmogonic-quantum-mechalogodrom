#!/usr/bin/env bun
/**
 * smoke.ts — post-build HTTP smoke: health + satellite pages respond.
 * CI runs this after `bun run build` with a short-lived server.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.CQM_SMOKE_PORT ?? 3099);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

function fail(msg: string): never {
  console.error(`smoke: FAIL — ${msg}`);
  process.exit(1);
}

async function wait(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchOk(path: string, expectJson = false): Promise<void> {
  const url = `http://127.0.0.1:${PORT}${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) fail(`${path} → HTTP ${res.status}`);
  if (expectJson) {
    const j = (await res.json()) as { ok?: boolean; version?: string };
    if (!j.ok) fail(`${path} → ok !== true`);
    if (!j.version) fail(`${path} → missing version`);
  } else {
    const text = await res.text();
    if (text.length < 200) fail(`${path} → body too short (${text.length}b)`);
  }
  console.log(`smoke: OK ${path}`);
}

if (!existsSync(join(DIST, 'index.html')))
  fail('dist/index.html missing — run bun run build first');

const proc = spawn('bun', ['server.ts'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
proc.stderr?.on('data', (c: Buffer) => {
  stderr += c.toString();
});

try {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (r.ok) break;
    } catch {
      /* retry */
    }
    if (i === 39) fail(`server did not start on :${PORT}\n${stderr}`);
    await wait(250);
  }

  await fetchOk('/api/health', true);
  await fetchOk('/api/ventures', true);
  await fetchOk('/');
  await fetchOk('/bible');
  await fetchOk('/docs');
  await fetchOk('/spec');
  console.log('smoke: all checks passed');
} finally {
  proc.kill('SIGTERM');
  await wait(300);
}
