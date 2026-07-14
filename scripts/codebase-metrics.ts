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
import { readFileSync } from 'node:fs';

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
    const text = readFileSync(path, 'utf8');
    if (text.length === 0) return 0;
    let n = 1;
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    // Trailing newline shouldn't count as an extra empty line.
    if (text.charCodeAt(text.length - 1) === 10) n--;
    return n;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`codebase-metrics: failed to read tracked file ${path}: ${detail}`);
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

/**
 * Documentation census grouping — the exact buckets quoted in specs.html §"Tracked census" and
 * bible.html. Kept here (not hand-recomputed in the HTML) so a refresh is a copy-paste from
 * `bun run metrics` and can never introduce a mis-categorised or non-summing figure.
 */
const CENSUS_GROUPS: { label: string; exts: string[] }[] = [
  { label: 'TypeScript', exts: ['ts', 'tsx', 'mts', 'cts'] },
  { label: 'Markdown', exts: ['md'] },
  { label: 'HTML', exts: ['html', 'htm'] },
  { label: 'JSON / data feeds', exts: ['json'] },
  { label: 'CSS', exts: ['css'] },
  { label: 'Native C/C++', exts: ['h', 'hpp', 'hxx', 'c', 'cc', 'cpp', 'cxx'] },
];

function tally(): {
  total: Tally;
  byArea: Map<string, Tally>;
  byExt: Map<string, Tally>;
  srcSub: Map<string, Tally>;
  srcTsFiles: number;
  perFile: { path: string; lines: number }[];
} {
  const files = trackedFiles();
  const total: Tally = { files: 0, lines: 0 };
  const byArea = new Map<string, Tally>();
  const byExt = new Map<string, Tally>();
  const srcSub = new Map<string, Tally>();
  const perFile: { path: string; lines: number }[] = [];
  let srcTsFiles = 0;

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
    perFile.push({ path: f, lines });
    bump(byArea, area(f), lines);
    bump(byExt, ext(f), lines);
    if (f.startsWith('src/')) {
      const rest = f.slice(4);
      const slash = rest.indexOf('/');
      bump(srcSub, slash === -1 ? '(src root)' : rest.slice(0, slash), lines);
      if (ext(f) === 'ts') srcTsFiles++;
    }
  }
  return { total, byArea, byExt, srcSub, srcTsFiles, perFile };
}

function sortDesc(m: Map<string, Tally>): [string, Tally][] {
  return [...m.entries()].sort((a, b) => b[1].lines - a[1].lines || (a[0] < b[0] ? -1 : 1));
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

const { total, byArea, byExt, srcSub, srcTsFiles, perFile } = tally();

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

// Documentation census grouping — copy-paste target for specs.html / bible.html / TECHNICAL-SPEC.
lines.push('\n## Documentation census (specs.html grouping)\n');
lines.push('| Category | Files | Lines | Share |');
lines.push('| -------- | ----: | ----: | ----: |');
let censusFiles = 0;
let censusLines = 0;
for (const g of CENSUS_GROUPS) {
  let f = 0;
  let l = 0;
  for (const e of g.exts) {
    const t = byExt.get(e);
    if (t) {
      f += t.files;
      l += t.lines;
    }
  }
  censusFiles += f;
  censusLines += l;
  lines.push(`| ${g.label} | ${fmt(f)} | ${fmt(l)} | ${((l / total.lines) * 100).toFixed(2)}% |`);
}
const otherLines = total.lines - censusLines;
lines.push(
  `| Other (images, csv, yaml, …) | ${fmt(total.files - censusFiles)} | ${fmt(otherLines)} | ${((otherLines / total.lines) * 100).toFixed(2)}% |`,
);
const srcArea = byArea.get('src') ?? { files: 0, lines: 0 };
const testsArea = byArea.get('tests') ?? { files: 0, lines: 0 };
const tsExt = byExt.get('ts') ?? { files: 0, lines: 0 };
let nativeFiles = 0;
let nativeLines = 0;
for (const e of ['h', 'hpp', 'hxx', 'c', 'cc', 'cpp', 'cxx']) {
  const t = byExt.get(e);
  if (t) {
    nativeFiles += t.files;
    nativeLines += t.lines;
  }
}
// Heaviest files — the doc's §12 "heaviest files (… full list via `bun run metrics`)" promise,
// now actually emitted. Deterministic: perFile is built from sorted `git ls-files`; ties break by path.
const heaviest = (prefix: string, n: number): { path: string; lines: number }[] =>
  perFile
    .filter((e) => e.path.startsWith(prefix))
    .sort((a, b) => b.lines - a.lines || (a.path < b.path ? -1 : 1))
    .slice(0, n);
lines.push(`\n## Heaviest \`src/\` files (top 12 of ${fmt(byArea.get('src')?.files ?? 0)})\n`);
lines.push('| Lines | File |');
lines.push('| ----: | ---- |');
for (const e of heaviest('src/', 12)) lines.push(`| ${fmt(e.lines)} | ${e.path.slice(4)} |`);
lines.push(`\n## Heaviest \`tests/\` files (top 15 of ${fmt(byArea.get('tests')?.files ?? 0)})\n`);
lines.push('| Lines | File |');
lines.push('| ----: | ---- |');
for (const e of heaviest('tests/', 15))
  lines.push(`| ${fmt(e.lines)} | ${e.path.slice(6).replace(/\.test\.ts$/, '')} |`);

lines.push('\nSub-figures (specs.html footnote):');
lines.push(`- total tracked authored: ${fmt(total.files)} files / ${fmt(total.lines)} lines`);
lines.push(`- source area (\`src/\`): ${fmt(srcArea.files)} files / ${fmt(srcArea.lines)} lines`);
lines.push(`- tracked TypeScript: ${fmt(tsExt.files)} files / ${fmt(tsExt.lines)} lines`);
lines.push(`- \`src/\` TypeScript: ${fmt(srcTsFiles)} files`);
lines.push(`- native C/C++: ${fmt(nativeFiles)} files / ${fmt(nativeLines)} lines`);
lines.push(`- tests area: ${fmt(testsArea.files)} files / ${fmt(testsArea.lines)} lines`);

console.log(lines.join('\n'));
