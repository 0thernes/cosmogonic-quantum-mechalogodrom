/**
 * CORPUS-INDEX — RAG manifest privacy boundary.
 *
 * buildCorpusManifest() walks the real repo for the Copilot RAG corpus embedded into the chat system
 * prompt. blocked() used to check only the path's outermost segment plus the final filename's prefix,
 * so a nested `.claude/worktrees/*\/.git` or `.../.memory` directory (full sibling checkouts, each
 * with their own git internals and per-worktree memory notes) walked straight through into the
 * manifest (audit MEDIUM).
 */
import { describe, expect, test } from 'bun:test';
import { buildCorpusManifest } from '../src/server/corpus-index';

describe('corpus-index: private-area exclusion', () => {
  test('the manifest never lists anything under .claude/ (worktrees hold sibling .git/.memory content)', async () => {
    const { manifest } = await buildCorpusManifest();
    const leaked = manifest
      .split('\n')
      .filter(Boolean)
      .filter((l) => l.startsWith('.claude/'));
    expect(leaked).toEqual([]);
  });

  test('the manifest never lists .git*/.env* content, or legacy/node_modules/dist, at any path depth', async () => {
    const { manifest } = await buildCorpusManifest();
    const lines = manifest.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const segs = line.split('/');
      for (const seg of segs) {
        const lower = seg.toLowerCase();
        expect(lower.startsWith('.env')).toBe(false);
        expect(lower.startsWith('.git')).toBe(false);
      }
      expect(segs.includes('legacy')).toBe(false);
      expect(segs.includes('node_modules')).toBe(false);
      expect(segs.includes('dist')).toBe(false);
    }
  });
});
