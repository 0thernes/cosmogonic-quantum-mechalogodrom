/**
 * Production build. The bunfig [serve.static] plugin list only applies to the
 * dev server, so the Tailwind plugin must be wired explicitly here.
 */
import { rm } from 'node:fs/promises';
import tailwind from 'bun-plugin-tailwind';

// Clean the outdir first — Bun.build does NOT prune old outputs, so without this dist/ accumulates every
// historical hashed chunk-*.js/css from prior builds, and `bun run pages` then copies the whole pile into
// site/ (the deployed index references only the live chunks; the rest is dead weight). Mirrors the rm()
// that build-pages.ts already does for site/. CI is unaffected (fresh checkout); this fixes local rot.
await rm('./dist', { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ['./index.html', './docs.html', './specs.html'],
  outdir: './dist',
  minify: true,
  plugins: [tailwind],
});

if (!result.success) {
  for (const message of result.logs) console.error(message);
  process.exit(1);
}
console.log(`built ${result.outputs.length} artifacts -> dist/`);
