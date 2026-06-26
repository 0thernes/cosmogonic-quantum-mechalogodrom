/**
 * docs-canon-law.test.ts — the VERSION half of the canon law (companion to docs-receipts-law).
 *
 * Single source of truth for "what version is this" = package.json. This test fails the gate if any
 * CURRENT-version surface drifts from it, so a stale headline can never be committed. To bump the
 * version you change package.json and run `bun run sync` — every surface follows; you never hand-edit
 * a version string on a page again (that is the whole point — no more chunk-by-chunk drift).
 *
 * Historical mentions ("released as v0.11.0", changelog entries, version-history blocks) are NOT
 * policed here — only the live markers that claim to be the current version.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
const README = readFileSync('README.md', 'utf8');

describe('canon law: current version matches package.json on every live surface', () => {
  test('package.json version is a clean semver', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('the README version badge equals package.json', () => {
    const badge = README.match(/img\.shields\.io\/badge\/version-(\d+\.\d+\.\d+)-/);
    expect(badge?.[1]).toBe(VERSION);
  });

  test('the README "Latest" release headline names the current version', () => {
    // The most recent release callout is `> **vX.Y.Z (date):**` — its version must be the package's.
    const headline = README.match(/>\s*\*\*v(\d+\.\d+\.\d+)\s*\(/);
    expect(headline?.[1]).toBe(VERSION);
  });
});
