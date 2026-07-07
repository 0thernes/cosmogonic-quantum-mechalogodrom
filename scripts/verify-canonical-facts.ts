/**
 * CROSS-SURFACE FACT AUDITOR — scans every tracked Markdown / HTML / XML surface for each
 * canonical repo fact and flags any occurrence stating a NON-canonical value (drift).
 *
 * Why: the synced receipts (version / test count / coverage / NHSI design counts) are already
 * gate-policed by sync-surfaces + docs-receipts-law. But the PROSE facts — entity ceiling, morphotype
 * count, Butlin scorecard, Tsotchke project count — are NOT auto-synced and silently drift across the
 * ~80 docs + 5 HTML + 4 XML surfaces. This is the automated form of "make sure everything matches":
 * run `bun run verify:facts` to get a drift report (fact · file:line · found · expected).
 *
 * NOT a hard gate (prose is fuzzier than tokens): it REPORTS for human triage. Point-in-time records
 * (`docs/reports/2026-*`, `docs/ln/*`, `docs/DAILY_RUNS/*`, `CHANGELOG.md`, `docs/AUDIT-LOG.md`) keep
 * their historical numbers by policy and are excluded. Deterministic: sorted `git ls-files`.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { CANONICAL_FACULTIES, CANONICAL_ARCHONS, CANONICAL_TOM_ORGANS } from './canonical-receipts';

interface Fact {
  name: string;
  /** Regex with ONE capture group = the claimed value. Matched per line. */
  pattern: RegExp;
  /** Values that are canonical/allowed for this fact. */
  allowed: Set<string>;
  note: string;
}

const FACTS: Fact[] = [
  {
    name: 'Butlin scorecard (X/14)',
    pattern: /\b(\d+)\s*\/\s*14\b/g,
    allowed: new Set(['8', '6', '14']), // 8 met · 6 partial · 14 = the framework size
    note: 'headline is 8/14 met + 6/14 partial; a bare 9/14 or 14/14 is drift/overclaim',
  },
  {
    name: 'Entity ceiling',
    // Only an explicit ceiling/cap/"up to N" claim with a >=10k number; thresholds ("above 5,000"),
    // measured live counts ("44,977 instantiated"), and cost-analysis sizes are NOT ceiling claims.
    pattern:
      /(?:up to|ceiling (?:to|of|is|raises[^.]*to)?|cap(?:ped)?(?: at| to)?|max(?:imum)?(?: of)?|mega tier[^.]*?)\s+\*{0,2}(\d{2},\d{3}|\d{5})\b/gi,
    allowed: new Set(['50,000', '50000', '10,000', '10000']), // 50k mega ceiling · 10k integrated/V3 tier
    note: '50,000 mega ceiling / 10,000 integrated-tier (V3) target — any other ceiling claim is drift',
  },
  {
    name: 'Morphotypes',
    pattern: /\b([2-9]\d{1,2})\s*(?:procedural\s+|deterministic\s+)?morphotypes?\b/gi,
    allowed: new Set(['250', '100', '25']), // 250 live · 100 legacy · 25 per phylum (bare "1 morphotype" = cardinality, skipped)
    note: '250 live (10 phyla x 25) / 100 legacy / 25 per phylum',
  },
  {
    name: 'Tsotchke project count',
    pattern: /\b(\d+)\s+(?:Tsotchke\s+)?(?:corpus\s+)?projects?\b/gi,
    allowed: new Set(['20', '22']), // 20 corpus (mirrors+flagship); 22 = the distinct GH repo count
    note: '20 corpus projects / 22 registry entries; 9 deep, 7 wired, 2 harvest, 3 fenced, 1 meta; scientific wired fraction 18/21',
  },
  {
    name: 'Fenced Tsotchke repos',
    // The non-LLM mandate fences exactly 3 repos (gpt2-basic, llm-arbitrator, SolanaQuantumFlux);
    // Quantum-RNG-API is WIRED, not fenced. ARCHITECTURE-2026-06-26.md had drifted to "four ... fenced".
    pattern: /\b(\d+)\s+(?:LLM(?:\/chain)?(?:\/API)?\s+(?:repos?\s+)?)?fenced\b/gi,
    allowed: new Set(['3']),
    note: '3 fenced (gpt2-basic, llm-arbitrator, SolanaQuantumFlux); Quantum-RNG-API is wired',
  },
  {
    name: 'Faculties (design)',
    // Exclude the apex-active framings (~20, ~30 deep-wired) that canonical-receipts explicitly permits.
    pattern: /(?<![~\d])\b(\d+)[-\s]facult(?:y|ies)\b/gi,
    allowed: new Set([String(CANONICAL_FACULTIES), '20', '30']),
    note: `${CANONICAL_FACULTIES}-faculty design; ~20 apex-active / ~30 deep-wired are legit prose framings`,
  },
  {
    name: 'Archon pantheon',
    pattern: /\b(\d+)[-\s]Archons?\b/gi,
    allowed: new Set([String(CANONICAL_ARCHONS), '5', '20']), // 25 pantheon = 5 apex + 20 light-echo (all 3 legit)
    note: `${CANONICAL_ARCHONS} pantheon = 5 individuated apex + 20 light-echo (all three framings canonical)`,
  },
  {
    name: 'Theory-of-mind organs',
    pattern: /\b(\d+)\s+(?:theory-of-mind|ToM)\s+(?:organs?|families)/gi,
    allowed: new Set([String(CANONICAL_TOM_ORGANS)]),
    note: `${CANONICAL_TOM_ORGANS} ToM organs`,
  },
];

const EXCLUDE =
  /^(legacy|node_modules|dist|coverage)\/|^\.claude\/worktrees\/|^CHANGELOG\.md$|^docs\/(AUDIT-LOG\.md|ln\/|DAILY_RUNS\/|reports\/20|MEGA-MASTER-)/;

const FALLBACK_SKIP_DIRS = new Set([
  '.agents',
  '.claude',
  '.codex',
  '.git',
  'coverage',
  'dist',
  'legacy',
  'node_modules',
  'site',
]);

function toRepoPath(path: string): string {
  return relative(process.cwd(), path).split(sep).join('/');
}

function fallbackSurfaceWalk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (FALLBACK_SKIP_DIRS.has(entry.name)) continue;
      fallbackSurfaceWalk(join(dir, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = toRepoPath(join(dir, entry.name));
    if (/\.(md|html|xml)$/i.test(rel) && !EXCLUDE.test(rel)) out.push(rel);
  }
}

function fallbackSurfaces(): string[] {
  const out: string[] = [];
  fallbackSurfaceWalk(process.cwd(), out);
  return out.sort();
}

function surfaces(): string[] {
  try {
    return execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => /\.(md|html|xml)$/i.test(p))
      .filter((p) => !EXCLUDE.test(p))
      .sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`verify:facts — git ls-files unavailable (${message}); using repo-walk fallback.`);
    return fallbackSurfaces();
  }
}

interface Hit {
  fact: string;
  file: string;
  line: number;
  value: string;
  text: string;
  drift: boolean;
}

const surfaceFiles = surfaces();
const hits: Hit[] = [];
for (const file of surfaceFiles) {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  for (const fact of FACTS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      fact.pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = fact.pattern.exec(line)) !== null) {
        const value = (m[1] ?? m[2])!;
        const drift = !fact.allowed.has(value);
        if (drift)
          hits.push({
            fact: fact.name,
            file,
            line: i + 1,
            value,
            text: line.trim().slice(0, 110),
            drift,
          });
      }
    }
  }
}

const drifts = hits.filter((h) => h.drift);
if (drifts.length === 0) {
  console.log(
    `verify:facts — no drift across ${surfaceFiles.length} MD/HTML/XML surfaces. All canonical facts consistent.`,
  );
} else {
  console.log(`verify:facts — ${drifts.length} potential drift(s) flagged for review:\n`);
  for (const fact of FACTS) {
    const f = drifts.filter((d) => d.fact === fact.name);
    if (f.length === 0) continue;
    console.log(`### ${fact.name} — expected {${[...fact.allowed].join(', ')}}`);
    console.log(`    (${fact.note})`);
    for (const h of f) console.log(`    ⚠ ${h.file}:${h.line}  found "${h.value}"  | ${h.text}`);
    console.log('');
  }
}
