const fs = require('fs');
const test = '1885';
const testComma = '1,885';
const line = '95.65';
const func = '92.84';
function rw(file, edit) {
  let s = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, edit(s), 'utf8');
}
rw('scripts/canonical-receipts.ts', (s) =>
  s
    .replace(/CANONICAL_TEST_COUNT = \d+;/, `CANONICAL_TEST_COUNT = ${test};`)
    .replace(/CANONICAL_LINE_COV = '[0-9]+\.[0-9]+';/, `CANONICAL_LINE_COV = '${line}';`)
    .replace(/CANONICAL_FUNC_COV = '[0-9]+\.[0-9]+';/, `CANONICAL_FUNC_COV = '${func}';`),
);
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
      .replace(/Test count: \d+/g, `Test count: ${test}`),
  );
}
