/**
 * Dev verification helper: decode a base64 data-URL captured from the live preview
 * (saved to a tool-results .txt by the harness) into an image file on disk.
 * Usage: bun scripts/decode-capture.ts <input.txt> <output.jpg>
 */
const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: bun scripts/decode-capture.ts <input.txt> <output.jpg>');
  process.exit(1);
}
const raw = await Bun.file(inPath).text();
const idx = raw.indexOf('base64,');
if (idx < 0) {
  console.error('no base64 data-URL found in input');
  process.exit(1);
}
let b64 = raw.slice(idx + 'base64,'.length);
// Strip any trailing quote/whitespace/escape the harness may have wrapped around it.
b64 = b64.replace(/[^A-Za-z0-9+/=].*$/s, '').trim();
const bytes = Buffer.from(b64, 'base64');
await Bun.write(outPath, bytes);
console.log(`wrote ${bytes.length} bytes -> ${outPath}`);
