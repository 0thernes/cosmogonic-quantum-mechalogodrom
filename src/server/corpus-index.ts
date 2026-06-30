/**
 * Read-only corpus manifest for Copilot RAG — every .md/.html/.xml/.txt under the repo
 * (respecting .gitignore-style blocks; no secrets). Built once at server boot.
 */
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBlockedTop } from './ai-sandbox';

const ROOT = resolveRoot();

function resolveRoot(): string {
  return fileURLToPath(new URL('../../', import.meta.url));
}

const CORPUS_EXT = new Set(['.md', '.html', '.htm', '.xml', '.txt']);
/** Corpus-specific noise (build output / editor state) not covered by ai-sandbox's private-area list. */
const SKIP_DIRS = new Set(['output', '.cursor']);

/**
 * Block a path if ANY segment — not just the outermost — is a private/build/vcs area. Reuses
 * {@link isBlockedTop}, the single source of truth ai-sandbox.ts's read/list tools use, so the RAG
 * corpus manifest and the read tools can never disagree about what is private. Previously this only
 * checked the path's first segment plus the final filename's prefix, so a nested private directory
 * (e.g. `.claude/worktrees/*\/.git`, `.../.memory`) walked straight through (audit MEDIUM).
 */
function blocked(rel: string): boolean {
  return rel.split(/[/\\]/).some((s) => SKIP_DIRS.has(s) || isBlockedTop(s));
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const abs = join(dir, e.name);
    const rel = relative(ROOT, abs).split(sep).join('/');
    if (blocked(rel)) continue;
    if (e.isDirectory()) await walk(abs, out);
    else if (e.isFile()) {
      const lower = e.name.toLowerCase();
      for (const ext of CORPUS_EXT) {
        if (lower.endsWith(ext)) {
          out.push(rel);
          break;
        }
      }
    }
  }
}

let cachedManifest = '';
let cachedCount = 0;

/** Sorted relative paths of all corpus files. */
export async function buildCorpusManifest(): Promise<{ manifest: string; count: number }> {
  const files: string[] = [];
  await walk(ROOT, files);
  files.sort();
  cachedCount = files.length;
  cachedManifest = files.join('\n');
  return { manifest: cachedManifest, count: cachedCount };
}

export function corpusManifestSync(): { manifest: string; count: number } {
  return { manifest: cachedManifest, count: cachedCount };
}

/** Load manifest at import (async fire-and-forget for first request). */
void buildCorpusManifest().catch(() => {
  cachedManifest = '(corpus scan pending — use list_dir + grep)';
  cachedCount = 0;
});

export { ROOT as CORPUS_ROOT };
