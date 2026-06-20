/**
 * normalize-docs.ts — repair UTF-8 mojibake in Markdown docs (root-cause doc hygiene).
 *
 * The autonomous doc-writing loop has, at times, written README/docs through a
 * code path that re-encodes UTF-8 as Windows-1252, corrupting em dashes, smart
 * quotes, ellipses and emoji into sequences like "â€"", "â€™", "Â ", "ðŸ"–".
 * This script reverses that double-encoding for the affected runs and rewrites the
 * file as clean UTF-8 (no BOM). It is idempotent: clean files are left untouched.
 *
 * The companion gate test `tests/docs-truth-law.test.ts` FAILS if any mojibake
 * remains, so `bun run check` / CI enforce clean encoding no matter what wrote the
 * file. Run manually with:  bun scripts/normalize-docs.ts
 *
 * Usage: bun scripts/normalize-docs.ts [--check]   (--check = report only, exit 1 if dirty)
 */

// CP1252 high-range (0x80–0x9F) code points, used to reverse the bad decode.
const CP1252_HIGH: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

/** True if `cp` could be a byte from a CP1252-misdecoded UTF-8 sequence. */
function isMojibakeChar(cp: number): boolean {
  if (cp <= 0xff) return true; // latin1 range maps 1:1 to a byte
  return cp in CP1252_HIGH; // remapped high-range char
}

/** The byte a mojibake char stands for (latin1 direct, or the CP1252 remap). */
function toByte(cp: number): number {
  return cp <= 0xff ? cp : CP1252_HIGH[cp]!;
}

/**
 * Reverse double-encoding: find maximal runs that begin with a UTF-8 lead byte
 * (0xC2–0xF4) expressed as mojibake and whose following chars are valid
 * continuation bytes, then re-decode that run as UTF-8. Leaves genuine text alone.
 */
export function fixMojibake(input: string): string {
  const chars = Array.from(input);
  let out = '';
  for (let i = 0; i < chars.length; ) {
    const cp = chars[i]!.codePointAt(0)!;
    const lead = isMojibakeChar(cp) ? toByte(cp) : -1;
    // UTF-8 multibyte lead bytes: 110xxxxx (C2-DF), 1110xxxx (E0-EF), 11110xxx (F0-F4)
    let need = 0;
    if (lead >= 0xc2 && lead <= 0xdf) need = 1;
    else if (lead >= 0xe0 && lead <= 0xef) need = 2;
    else if (lead >= 0xf0 && lead <= 0xf4) need = 3;
    if (need > 0 && i + need < chars.length) {
      const bytes = [lead];
      let ok = true;
      for (let k = 1; k <= need; k++) {
        const c = chars[i + k]!.codePointAt(0)!;
        if (!isMojibakeChar(c)) {
          ok = false;
          break;
        }
        const b = toByte(c);
        if (b < 0x80 || b > 0xbf) {
          ok = false;
          break;
        } // must be a continuation byte
        bytes.push(b);
      }
      if (ok) {
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
        // only accept if it produced a single clean non-replacement char
        if (!decoded.includes('�')) {
          out += decoded;
          i += need + 1;
          continue;
        }
      }
    }
    out += chars[i]!;
    i += 1;
  }
  return out;
}

/** Strip a UTF-8 BOM if present. */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

const TARGETS = ['README.md', 'CHANGELOG.md', 'ROADMAP.md'];
async function docFiles(): Promise<string[]> {
  const glob = new Bun.Glob('docs/**/*.md');
  const out = [...TARGETS];
  for await (const f of glob.scan('.')) out.push(f);
  return out;
}

const checkOnly = process.argv.includes('--check');
let dirty = 0;
for (const rel of await docFiles()) {
  const file = Bun.file(rel);
  if (!(await file.exists())) continue;
  const original = await file.text();
  const fixed = stripBom(fixMojibake(original));
  if (fixed !== original) {
    dirty++;
    if (checkOnly) console.log(`mojibake: ${rel}`);
    else {
      await Bun.write(rel, fixed);
      console.log(`fixed: ${rel}`);
    }
  }
}
if (checkOnly && dirty > 0) {
  console.error(`${dirty} file(s) contain mojibake — run: bun scripts/normalize-docs.ts`);
  process.exit(1);
}
console.log(dirty === 0 ? 'docs clean (no mojibake)' : `normalized ${dirty} file(s)`);
