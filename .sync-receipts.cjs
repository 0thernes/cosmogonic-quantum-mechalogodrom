const fs = require('fs');
const { spawnSync } = require('node:child_process');

/** Read the canonical triple from scripts/canonical-receipts.ts (single source of truth). */
function readCanonical() {
  const src = fs.readFileSync('scripts/canonical-receipts.ts', 'utf8');
  const count = src.match(/CANONICAL_TEST_COUNT = (\d+);/)?.[1];
  const line = src.match(/CANONICAL_LINE_COV = '([0-9]+\.[0-9]+)';/)?.[1];
  const func = src.match(/CANONICAL_FUNC_COV = '([0-9]+\.[0-9]+)';/)?.[1];
  if (!count || !line || !func) {
    throw new Error('.sync-receipts.cjs: could not parse scripts/canonical-receipts.ts');
  }
  return { test: count, testComma: Number(count).toLocaleString('en-US'), line, func };
}

function rw(file, edit) {
  let s = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, edit(s), 'utf8');
}

const { test, testComma, line, func } = readCanonical();

for (const file of [
  'README.md',
  'ROADMAP.md',
  'docs.html',
  'specs.html',
  'docs/TECHNICAL-SPECIFICATION.md',
  'docs/SUPER-CREATURE-RESEARCH.md',
  'docs/BENCHMARKS.md',
  'docs/CORPUS_INTEGRATION_REPORT.md',
  'docs/NHSI-PROGRESS-DASHBOARD.md',
  'index.html',
]) {
  rw(file, (s) =>
    s
      .replace(/tests-[0-9]{3,4}/g, `tests-${test}`)
      .replace(/\b[0-9],[0-9]{3}\s+tests\b/g, `${testComma} tests`)
      .replace(/(?<![,0-9])\b[0-9]{3,4}\s+tests\b/g, `${test} tests`)
      .replace(/\b[0-9],[0-9]{3}\s+pass\b/g, `${testComma} pass`)
      .replace(/\b[0-9],[0-9]{3}\s+tests\s*\/\s*0\s+fail\b/g, `${testComma} tests / 0 fail`)
      .replace(/(?<![,0-9])\b[0-9]{3,4}\s+tests\s*\/\s*0\s+fail\b/g, `${test} tests / 0 fail`)
      .replace(
        /\b[0-9]{2}\.[0-9]{2}%\s+line\s*\/\s*[0-9]{2}\.[0-9]{2}%\s+func\b/g,
        `${line}% line / ${func}% func`,
      )
      .replace(
        /\b[0-9]{2}\.[0-9]{2}\s*%\s+line\s*\/\s*[0-9]{2}\.[0-9]{2}\s*%\s+function\b/g,
        `${line} % line / ${func} % function`,
      )
      .replace(
        /coverage-[0-9]{2}\.[0-9]{2}%25%20line%20%C2%B7%20[0-9]{2}\.[0-9]{2}%25%20func/g,
        `coverage-${line}%25%20line%20%C2%B7%20${func}%25%20func`,
      )
      .replace(/Line coverage: [0-9]{2}\.[0-9]{2}%/g, `Line coverage: ${line}%`)
      .replace(/Function coverage: [0-9]{2}\.[0-9]{2}%/g, `Function coverage: ${func}%`)
      .replace(/Test count: \d+/g, `Test count: ${test}`)
      // HTML stat card: `<div class="n …">2162</div> <div class="l">tests · …</div>` — the number and
      // its "tests" label are split across tags, so the plain "N tests" patterns above miss it.
      .replace(/(<div class="n[a-z ]*">)[0-9,]+(<\/div>\s*<div class="l">tests\b)/g, `$1${test}$2`),
  );
}

console.log(`Synced surfaces to ${test} tests · ${line}% line / ${func}% func`);
