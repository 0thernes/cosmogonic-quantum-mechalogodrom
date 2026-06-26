/**
 * Documentation link integrity. Every relative file link in a Markdown file (`](./x)` / `](../x)`)
 * must point at a file that actually exists — so the repo's 20+ cross-linked docs never rot into
 * 404s. Links inside fenced or inline code (examples) are stripped first; http(s)/mailto/anchor
 * links are ignored. A trailing `#anchor` is allowed (only the file part is checked).
 */
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
// `.claude` holds transient git worktrees (whole-repo scratch copies); `legacy` is preserved
// verbatim and never edited; `site`/`coverage` are build/report outputs. None are part of the
// deliverable doc set, and scanning them false-fails on stale copies outside the canonical tree.
const SKIP = new Set(['node_modules', '.git', 'dist', '.claude', 'legacy', 'site', 'coverage']);

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...markdownFiles(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** Remove fenced + inline code so example links inside them aren't treated as real links. */
function stripCode(md: string): string {
  return md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/** Relative file links beginning with `./` or `../`, minus any `#anchor`. */
function relativeLinks(md: string): string[] {
  const out: string[] = [];
  const re = /\]\((\.\.?\/[^)\s#]+)(?:#[^)]*)?\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) out.push(m[1]!);
  return out;
}

describe('documentation link integrity', () => {
  const files = markdownFiles(ROOT);

  test('the repo actually has a documentation set to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    test(`relative links resolve: ${rel}`, () => {
      const md = stripCode(readFileSync(file, 'utf8'));
      const broken: string[] = [];
      for (const link of relativeLinks(md)) {
        if (!existsSync(resolve(dirname(file), link))) broken.push(link);
      }
      expect(broken).toEqual([]);
    });
  }
});
