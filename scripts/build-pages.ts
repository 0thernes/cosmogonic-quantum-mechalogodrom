/**
 * Assemble the static GitHub Pages site from the production build.
 *
 * GitHub *project* Pages serves under a subpath (`/<repo>/`), and the app uses absolute in-app nav
 * links (`/docs`, `/lab`) plus an HTMX poll (`/api/audit`) that only resolve at a server root. Bun's
 * bundled asset references are ALREADY relative (`./chunk-*`), so only the navigation needs fixing.
 *
 * This script (run AFTER `bun run build`):
 *   1. copies `dist/` (bundled index.html + docs.html + chunks) into `site/`,
 *   2. drops the self-contained `/lab` artifact at `site/lab/index.html`,
 *      plus the static consciousness-indicator dashboard at `site/lab/consciousness/index.html`
 *      and the headless sentience analytics dashboard at `site/lab/sentience/index.html`,
 *   3. copies `docs/` into `site/docs/`, pruning local-only archived drafts, so public report links
 *      resolve on Pages without stale ignored research artifacts,
 *   4. copies `docs/reports/assets/` for ALife SVG metrics (relative paths in the gallery),
 *   5. rewrites the absolute nav links to be subpath-relative, and neutralizes the server-only
 *      `/api/audit` poll (no server on Pages — leaving it would 404 every 5 s).
 *
 * The dev server (server.ts) is untouched: it keeps its absolute `/docs` `/lab` routes for local
 * use. Only the deployed copy is rewritten. Output: `./site` (the Pages artifact).
 */
import { cp, mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const DIST = new URL('dist/', ROOT);
const SITE = new URL('site/', ROOT);

const LOCAL_ONLY_DOC_ARTIFACTS = [
  '2026-06-17-STATE-OF-THE-ART-COMBINED.md',
  '2026-06-17-STATE-OF-THE-ART-SUPER-CREATURE.md',
  '2026-06-17-STATE-OF-THE-ART-WHOLE-REPO.md',
  '2026-06-20-RESEARCH-BEDROCK.md',
  '2026-06-20-ROADMAP-TO-NHSI-AND-SENTIENCE.xml',
  '2026-06-20-SUPER-REPORT-PATH-TO-NHSI-AND-SENTIENCE.md',
  '2026-06-21-NHSI-HONESTY-AUDIT.md',
  '2026-06-21-NHSI-MANIFESTO-0THERNES-CORP.md',
  '2026-06-26-ALIFE-COMPARATIVE-AUDIT.md',
  '2026-06-26-alife-comparison-matrix.csv',
  'FILE-AUDIT-16-FILES-2026-07-07.md',
  'MASTER-ASSESSMENT-2026-07-07.md',
  'MASTER-ASSESSMENT-2026-07-07.html',
  'DOCUMENTATION-UPDATE-COMPLETION-SUMMARY-2026-07-07.md',
  '5-PASS-DOCUMENTATION-UPDATE-STRATEGY-2026-07-07.md',
  'reports/2026-07-07',
] as const;

const PUBLIC_PAGE_DOCS = [
  { source: 'CHANGELOG.md', target: 'CHANGELOG.md' },
  { source: 'ROADMAP-2026-06-26.md', target: 'ROADMAP-2026-06-26.md' },
  { source: 'THIRD-PARTY-NOTICES.md', target: 'THIRD-PARTY-NOTICES.md' },
  {
    source: 'docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md',
    target: 'docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md',
  },
  {
    source: 'docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.html',
    target: 'docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.html',
  },
  {
    source: 'docs/CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.md',
    target: 'docs/CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.md',
  },
  {
    source: 'docs/CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.html',
    target: 'docs/CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.html',
  },
] as const;

async function rewrite(
  file: string,
  edits: ReadonlyArray<readonly [string, string]>,
): Promise<void> {
  const target = new URL(file, SITE);
  let html = await readFile(target, 'utf8');
  for (const [from, to] of edits) html = html.split(from).join(to);
  // Atomic write (temp + rename): a direct writeFile() truncates first, so a crash mid-write
  // (disk full, I/O error on a CI runner) would silently deploy a corrupted HTML artifact.
  const tmp = new URL(file + '.tmp', SITE);
  await writeFile(tmp, html);
  await rename(tmp, target);
}

// 1. Fresh site/ from the production bundle.
await rm(SITE, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });
await cp(DIST, SITE, { recursive: true });

// 2. The /lab artifacts as clean directory indexes.
await mkdir(new URL('lab/', SITE), { recursive: true });
await cp(new URL('lab/quantum-wildbeyond.html', ROOT), new URL('lab/index.html', SITE));
await cp(
  new URL('lab/consciousness-data.json', ROOT),
  new URL('lab/consciousness-data.json', SITE),
);
await cp(new URL('lab/sentience-data.json', ROOT), new URL('lab/sentience-data.json', SITE));
await mkdir(new URL('lab/consciousness/', SITE), { recursive: true });
await cp(new URL('lab/consciousness.html', ROOT), new URL('lab/consciousness/index.html', SITE));
await cp(
  new URL('lab/consciousness-data.json', ROOT),
  new URL('lab/consciousness/consciousness-data.json', SITE),
);
await mkdir(new URL('lab/sentience/', SITE), { recursive: true });
await cp(new URL('lab/sentience.html', ROOT), new URL('lab/sentience/index.html', SITE));
await cp(
  new URL('lab/sentience-data.json', ROOT),
  new URL('lab/sentience/sentience-data.json', SITE),
);

// 2b. Public docs/report targets. Source pages link Markdown/HTML reports directly; publish them.
await cp(new URL('docs/', ROOT), new URL('docs/', SITE), {
  recursive: true,
});
for (const artifact of LOCAL_ONLY_DOC_ARTIFACTS) {
  await rm(new URL(`docs/${artifact}`, SITE), { recursive: true, force: true });
}

// 2c. ALife SVG assets for docs/specs gallery (repo-relative paths).
await cp(new URL('docs/reports/assets/', ROOT), new URL('docs/reports/assets/', SITE), {
  recursive: true,
});
for (const { source, target } of PUBLIC_PAGE_DOCS) {
  await cp(new URL(source, ROOT), new URL(target, SITE));
}
// Flat copy at site root — bulletproof on GitHub Pages (gallery tries assets/alife/ first).
await cp(new URL('docs/reports/assets/', ROOT), new URL('assets/alife/', SITE), {
  recursive: true,
});
// Satellite music widget for Lab (Docs/Spec bundle it via their entry modules).
try {
  await cp(new URL('dist/satellite-music.js', ROOT), new URL('satellite-music.js', SITE));
} catch {
  /* local build may not have run yet — CI always builds first */
}
try {
  await cp(new URL('dist/alife-gallery.js', ROOT), new URL('alife-gallery.js', SITE));
} catch {
  /* local build may not have run yet */
}

// 3. Rewrite absolute nav links → subpath-relative; neutralize the server-only audit poll.
// V81: append a per-deploy `?v=` cache-buster to every cross-page nav link so a returning visitor never
// sees a STALE cached docs/spec page. The browser keys its HTTP cache by URL — an unchanged `specs.html`
// URL kept serving the pre-update copy after a deploy; `specs.html?v=<sha>` is a fresh URL each deploy,
// so navigation always fetches the current page. GITHUB_SHA is set in the CI deploy (the copy that
// matters); it falls back to a local marker for local builds.
//
// V93: GITHUB_REPOSITORY (set in CI) gives us the repo name for absolute paths. GitHub Pages project
// sites serve under /<repo>/, so from lab/index.html the `../` relative paths can fail if the browser
// doesn't normalize the trailing slash. Using absolute /<repo>/index.html paths is bulletproof.
const V = (process.env.GITHUB_SHA || '').slice(0, 8) || 'local';
const q = `?v=${V}`;
const repo = process.env.GITHUB_REPOSITORY?.split('/')?.[1] || '';
const base = repo ? `/${repo}` : ''; // e.g. "/cosmogonic-quantum-mechalogodrom" or "" (local)

// Lab page: use absolute paths on CI (bulletproof under project Pages subpath), relative locally.
// CRITICAL: href="/" must be replaced LAST — it's a substring of href="/docs", href="/spec", etc.
// If it runs first, it corrupts those into broken URLs (the GitHub Pages 404 bug).
const navFromLab: ReadonlyArray<readonly [string, string]> = base
  ? [
      ['href="/docs"', `href="${base}/docs.html${q}"`],
      ['href="/spec"', `href="${base}/specs.html${q}"`],
      ['href="/bible"', `href="${base}/bible.html${q}"`],
      ['href="/lab/consciousness"', `href="${base}/lab/consciousness/${q}"`],
      ['href="/lab/sentience"', `href="${base}/lab/sentience/${q}"`],
      ['href="/lab"', `href="${base}/lab/${q}"`],
      ['href="/lab/"', `href="${base}/lab/${q}"`],
      ['href="/"', `href="${base}/index.html${q}"`],
    ]
  : [
      ['href="/docs"', `href="../docs.html${q}"`],
      ['href="/spec"', `href="../specs.html${q}"`],
      ['href="/bible"', `href="../bible.html${q}"`],
      ['href="/lab/consciousness"', `href="./consciousness/${q}"`],
      ['href="/lab/sentience"', `href="./sentience/${q}"`],
      ['href="/lab"', `href="./${q}"`],
      ['href="/lab/"', `href="./${q}"`],
      ['href="/"', `href="../index.html${q}"`],
    ];

const navFromConsciousness: ReadonlyArray<readonly [string, string]> = base
  ? [
      ['href="/docs"', `href="${base}/docs.html${q}"`],
      ['href="/spec"', `href="${base}/specs.html${q}"`],
      ['href="/bible"', `href="${base}/bible.html${q}"`],
      ['href="/lab/consciousness"', `href="${base}/lab/consciousness/${q}"`],
      ['href="/lab/sentience"', `href="${base}/lab/sentience/${q}"`],
      ['href="/lab"', `href="${base}/lab/${q}"`],
      ['href="/lab/"', `href="${base}/lab/${q}"`],
      ['href="/"', `href="${base}/index.html${q}"`],
    ]
  : [
      ['href="/docs"', `href="../../docs.html${q}"`],
      ['href="/spec"', `href="../../specs.html${q}"`],
      ['href="/bible"', `href="../../bible.html${q}"`],
      ['href="/lab/consciousness"', `href="./${q}"`],
      ['href="/lab/sentience"', `href="../sentience/${q}"`],
      ['href="/lab"', `href="../${q}"`],
      ['href="/lab/"', `href="../${q}"`],
      ['href="/"', `href="../../index.html${q}"`],
    ];

const navFromSentience: ReadonlyArray<readonly [string, string]> = base
  ? [
      ['href="/docs"', `href="${base}/docs.html${q}"`],
      ['href="/spec"', `href="${base}/specs.html${q}"`],
      ['href="/bible"', `href="${base}/bible.html${q}"`],
      ['href="/lab/consciousness"', `href="${base}/lab/consciousness/${q}"`],
      ['href="/lab/sentience"', `href="${base}/lab/sentience/${q}"`],
      ['href="/lab"', `href="${base}/lab/${q}"`],
      ['href="/lab/"', `href="${base}/lab/${q}"`],
      ['href="/"', `href="${base}/index.html${q}"`],
    ]
  : [
      ['href="/docs"', `href="../../docs.html${q}"`],
      ['href="/spec"', `href="../../specs.html${q}"`],
      ['href="/bible"', `href="../../bible.html${q}"`],
      ['href="/lab/consciousness"', `href="../consciousness/${q}"`],
      ['href="/lab/sentience"', `href="./${q}"`],
      ['href="/lab"', `href="../${q}"`],
      ['href="/lab/"', `href="../${q}"`],
      ['href="/"', `href="../../index.html${q}"`],
    ];

// Root-level pages: use absolute paths on CI, relative locally.
const navRoot: ReadonlyArray<readonly [string, string]> = base
  ? [
      ['href="/CHANGELOG.md"', `href="${base}/CHANGELOG.md"`],
      ['href="/docs/', `href="${base}/docs/`],
      ['href="/ROADMAP-2026-06-26.md"', `href="${base}/ROADMAP-2026-06-26.md"`],
      ['href="/THIRD-PARTY-NOTICES.md"', `href="${base}/THIRD-PARTY-NOTICES.md"`],
      ['href="/docs"', `href="${base}/docs.html${q}"`],
      ['href="/spec"', `href="${base}/specs.html${q}"`],
      ['href="/bible"', `href="${base}/bible.html${q}"`],
      ['href="/lab/consciousness"', `href="${base}/lab/consciousness/${q}"`],
      ['href="/lab/sentience"', `href="${base}/lab/sentience/${q}"`],
      ['href="/lab"', `href="${base}/lab/${q}"`],
      ['href="/"', `href="${base}/index.html${q}"`],
    ]
  : [
      ['href="/CHANGELOG.md"', 'href="./CHANGELOG.md"'],
      ['href="/docs/', 'href="./docs/'],
      ['href="/ROADMAP-2026-06-26.md"', 'href="./ROADMAP-2026-06-26.md"'],
      ['href="/THIRD-PARTY-NOTICES.md"', 'href="./THIRD-PARTY-NOTICES.md"'],
      ['href="/docs"', `href="docs.html${q}"`],
      ['href="/spec"', `href="specs.html${q}"`],
      ['href="/bible"', `href="bible.html${q}"`],
      ['href="/lab/consciousness"', `href="lab/consciousness/${q}"`],
      ['href="/lab/sentience"', `href="lab/sentience/${q}"`],
      ['href="/lab"', `href="lab/${q}"`],
      ['href="/"', `href="index.html${q}"`],
    ];

await rewrite('index.html', [
  ...navRoot,
  ['hx-get="/api/audit"', ''], // no server on Pages — stop the 5 s 404 poll; panel stays empty
]);
await rewrite('docs.html', [
  ...navRoot,
  ['</body>', '    <script type="module" src="./alife-gallery.js"></script>\n  </body>'],
]);
await rewrite('specs.html', [
  ...navRoot,
  ['</body>', '    <script type="module" src="./alife-gallery.js"></script>\n  </body>'],
]);
await rewrite('bible.html', navRoot);
await rewrite('lab/index.html', navFromLab);
await rewrite('lab/consciousness/index.html', navFromConsciousness);
await rewrite('lab/sentience/index.html', navFromSentience);

// 4. Drop a 404.html so GitHub Pages shows a branded fallback (not the raw GitHub 404).
const notFound = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 — Cosmogonic Quantum Mechalogodrom</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23030612'/%3E%3Cellipse cx='16' cy='16' rx='13' ry='5' fill='none' stroke='%230ef' stroke-width='1.6' transform='rotate(28 16 16)'/%3E%3Cellipse cx='16' cy='16' rx='13' ry='5' fill='none' stroke='%23fa0' stroke-width='1.6' transform='rotate(-28 16 16)'/%3E%3Ccircle cx='16' cy='16' r='4.5' fill='%230ef'/%3E%3C/svg%3E">
<style>body{background:#030612;color:#cfe9ff;font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}
a{color:#0ef;text-decoration:none;font-weight:600}</style></head>
<body><div style="text-align:center">
<h1>404</h1><p>The page you seek has collapsed into a singularity.</p>
<p><a href="${base ? `${base}/index.html` : 'index.html'}${q}">Return to the Dome &rarr;</a></p>
</div></body></html>`;
await writeFile(new URL('404.html', SITE), notFound);

// 5. Jekyll bypass — without this GitHub Pages may ignore `docs/reports/assets/*.svg`.
await writeFile(new URL('.nojekyll', SITE), '');

console.log(
  `assembled Pages site -> site/ (index.html, docs.html, specs.html, lab/index.html, lab/consciousness/index.html, lab/sentience/index.html, docs/, docs/reports/assets/) · cache-bust v=${V}`,
);
