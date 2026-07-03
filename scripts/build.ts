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
try {
  await rm('./dist', { recursive: true, force: true });
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code !== 'EACCES' && code !== 'EPERM') throw error;
  console.warn(`build: could not prune dist/ (${code}); continuing with existing outdir.`);
}

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
if (satSrc) await cp(`./dist/${satSrc}`, './dist/satellite-music.js');

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
if (galSrc) {
  await cp(`./dist/${galSrc}`, './dist/alife-gallery.js');
  await cp('./dist/alife-gallery.js', './alife-gallery.js');
}

// Copy public textures (pantheon equirect atlas + portal sampling) into dist for production.
try {
  await mkdir('./dist/textures', { recursive: true });
  await cp('./public/textures', './dist/textures', { recursive: true });
} catch {
  /* public/textures optional in minimal checkouts — pantheon falls back to data texture */
}

console.log(`built ${result.outputs.length} artifacts -> dist/`);
