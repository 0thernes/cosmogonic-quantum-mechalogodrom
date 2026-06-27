/**
 * CODEBASE METRICS — deterministic, measured-from-git source of truth for the
 * file-count / LOC figures quoted in docs/TECHNICAL-SPECIFICATION-2026-06-26.md §1.
 *
 * Why this exists: those figures were hand-maintained and went badly stale
 * (claimed 108 src files / 35,226 LOC while the tree held ~195 / ~56k), and were
 * internally contradictory (108 vs 109 in the same doc) with placeholder rows.
 * LOC changes every commit, so it is NOT gate-pinned like the receipts — instead
 * this prints the current truth on demand. Refresh the doc with `bun run metrics`.
 *
 * Deterministic: iterates `git ls-files` in sorted order; no Date.now / readdir
 * ordering. Excludes vendored / generated / nested-worktree trees.
 */
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

/** Tracked, authored files (excludes node_modules via git; we also drop generated/worktree noise). */
function trackedFiles(): string[] {
  const out = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !/^(dist|coverage|native\/build)\//.test(p))
    .filter((p) => !p.startsWith('.claude/worktrees/'))
    .sort();
}

function lineCount(path: string): number {
  try {
    if (statSync(path).size === 0) return 0;
    const text = readFileSync(path, 'utf8');
    if (text.length === 0) return 0;
    let n = 1;
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    // Trailing newline shouldn't count as an extra empty line.
    if (text.charCodeAt(text.length - 1) === 10) n--;
    return n;
  } catch {
    return 0;
  }
}

/** First path segment, or '(root)' for top-level files. */
function area(path: string): string {
  const slash = path.indexOf('/');
  return slash === -1 ? '(root)' : path.slice(0, slash);
}

function ext(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '(none)' : base.slice(dot + 1).toLowerCase();
}

interface Tally {
  files: number;
  lines: number;
}

function tally(): {
  total: Tally;
  byArea: Map<string, Tally>;
  byExt: Map<string, Tally>;
  srcSub: Map<string, Tally>;
} {
  const files = trackedFiles();
  const total: Tally = { files: 0, lines: 0 };
  const byArea = new Map<string, Tally>();
  const byExt = new Map<string, Tally>();
  const srcSub = new Map<string, Tally>();

  const bump = (m: Map<string, Tally>, key: string, lines: number): void => {
    const t = m.get(key) ?? { files: 0, lines: 0 };
    t.files++;
    t.lines += lines;
    m.set(key, t);
  };

  for (const f of files) {
    const lines = lineCount(f);
    total.files++;
    total.lines += lines;
    bump(byArea, area(f), lines);
    bump(byExt, ext(f), lines);
    if (f.startsWith('src/')) {
      const rest = f.slice(4);
      const slash = rest.indexOf('/');
      bump(srcSub, slash === -1 ? '(src root)' : rest.slice(0, slash), lines);
    }
  }
  return { total, byArea, byExt, srcSub };
}

function sortDesc(m: Map<string, Tally>): [string, Tally][] {
  return [...m.entries()].sort((a, b) => b[1].lines - a[1].lines || (a[0] < b[0] ? -1 : 1));
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

const { total, byArea, byExt, srcSub } = tally();

const lines: string[] = [];
lines.push('# Codebase metrics (measured)\n');
lines.push(
  `Total tracked authored files: **${fmt(total.files)}** · lines: **${fmt(total.lines)}**\n`,
);
lines.push('## By area\n');
lines.push('| Area | Files | Lines |');
lines.push('| ---- | ----: | ----: |');
for (const [k, t] of sortDesc(byArea))
  lines.push(`| \`${k}\` | ${fmt(t.files)} | ${fmt(t.lines)} |`);
lines.push('\n## By file type\n');
lines.push('| Type | Files | Lines | Share |');
lines.push('| ---- | ----: | ----: | ----: |');
for (const [k, t] of sortDesc(byExt))
  lines.push(
    `| ${k} | ${fmt(t.files)} | ${fmt(t.lines)} | ${((t.lines / total.lines) * 100).toFixed(2)}% |`,
  );
lines.push('\n## `src/` subsystems\n');
lines.push('| Subsystem | Files | Lines |');
lines.push('| --------- | ----: | ----: |');
for (const [k, t] of sortDesc(srcSub))
  lines.push(`| \`${k}\` | ${fmt(t.files)} | ${fmt(t.lines)} |`);

console.log(lines.join('\n'));
