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
 * `--check` is a hard gate; without it the script remains a report for exploratory triage. Point-in-time records
 * (`docs/reports/2026-*`, `docs/ln/*`, `docs/DAILY_RUNS/*`, `CHANGELOG.md`, `docs/AUDIT-LOG.md`) keep
 * their historical numbers by policy and are excluded. Deterministic: sorted `git ls-files`.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { CANONICAL_FACULTIES, CANONICAL_ARCHONS, CANONICAL_TOM_ORGANS } from './canonical-receipts';
import { CODE_GROUNDED, HISTORICAL_SELF_SCORED } from './alife-codeground-sensitivity';

interface Fact {
  name: string;
  /** Regex with ONE capture group = the claimed value. Matched per line. */
  pattern: RegExp;
  /** Values that are canonical/allowed for this fact. */
  allowed: Set<string>;
  note: string;
  /** Optional canonicaliser applied to the capture before the allowed-set lookup (spacing/precision). */
  normalize?: (v: string) => string;
  /**
   * Optional escape hatch: a line matching this is NOT drift. For facts whose superseded values stay
   * quotable when the line SAYS they are superseded — "Historical snapshot (… #1/113)", "retired audit
   * snapshot vs 112 known systems". The marker must be on the line, so an unlabelled stale number is
   * still caught; this permits honest history, not silent staleness.
   */
  skipLine?: RegExp;
}

/** Render a 9-axis profile the way every surface writes it: one decimal, comma-space separated. */
const axisVector = (v: readonly number[]): string => v.map((n) => n.toFixed(1)).join(', ');

const FACTS: Fact[] = [
  {
    name: 'A-Life 9-axis vector',
    // A bracketed 9-tuple of one-decimal scores is unambiguous — nothing else in these docs looks like
    // it. This is the guard the SSOT was missing: the CSV <-> CODE_GROUNDED <-> codeground.json chain is
    // hard-gated, but the same vector is restated in PROSE on a dozen surfaces with nothing policing it,
    // which is exactly how [4.0,2.4,3.3,...] / [3.5,2.4,3.3,...] / [4.0,2.4,3.2,...] all survived at once.
    // Allowed = the live CODE_GROUNDED floor, or the labelled historical self-score kept as a baseline.
    pattern: /\[\s*(\d\.\d\s*(?:,\s*\d\.\d\s*){8})\]/g,
    allowed: new Set([axisVector(CODE_GROUNDED), axisVector(HISTORICAL_SELF_SCORED)]),
    normalize: (v) =>
      v
        .split(',')
        .map((s) => Number(s.trim()).toFixed(1))
        .join(', '),
    note: 'canonical CODE_GROUNDED, or the superseded self-score when explicitly labelled historical',
  },
  {
    name: 'A-Life survey size',
    // "#1/N" ranks and "N-system" corpus references. 113 is the superseded corpus; the 129-peer
    // re-evaluation is canonical (128 peers + Cosmogonic).
    pattern:
      /#1\s*(?:\/|of)\s*(\d{2,3})\b|\b(\d{2,3})[-\s]system\b(?=[^\n]{0,60}(?:matrix|survey|compar|expansion|corpus|A-?Life))/gi,
    allowed: new Set(['129']),
    skipLine: /\b(?:historical|superseded|retired|snapshot|legacy|point-in-time|was\s+#1)\b/i,
    note: 'the survey is 129 systems (128 peers + Cosmogonic); 113 is the superseded corpus size',
  },
  {
    name: 'Butlin scorecard (X/14)',
    // Only scorecard framings (met/partial/failed/Butlin/indicator). Excludes "Puppeteers 100 / 14 styles",
    // "ladder plant 0.42 → …", "500-point 486 / 14 / 0", and bare table "X / 14" denominators that are not Butlin.
    pattern:
      /\b(\d+)\s*\/\s*14\b(?=[^\n]{0,40}\b(?:met|partial|fail(?:ed)?|Butlin|indicator|scorecard)\b)|\b(?:met|partial|fail(?:ed)?|Butlin|indicator|scorecard)\b[^\n]{0,40}\b(\d+)\s*\/\s*14\b/gi,
    allowed: new Set(['8', '6', '14', '0']), // 8 met · 6 partial · 14 framework · 0 failed is honest framing
    note: 'headline is 8/14 met + 6/14 partial (+ 0/14 failed OK); a bare 9/14 or 14/14 is drift/overclaim',
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
    pattern: /\b([1-9]\d{1,2})\s*(?:procedural\s+|deterministic\s+)?morphotypes?\b/gi,
    allowed: new Set(['250', '100', '25']), // 250 live · 100 legacy · 25 per phylum (bare "1 morphotype" = cardinality, skipped)
    note: '250 live (10 phyla x 25) / 100 legacy / 25 per phylum',
  },
  {
    name: 'Tsotchke project count',
    pattern: /\b(\d+)\s+(?:Tsotchke\s+)?(?:corpus\s+)?projects?\b/gi,
    allowed: new Set(['20', '22', '23']),
    note: '20 historical corpus projects; 23 public repositories; 22 causal/runtime ledger entries; 8 deep, 7 wired, 2 harvest, 4 fenced, 1 meta; non-meta integration fraction 17/21',
  },
  {
    name: 'Fenced Tsotchke repos',
    // Four external repositories are fenced: the original three LLM/chain boundaries plus OBLITERATUS.
    // Quantum-RNG-API remains harvest/integrated; `.github` is metadata, not a fifth fence.
    pattern: /\b(\d+)\s+(?:LLM(?:\/chain)?(?:\/API)?\s+(?:repos?\s+)?)?fenced\b/gi,
    allowed: new Set(['4']),
    note: '4 fenced (gpt2-basic, llm-arbitrator, SolanaQuantumFlux, OBLITERATUS); .github is meta and Quantum-RNG-API is harvest',
  },
  {
    name: 'Tsotchke depth ledger',
    // Scope to the complete depth-class tuple so unrelated uses such as "three deep layers" do not match.
    pattern:
      /\b(\d+)\s+deep\b(?=[^\n]{0,100}\b\d+\s+wired\b[^\n]{0,100}\b\d+\s+harvest\b[^\n]{0,100}\b\d+\s+fenced\b)/gi,
    allowed: new Set(['8']),
    note: '22 causal/runtime entries = 8 deep + 7 wired + 2 harvest + 4 fenced + 1 meta; public census is 23',
  },
  {
    name: 'Tsotchke non-meta integration fraction',
    pattern:
      /\b(\d+)\s*\/\s*21\b(?=[^\n]{0,80}\b(?:wired|integrated|integration|scientific|non-meta)\b)|\b(?:wired|integrated|integration|scientific|non-meta)\b[^\n]{0,80}\b(\d+)\s*\/\s*21\b/gi,
    allowed: new Set(['17']),
    note: '17 of 21 non-meta causal/runtime entries are deep, wired, or harvest; four are fenced',
  },
  {
    name: 'Faculties (design)',
    // Exclude the apex-active framings (~20, ~30 deep-wired) that canonical-receipts explicitly permits.
    // 144 is the documented expanded faculty bank (world.ts NHSI field + BRAIN dual denominator 100/144).
    // Require a faculty token immediately after the number so table noise ("16 · Reservoir…") never matches.
    // Exclude "N-faculty subset" (coupling-audit windows are not design totals).
    pattern: /(?<![~\d])\b(\d+)(?:\/\d+)?[-\s]facult(?:y|ies)\b(?!\s+subset)/gi,
    allowed: new Set([String(CANONICAL_FACULTIES), '20', '30', '144']),
    note: `${CANONICAL_FACULTIES}-faculty design; ~20 apex-active / ~30 deep-wired / 144 expanded bank are legit prose framings`,
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
  /^(legacy|node_modules|dist|coverage)\/|^\.claude\/worktrees\/|^CHANGELOG\.md$|^docs\/(AUDIT-LOG\.md|ln\/|DAILY_RUNS\/|reports\/20)/;

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
  // `cqm-sync:historical` blocks are a DELIBERATELY frozen snapshot of an older release — sync-surfaces
  // excludes them from receipt propagation by the same policy, so they must not be read as drift either.
  const frozen = new Set<number>();
  let inFrozen = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (/cqm-sync:historical:start/.test(l)) inFrozen = true;
    if (inFrozen) frozen.add(i);
    if (/cqm-sync:historical:end/.test(l)) inFrozen = false;
  }
  for (const fact of FACTS) {
    for (let i = 0; i < lines.length; i++) {
      if (frozen.has(i)) continue;
      const line = lines[i]!;
      if (fact.skipLine?.test(line)) continue;
      fact.pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = fact.pattern.exec(line)) !== null) {
        const raw = (m[1] ?? m[2])!;
        const value = fact.normalize ? fact.normalize(raw) : raw;
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
  if (process.argv.includes('--check')) process.exitCode = 1;
}
