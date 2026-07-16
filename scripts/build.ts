/**
 * Production build. The bunfig [serve.static] plugin list only applies to the
 * dev server, so the Tailwind plugin must be wired explicitly here.
 */
import { rm, cp, mkdir, readdir } from 'node:fs/promises';
import tailwind from 'bun-plugin-tailwind';

// Clean the outdir first — Bun.build does NOT prune old outputs, so without this dist/ accumulates every
// historical hashed chunk-*.js/css from prior builds, and `bun run pages` then copies the whole pile into
// site/ (the deployed index references only the live chunks; the rest is dead weight). Mirrors the rm()
// that build-pages.ts already does for site/. CI is unaffected (fresh checkout); this fixes local rot.
await rm('./dist', { recursive: true, force: true });

// Two builds into the same outdir, differing ONLY in `splitting`, because splitting is a per-build flag
// and the entrypoints want opposite treatment:
//
//  • The APP (index.html → main.ts) and the other static pages have NO dynamic imports, so splitting
//    would only shatter their single self-contained bundle into dozens of statically-imported chunks —
//    more requests, the same bytes, a deeper import waterfall, ZERO deferral (everything is still needed
//    at boot). One chunk per entry is the faster shape here, and it keeps the satellite-music /
//    alife-gallery stable-name copy logic below unchanged.
//  • docs.html DOES lazy-import mermaid (~800KB). It needs `splitting: true` so that import resolves to
//    its own on-demand chunk fetched after first paint instead of being baked into the docs entry bundle.
//
// Bun.build does not prune the outdir, so the second call simply adds docs' chunks alongside the first's.
const staticResult = await Bun.build({
  entrypoints: [
    './index.html',
    './specs.html',
    './bible.html',
    './src/satellite-music.ts',
    './src/alife-gallery-boot.ts',
  ],
  outdir: './dist',
  minify: true,
  // NOTE: `splitting: true` was evaluated and REJECTED here — Bun's HTML-entry bundler emits NO
  // <link rel=modulepreload> hints for split chunks, so a 6-deep static import chain (entry → three →
  // world → sim …) turns into a request WATERFALL that regresses first load worse than one chunk, and
  // it shatters the build into 100+ chunks (many empty). main.ts still defers the click-to-open panels
  // via `import()` — without splitting they stay in the entry chunk, but deferring their import moves
  // each panel's self-mount DOM work from during-boot to after first light (a real main-thread/TTI win
  // with no waterfall). Keep splitting OFF.
  plugins: [tailwind],
});

const docsResult = await Bun.build({
  entrypoints: ['./docs.html'],
  outdir: './dist',
  minify: true,
  splitting: true,
  plugins: [tailwind],
});

// Bun 1.3.14 mis-links an HTML entry built with `splitting: true`: dist/docs.html came out pointing at
// an ARBITRARY split chunk (a mermaid internal — 15 KB of railroad-diagram parser) instead of its own
// entry, while the real entry chunk was emitted and referenced by NOTHING. So /docs ran with zero
// javascript: `pre.mermaid` is `color: transparent` until mermaid stamps data-processed, so the
// ERD/ERM/ERP + module diagrams rendered as empty boxes, and the ALife metric gallery never mounted —
// on a page whose surrounding HTML looked perfectly healthy. Verified against a clean outdir, so it is
// the bundler and not outdir crosstalk from the static build above.
//
// Repair the tag from the build's OWN metadata rather than sniffing chunk contents: the single
// `kind: 'entry-point'` output whose path is a .js file IS the entry Bun meant to link (a tiny shim
// that statically imports the real entry chunk). Keeping `splitting: true` is what preserves the lazy
// mermaid chunk — building docs.html unsplit also fixes the link, but inlines mermaid's entire lazy
// graph eagerly and takes the entry from ~1.3 MB to ~4.8 MB.
{
  const jsEntries = docsResult.outputs.filter(
    (o) => o.kind === 'entry-point' && o.path.endsWith('.js'),
  );
  const entry = jsEntries[0];
  if (jsEntries.length !== 1 || !entry) {
    throw new Error(
      `build: expected exactly 1 js entry-point for docs.html, found ${jsEntries.length}`,
    );
  }
  const entryName = entry.path.split(/[\\/]/).pop() ?? '';
  const docsHtml = './dist/docs.html';
  const html = await Bun.file(docsHtml).text();
  const tag = html.match(/<script\b[^>]*\bsrc="\.\/(chunk-[a-z0-9]+\.js)"[^>]*><\/script>/);
  if (!tag?.[1]) throw new Error('build: could not find the docs.html entry <script> tag');
  if (tag[1] !== entryName) {
    await Bun.write(docsHtml, html.replace(tag[0], tag[0].replace(tag[1], entryName)));
    console.log(`docs: repaired mis-linked entry <script> ${tag[1]} -> ${entryName}`);
  }
  if (!(await Bun.file(`./dist/${entryName}`).exists())) {
    throw new Error(`build: docs entry ${entryName} is referenced but missing from dist/`);
  }

  // Existence is not enough to prove the link is RIGHT: the mis-linked chunk existed too, and was a
  // perfectly valid module that loaded 200 and threw nothing — it simply wasn't ours. So gate on the
  // wired module GRAPH actually containing docs-page.ts's top-level work (`mountAlifeMetricsGallery`
  // + mermaid's `startOnLoad` init). Walk the static imports because the entry Bun links may be a
  // shim that re-exports the real chunk; a marker check on the entry file alone would false-throw on
  // that shape. Cheap (a handful of chunks) and it fails the build loudly rather than shipping a
  // silently dead /docs again.
  const seen = new Set<string>();
  const pending = [entryName];
  let graph = '';
  while (pending.length > 0) {
    const name = pending.pop();
    if (name === undefined || seen.has(name)) continue;
    seen.add(name);
    const chunk = Bun.file(`./dist/${name}`);
    if (!(await chunk.exists())) continue;
    const code = await chunk.text();
    graph += code;
    // Match every static-import spelling the bundler emits, not just `from"./x"`: the entry Bun links
    // can be a bare side-effect shim (`import"./chunk-a.js";import"./chunk-b.js";`) with no `from` at
    // all, and missing those edges would strand the walk at the shim and false-throw below.
    for (const [, dep] of code.matchAll(/(?:from|import)\s*\(?"\.\/(chunk-[a-z0-9]+\.js)"/g)) {
      if (dep !== undefined) pending.push(dep);
    }
  }
  for (const marker of ['alife-metrics', 'startOnLoad']) {
    if (!graph.includes(marker)) {
      throw new Error(
        `build: dist/docs.html is wired to ${entryName}, whose import graph lacks "${marker}" — ` +
          `that is not the docs entry module. /docs would load with a dead script: blank ERD/ERM/ERP ` +
          `diagrams and an empty ALife metric gallery.`,
      );
    }
  }
}

// The simulation worker is its OWN browser entrypoint: Bun's HTML bundler does not follow
// `new Worker(new URL(...))` references, so the worker graph must be bundled explicitly. world.ts
// resolves `./workers/simulation-worker.js` against the served chunk origin, so the artifact must
// sit at that stable path next to the chunks (dev: server.ts route; Pages: dist/ → site/ copy).
const workerResult = await Bun.build({
  entrypoints: ['./src/workers/simulation-worker.ts'],
  outdir: './dist/workers',
  target: 'browser',
  minify: true,
});

const result = {
  success: staticResult.success && docsResult.success && workerResult.success,
  logs: [...staticResult.logs, ...docsResult.logs, ...workerResult.logs],
  outputs: [...staticResult.outputs, ...docsResult.outputs, ...workerResult.outputs],
};

if (!result.success) {
  for (const message of result.logs) console.error(message);
  process.exit(1);
}

// Copy ALife SVG assets so they're available in dist/ (build-pages.ts also copies to site/).
await mkdir('./dist/docs/reports/assets', { recursive: true });
await cp('./docs/reports/assets', './dist/docs/reports/assets', { recursive: true });
await mkdir('./dist/assets/alife', { recursive: true });
await cp('./docs/reports/assets', './dist/assets/alife', { recursive: true });

const distFiles = await readdir('./dist');
let satSrc = distFiles.find((f) => f.startsWith('satellite-music') && f.endsWith('.js'));
if (!satSrc) {
  try {
    const nested = await readdir('./dist/src');
    satSrc = nested.find((f) => f.startsWith('satellite-music') && f.endsWith('.js'));
    if (satSrc) satSrc = `src/${satSrc}`;
  } catch {
    /* no nested src/ */
  }
}
if (!satSrc) throw new Error('build: satellite-music entry output is missing');
await cp(`./dist/${satSrc}`, './dist/satellite-music.js');

let galSrc = distFiles.find((f) => f.startsWith('alife-gallery') && f.endsWith('.js'));
if (!galSrc) {
  try {
    const nested = await readdir('./dist/src');
    galSrc = nested.find((f) => f.startsWith('alife-gallery') && f.endsWith('.js'));
    if (galSrc) galSrc = `src/${galSrc}`;
  } catch {
    /* no nested src/ */
  }
}
if (!galSrc) throw new Error('build: alife-gallery entry output is missing');
await cp(`./dist/${galSrc}`, './dist/alife-gallery.js');
await cp('./dist/alife-gallery.js', './alife-gallery.js');

// The worker pool dies silently (main-thread sync fallback) if this artifact goes missing, so a
// partial build must fail loudly here rather than ship a workerless bundle.
if (!(await Bun.file('./dist/workers/simulation-worker.js').exists())) {
  throw new Error('build: workers/simulation-worker.js output is missing');
}

// Copy public textures (pantheon equirect atlas + portal sampling) into dist for production.
await mkdir('./dist/textures', { recursive: true });
await cp('./public/textures', './dist/textures', { recursive: true });

// PERF/LOAD (v0.20+): lift the fonts OFF the render-blocking critical path.
//
// Bun's HTML bundler merges every in-page <link rel=stylesheet> (app.css + fonts.css) into ONE chunk
// and inlines each woff2 as a base64 `data:` URI (~257 KB / 210 KB gzip of Latin-subset faces) — bytes
// the browser must download AND parse before the FIRST paint, even though every face already carries
// `font-display: swap`. There is no build flag to stop this and no way to express a non-blocking sheet
// in the source HTML (Bun strips media/onload). So we EXTRACT the `@font-face` blocks out of the merged
// chunk post-build into a standalone sheet and re-inject that NON-render-blocking:
//   • `media="print"` keeps it off the first-paint critical path; `onload this.media='all'` promotes it
//     to screen the instant it arrives; `<noscript>` keeps fonts for the JS-off case.
//   • `font-display: swap` paints text in the fallback until the face lands (no FOIT).
//   • `?v=<hash>` cache-busts the stable filename across deploys.
// SAME Latin-subset fonts, weights, and swap behaviour — ZERO visual change; only the render-blocking
// cost of the font bytes is removed (render-blocking CSS ~333 KB → ~78 KB, 210 KB → ~14 KB gzip).
// `@font-face` bodies never contain nested `{}`, so `@font-face{…}` matches reliably even minified.
{
  const idxHtml = './dist/index.html';
  let html = await Bun.file(idxHtml).text();
  // Drop any leftover source-path <link> Bun left for fonts.css (it doesn't bundle a 2nd sheet cleanly).
  html = html.replace(/<link\b[^>]*href="\.\/src\/styles\/fonts\.css"[^>]*>\s*/g, '');
  const chunkMatch = html.match(
    /<link rel="stylesheet"[^>]*href="\.\/(chunk-[a-z0-9]+\.css)"[^>]*>/,
  );
  const chunkTag = chunkMatch?.[0];
  const chunkName = chunkMatch?.[1];
  if (!chunkTag || !chunkName) {
    throw new Error(
      'build: could not find the app CSS <link> in dist/index.html for font extraction',
    );
  }
  const chunkPath = `./dist/${chunkName}`;
  const css = await Bun.file(chunkPath).text();
  const faces = css.match(/@font-face\{[^}]*\}/g) ?? [];
  if (faces.length === 0) {
    throw new Error(
      `build: expected @font-face blocks in ${chunkName} but found none (font split broke)`,
    );
  }
  const fontsCss = faces.join('\n');
  const trimmedChunk = css.replace(/@font-face\{[^}]*\}/g, '');
  // Rename the trimmed chunk to its NEW content hash so a cached font-bloated copy can never mismatch.
  const newHash = Bun.hash(trimmedChunk).toString(16).slice(0, 10);
  const newChunkName = `chunk-${newHash}.css`;
  await Bun.write(`./dist/${newChunkName}`, trimmedChunk);
  await rm(chunkPath, { force: true });
  // Emit the extracted faces as a standalone, cache-busted sheet.
  const ver = Bun.hash(fontsCss).toString(16).slice(0, 10);
  const fontsName = `fonts-${ver}.css`;
  await Bun.write(`./dist/${fontsName}`, fontsCss);
  // Repoint the render-blocking link to the trimmed chunk, then inject the fonts sheet non-blocking.
  const inject =
    `<link rel="stylesheet" href="./${fontsName}" media="print" onload="this.media='all'">` +
    `<noscript><link rel="stylesheet" href="./${fontsName}"></noscript>`;
  html = html.replace(chunkTag, chunkTag.replace(chunkName, newChunkName) + inject);
  await Bun.write(idxHtml, html);
  console.log(
    `fonts: extracted ${faces.length} @font-face → ${fontsName} (non-blocking); ` +
      `render-blocking css now ${(trimmedChunk.length / 1024) | 0} KB`,
  );
}

console.log(`built ${result.outputs.length} artifacts -> dist/`);
