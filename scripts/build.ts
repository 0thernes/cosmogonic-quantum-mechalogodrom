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

const result = {
  success: staticResult.success && docsResult.success,
  logs: [...staticResult.logs, ...docsResult.logs],
  outputs: [...staticResult.outputs, ...docsResult.outputs],
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
