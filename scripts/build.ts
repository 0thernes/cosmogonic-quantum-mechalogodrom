/**
 * Production build. The bunfig [serve.static] plugin list only applies to the
 * dev server, so the Tailwind plugin must be wired explicitly here.
 */
import tailwind from 'bun-plugin-tailwind';

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
