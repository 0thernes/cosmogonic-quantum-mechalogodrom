#!/usr/bin/env bun
/** Install repository-local Git hooks, skipping only when the package is outside a Git worktree. */
import { spawnSync } from 'node:child_process';

const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
if (probe.status !== 0 || probe.stdout.trim() !== 'true') {
  console.log('prepare: outside a Git worktree; repository hooks were not installed');
  process.exit(0);
}

for (const [key, value] of [
  ['core.hooksPath', '.githooks'],
  ['core.autocrlf', 'input'],
] as const) {
  const configured = spawnSync('git', ['config', key, value], { encoding: 'utf8' });
  if (configured.status !== 0) {
    const detail = configured.stderr.trim() || `git config exited with ${configured.status}`;
    throw new Error(`prepare: failed to set ${key}: ${detail}`);
  }
}

console.log('prepare: repository hooks configured');
