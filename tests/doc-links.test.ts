/**
 * Documentation link integrity. Every relative file link in a Markdown file (`](./x)` / `](../x)`)
 * must point at a file that actually exists — so the repo's 20+ cross-linked docs never rot into
 * 404s. Links inside fenced or inline code (examples) are stripped first; http(s)/mailto/anchor
 * links are ignored. A trailing `#anchor` is allowed (only the file part is checked).
 */
import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');

/**
 * Return only version-controlled Markdown surfaces. O(f log f), where f is the tracked Markdown count.
 *
 * Walking the working tree made one Bun test per ignored CMake/FetchContent/worktree document, so the
 * published test total changed with local build debris. Git is the repository boundary and is already
 * required by the checkout, sync guard, hooks, and CI; fail loudly if that boundary cannot be read.
 */
function markdownFiles(): string[] {
  let output: string;
  try {
    output = execFileSync('git', ['ls-files', '-z', '--', '*.md'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`doc-links: could not enumerate tracked Markdown with git (${message})`);
  }
  return output
    .split('\0')
    .filter(Boolean)
    .sort()
    .map((rel) => join(ROOT, rel));
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
  const files = markdownFiles();

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
