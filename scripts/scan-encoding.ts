/**
 * scan-encoding.ts — diagnostic for curly-quote-as-dash corruption and lost chars.
 *
 * The autonomous doc loop has, at times, written em dashes (—) and en dashes (–)
 * as the bare curly quotes ” (U+201D) and “ (U+201C). Because those single chars
 * sit below the UTF-8 lead-byte range, `normalize-docs.ts` (which reverses
 * double-encoding RUNS) leaves them untouched, and the truth-law MOJIBAKE regex
 * (/â€|Â |ðŸ|Ã[¢-¿]|�/) does not match them — so they reach the GitHub front page.
 *
 * This scan reports, per file: counts of U+201C / U+201D / U+2018 / U+2019 / U+FFFD,
 * whether any BALANCED “…” pair exists (which would be a legit quote we must NOT
 * convert), and a few sample contexts. Read-only. Run: bun scripts/scan-encoding.ts
 */

const RDQ = '\u201D'; // ” — corruption stands in for em dash (—)
const LDQ = '\u201C'; // “ — corruption stands in for en dash (–)
const RSQ = '\u2019'; // ’
const LSQ = '\u2018'; // ‘
const FFFD = '\uFFFD'; // � replacement char (lossy)

async function targets(): Promise<string[]> {
  const out = ['README.md', 'CHANGELOG.md', 'ROADMAP.md'];
  for (const pat of ['docs/**/*.md', '*.html', 'docs/**/*.html', 'masters/**/*.xml']) {
    const glob = new Bun.Glob(pat);
    for await (const f of glob.scan('.')) out.push(f);
  }
  return [...new Set(out)];
}

function countCh(s: string, ch: string): number {
  let n = 0;
  for (const c of s) if (c === ch) n++;
  return n;
}

/** Detect balanced “…” pairs (legit quotes) vs dash usage. */
function balancedPairs(s: string): number {
  // a “ followed by a ” within 60 chars on the same line, with no other “ between
  const re = /\u201C([^\u201C\u201D\n]{1,60})\u201D/g;
  return [...s.matchAll(re)].length;
}

function samples(s: string, ch: string, max = 2): string[] {
  const out: string[] = [];
  const lines = s.split('\n');
  for (const ln of lines) {
    if (ln.includes(ch)) {
      const idx = ln.indexOf(ch);
      out.push('…' + ln.slice(Math.max(0, idx - 28), idx + 28).replace(/\s+/g, ' ') + '…');
      if (out.length >= max) break;
    }
  }
  return out;
}

let totalRdq = 0;
let totalLdq = 0;
let totalFffd = 0;
let totalPairs = 0;
const rows: string[] = [];
for (const rel of await targets()) {
  const file = Bun.file(rel);
  if (!(await file.exists())) continue;
  const t = await file.text();
  const rdq = countCh(t, RDQ);
  const ldq = countCh(t, LDQ);
  const fffd = countCh(t, FFFD);
  const rsq = countCh(t, RSQ);
  const lsq = countCh(t, LSQ);
  const pairs = balancedPairs(t);
  if (rdq + ldq + fffd === 0) continue;
  totalRdq += rdq;
  totalLdq += ldq;
  totalFffd += fffd;
  totalPairs += pairs;
  rows.push(
    `${String(rdq).padStart(4)} RDQ ${String(ldq).padStart(4)} LDQ ${String(fffd).padStart(
      3,
    )} FFFD  ${String(pairs).padStart(2)} pairs  (sq ${lsq}/${rsq})  ${rel}`,
  );
  if (pairs > 0) {
    for (const ex of samples(t, LDQ, 3)) rows.push(`        LDQ ctx: ${ex}`);
  }
}

console.log('=== CURLY-DASH / LOST-CHAR CORRUPTION SCAN ===');
console.log(rows.join('\n') || '(none)');
console.log(
  `\nTOTALS: ${totalRdq} U+201D(”→—)  ${totalLdq} U+201C(“→–)  ${totalFffd} U+FFFD(�, lossy)  ${totalPairs} balanced-pairs(legit quotes — must preserve)`,
);
console.log(
  totalPairs === 0
    ? 'SAFE: no balanced “…” pairs found — blanket ”→— / “→– is non-destructive.'
    : 'CAUTION: balanced pairs exist — use pattern-scoped replacement, not blanket.',
);
