#!/usr/bin/env bun
/**
 * gen-bible-corpus.ts — inject the BOOK-derived doc index into bible.html between markers.
 * Run: bun scripts/gen-bible-corpus.ts
 * Wired into predev/build via package scripts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const BOOK = 'docs/BOOK-2026-06-26.md';
const BIBLE = 'bible.html';
const START = '<!-- CQM-BIBLE-CORPUS-START -->';
const END = '<!-- CQM-BIBLE-CORPUS-END -->';

type Entry = { title: string; href: string; blurb: string; tier: string };

/** Parse markdown table rows `[title](path) | blurb` from BOOK sections. */
function parseBook(md: string): Entry[] {
  const out: Entry[] = [];
  let tier = 'Core';
  for (const line of md.split('\n')) {
    const h = line.match(/^## (\d+)\.\s+(.+)/);
    if (h) {
      const n = Number(h[1]);
      if (n <= 1) tier = 'Start';
      else if (n <= 3) tier = 'Architecture';
      else if (n <= 5) tier = 'World';
      else tier = 'Research';
      continue;
    }
    const row = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.+?)\s*\|/);
    if (!row) continue;
    const [, title, rawPath, blurb] = row;
    if (!title || !rawPath) continue;
    let href = rawPath.replace(/^\.\//, 'docs/');
    if (href.startsWith('docs/')) href = '/' + href.replace(/^docs\//, 'docs/');
    else if (!href.startsWith('http') && !href.startsWith('/')) href = `/docs/${href}`;
    out.push({ title: title.trim(), href, blurb: (blurb ?? '').trim(), tier });
  }
  return out;
}

/** Extra corpus entries not in BOOK tables. */
const EXTRA: Entry[] = [
  {
    title: 'BOOK — master RAG index',
    href: '/docs/BOOK-2026-06-26.md',
    blurb: 'Superset index over every doc and module.',
    tier: 'Start',
  },
  {
    title: 'FILE-MAP — auto module map',
    href: '/docs/FILE-MAP.md',
    blurb: 'All src modules summarised from headers.',
    tier: 'Architecture',
  },
  {
    title: 'AUDIT-LOG — living audit trail',
    href: '/docs/AUDIT-LOG.md',
    blurb: 'Newest-first audit entries.',
    tier: 'Research',
  },
  {
    title: 'CONSOLIDATED-22-MASTER-ASSESSMENT — current master',
    href: '/docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md',
    blurb: 'Current 22-report synthesis: what is relevant, stale, defensible, and still missing.',
    tier: 'Research',
  },
  {
    title: 'CONSOLIDATED-22-FILE-AUDIT — trust ledger',
    href: '/docs/CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.md',
    blurb: 'File-by-file audit of the 22 report artifacts and publication-surface gaps.',
    tier: 'Research',
  },
  {
    title: 'KANBAN — in-flight work',
    href: '/docs/KANBAN-2026-06-26.md',
    blurb: 'Live task board.',
    tier: 'Research',
  },
  {
    title: 'RUNBOOK — ops & smoke',
    href: '/docs/RUNBOOK-2026-06-26.md',
    blurb: 'Bootstrap, gate, deploy.',
    tier: 'Start',
  },
  {
    title: 'VENTURES — product horizon',
    href: '/docs/ROADMAP-2026-06-26.md',
    blurb: 'Multiplayer, accounts, outreach (aspirational).',
    tier: 'Research',
  },
  {
    title: 'UI-UX-DEEP-DIVE-AUDIT — UI/UX backlog',
    href: '/docs/UI-UX-DEEP-DIVE-AUDIT-2026-06-27.md',
    blurb: 'Living plan for HUD, brain viz, pantheon, BIBLE depth.',
    tier: 'Research',
  },
  {
    title: 'PEER-REVIEW META-ANALYSIS — falsifiable defense',
    href: '/docs/PEER-REVIEW-META-ANALYSIS.md',
    blurb: '500-point academic framework vs A-Life field.',
    tier: 'Research',
  },
  {
    title: 'APEX brain parameter scale',
    href: '/docs/ARCHITECTURE-2026-06-26.md#brain-parameter-scale-apex--mechalogodrom--pantheon',
    blurb: '25k glyph · 100k→5M apex · Mechalogodrom roadmap.',
    tier: 'Architecture',
  },
];

function render(entries: Entry[]): string {
  const byTier = new Map<string, Entry[]>();
  for (const e of [...EXTRA, ...entries]) {
    const list = byTier.get(e.tier) ?? [];
    if (!list.some((x) => x.href === e.href)) list.push(e);
    byTier.set(e.tier, list);
  }
  const order = ['Start', 'Architecture', 'World', 'Research'];
  const parts: string[] = [];
  for (const tier of order) {
    const list = byTier.get(tier);
    if (!list?.length) continue;
    parts.push(`<h3>${tier}</h3><dl>`);
    for (const e of list) {
      parts.push(
        `<dt><a href="${e.href}">${e.title}</a></dt><dd>${e.blurb.replace(/</g, '&lt;')}</dd>`,
      );
    }
    parts.push('</dl>');
  }
  return parts.join('\n');
}

const book = readFileSync(BOOK, 'utf8');
const html = render(parseBook(book));
let bible = readFileSync(BIBLE, 'utf8');
if (!bible.includes(START) || !bible.includes(END)) {
  throw new Error(`gen-bible-corpus: markers missing in ${BIBLE}`);
}
const before = bible.slice(0, bible.indexOf(START) + START.length);
const after = bible.slice(bible.indexOf(END));
writeFileSync(BIBLE, `${before}\n${html}\n${after}`);
spawnSync('bunx', ['prettier', '--write', BIBLE], { stdio: 'inherit' });
console.log(`gen-bible-corpus: injected ${html.split('<dt>').length - 1} entries into ${BIBLE}`);
