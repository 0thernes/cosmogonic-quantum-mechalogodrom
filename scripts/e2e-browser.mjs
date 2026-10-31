// Browser e2e smoke: boots the built app in headless Chromium (software GL), then checks
//  1. no page errors / app console errors (missing /api on a static server is ignored),
//  2. the 🧪 sandbox panel: toggle applies, +/− move in 10% steps, clamp at 0..300%, Reset,
//  3. Mini World: the entry pill enters ?world=mini, the world boots, and Back returns.
// Usage: node scripts/e2e-browser.mjs [baseUrl=http://localhost:8765/] [shotDir=e2e-shots]
// Needs a static server over dist/ and Playwright's chromium (or CHROME_PATH).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:8765/';
const dir = process.argv[3] ?? 'e2e-shots';
const BOOT_MS = Number(process.env.E2E_BOOT_MS ?? 600_000);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
const cdp = await page.context().newCDPSession(page);
const errors = [];
const failures = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !/\/api\/|status of 40\d|status of 50\d/.test(m.text()))
    errors.push(`console: ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${dir}/${name}.png`, Buffer.from(data, 'base64'));
};
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
const state = () =>
  page
    .evaluate(() => ({
      search: location.search,
      failed: /STARTUP FAILED/.test(document.body.innerText),
      pills: [...document.querySelectorAll('a,button')]
        .map((e) => e.textContent.trim())
        .filter((t) => /Mini World|full-size/.test(t)),
    }))
    .catch(() => null);
const waitFor = async (pred) => {
  const t0 = Date.now();
  while (Date.now() - t0 < BOOT_MS) {
    await sleep(5000);
    const s = await state();
    if (s && (s.failed || pred(s))) return s;
  }
  return state();
};

await page.goto(base, { waitUntil: 'commit' });
let s = await waitFor((x) => x.pills.some((t) => /Enter Mini/.test(t)));
check(
  s && !s.failed && s.pills.some((t) => /Enter Mini/.test(t)),
  'full world boots with the Mini World pill',
);
await sleep(5000);
await shot('01-full-world');

const sb = await page.evaluate(() => {
  const q = (id) => document.querySelector(`#cqm-sandbox-modal [data-id="${id}"]`); // re-query: rows re-render
  const pct = (id) => q(id).querySelector('.cqm-sb-pct').textContent;
  const click = (id, act) => q(id).querySelector(`[data-act=${act}]`).click();
  document.querySelector('#cqm-sandbox-toggle').click();
  const id = 'pop:organisms';
  const out = { start: pct(id) };
  click(id, 'up');
  out.up1 = pct(id);
  click(id, 'dn');
  click(id, 'dn');
  out.dn2 = pct(id);
  for (let i = 0; i < 40; i++) click(id, 'up');
  out.max = pct(id);
  out.upDisabled = q(id).querySelector('[data-act=up]').disabled;
  for (let i = 0; i < 40; i++) click(id, 'dn');
  out.min = pct(id);
  const cb = q(id).querySelector('input');
  cb.click();
  out.offClass = q(id).classList.contains('cqm-sb-off');
  out.stored = localStorage.getItem('cqm.sandbox.v1');
  [...document.querySelectorAll('#cqm-sandbox-modal button')]
    .find((b) => /reset/i.test(b.textContent))
    .click();
  out.reset = pct(id);
  out.resetOn = q(id).querySelector('input').checked;
  document.querySelector('#cqm-sandbox-toggle').click();
  return out;
});
console.log('sandbox', JSON.stringify(sb));
check(sb.start === '100%' && sb.up1 === '110%' && sb.dn2 === '90%', '+/− step by 10%');
check(sb.max === '300%' && sb.upDisabled && sb.min === '0%', 'levels clamp to 0..300%');
check(sb.offClass && /"on":false/.test(sb.stored ?? ''), 'toggle applies and persists');
check(sb.reset === '100%' && sb.resetOn, 'Reset restores defaults');
await shot('02-sandbox');

await page.evaluate(() =>
  [...document.querySelectorAll('a,button')]
    .find((e) => /Enter Mini World/.test(e.textContent))
    .click(),
);
await sleep(3000);
s = await waitFor((x) => x.pills.some((t) => /full-size/.test(t)));
check(s && !s.failed && s.search.includes('world=mini'), 'Mini World boots');
await sleep(5000);
await shot('03-mini-world');
await page.evaluate(() =>
  [...document.querySelectorAll('a,button')].find((e) => /full-size/.test(e.textContent)).click(),
);
await sleep(3000);
s = await waitFor((x) => x.pills.some((t) => /Enter Mini/.test(t)));
check(s && !s.failed && !s.search.includes('world=mini'), 'Back returns to the full world');
await shot('04-back');

check(errors.length === 0, `no console/page errors (${errors.length})`);
for (const e of errors.slice(0, 20)) console.log(e);
await browser.close();
process.exit(failures.length ? 1 : 0);
