/**
 * Read-only corpus manifest for Copilot RAG — every .md/.html/.xml/.txt under the repo
 * (respecting .gitignore-style blocks; no secrets). Built once at server boot.
 */
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolveRoot();

function resolveRoot(): string {
  return fileURLToPath(new URL('../../', import.meta.url));
}

const CORPUS_EXT = new Set(['.md', '.html', '.htm', '.xml', '.txt']);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'legacy',
  'output',
  '.cursor',
  '.githooks',
]);
const SKIP_FILE_PREFIX = ['.env', '.git'];

function blocked(rel: string): boolean {
  const top = rel.split(/[/\\]/)[0] ?? '';
  if (SKIP_DIRS.has(top)) return true;
  const base = rel.split(/[/\\]/).pop() ?? '';
  return SKIP_FILE_PREFIX.some((p) => base.toLowerCase().startsWith(p));
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
