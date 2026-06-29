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

const result = await Bun.build({
  entrypoints: [
    './index.html',
    './docs.html',
    './specs.html',
    './bible.html',
    './src/satellite-music.ts',
    './src/alife-gallery-boot.ts',
  ],
  outdir: './dist',
  minify: true,
  plugins: [tailwind],
});

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

console.log(`built ${result.outputs.length} artifacts -> dist/`);
