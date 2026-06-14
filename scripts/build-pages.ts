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
 *   3. rewrites the absolute nav links to be subpath-relative, and neutralizes the server-only
 *      `/api/audit` poll (no server on Pages — leaving it would 404 every 5 s).
 *
 * The dev server (server.ts) is untouched: it keeps its absolute `/docs` `/lab` routes for local
 * use. Only the deployed copy is rewritten. Output: `./site` (the Pages artifact).
 */
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const DIST = new URL('dist/', ROOT);
const SITE = new URL('site/', ROOT);

async function rewrite(
  file: string,
  edits: ReadonlyArray<readonly [string, string]>,
): Promise<void> {
  const target = new URL(file, SITE);
  let html = await readFile(target, 'utf8');
  for (const [from, to] of edits) html = html.split(from).join(to);
  await writeFile(target, html);
}

// 1. Fresh site/ from the production bundle.
await rm(SITE, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });
await cp(DIST, SITE, { recursive: true });

// 2. The /lab artifact as a clean directory index.
await mkdir(new URL('lab/', SITE), { recursive: true });
await cp(new URL('lab/quantum-wildbeyond.html', ROOT), new URL('lab/index.html', SITE));

// 3. Rewrite absolute nav links → subpath-relative; neutralize the server-only audit poll.
await rewrite('index.html', [
  ['href="/docs"', 'href="docs.html"'],
  ['href="/spec"', 'href="specs.html"'],
  ['href="/lab"', 'href="lab/"'],
  ['hx-get="/api/audit"', ''], // no server on Pages — stop the 5 s 404 poll; panel stays empty
]);
await rewrite('docs.html', [
  ['href="/spec"', 'href="specs.html"'],
  ['href="/lab"', 'href="lab/"'],
  ['href="/"', 'href="index.html"'],
]);
await rewrite('specs.html', [
  ['href="/docs"', 'href="docs.html"'],
  ['href="/lab"', 'href="lab/"'],
  ['href="/"', 'href="index.html"'],
]);

console.log('assembled Pages site -> site/ (index.html, docs.html, specs.html, lab/index.html)');
