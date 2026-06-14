/**
 * Dev helper: convert a 24-bit BMP (as written by the native engine's renderToBMP)
 * into a PNG, with no GDI+/native image dependency — just node:zlib for the IDAT.
 * Usage: bun scripts/bmp2png.ts <in.bmp> <out.png>
 */
import zlib from 'node:zlib';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: bun scripts/bmp2png.ts <in.bmp> <out.png>');
  process.exit(1);
}

const ab = await Bun.file(inPath).arrayBuffer();
const dv = new DataView(ab);
const bytes = new Uint8Array(ab);
if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
  console.error('not a BMP (bad magic)');
  process.exit(1);
}
const dataOffset = dv.getUint32(10, true);
const width = dv.getInt32(18, true);
const heightRaw = dv.getInt32(22, true);
const height = Math.abs(heightRaw);
const bottomUp = heightRaw > 0;
const bpp = dv.getUint16(28, true);
if (bpp !== 24) {
  console.error(`only 24-bit BMP supported (got ${bpp})`);
  process.exit(1);
}
const rowRaw = width * 3;
const stride = rowRaw + ((4 - (rowRaw % 4)) % 4);

// Build PNG raw scanlines (top-to-bottom), each prefixed with filter byte 0, RGB order.
const raw = new Uint8Array((width * 3 + 1) * height);
for (let y = 0; y < height; y++) {
  const srcY = bottomUp ? height - 1 - y : y;
  const srcRow = dataOffset + srcY * stride;
  let o = y * (width * 3 + 1);
  raw[o++] = 0; // filter: none
  for (let x = 0; x < width; x++) {
    const s = srcRow + x * 3;
    raw[o++] = bytes[s + 2]!; // R (BMP is BGR)
    raw[o++] = bytes[s + 1]!; // G
    raw[o++] = bytes[s + 0]!; // B
  }
}

// CRC32 (PNG polynomial).
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dvv = new DataView(out.buffer);
  dvv.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.length);
  dvv.setUint32(8 + data.length, crc32(crcInput), false);
  return out;
}

const ihdr = new Uint8Array(13);
const ihdrDv = new DataView(ihdr.buffer);
ihdrDv.setUint32(0, width, false);
ihdrDv.setUint32(4, height, false);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: RGB
// 10,11,12 = compression/filter/interlace = 0

const idat = new Uint8Array(zlib.deflateSync(raw, { level: 9 }));
const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
const total = parts.reduce((n, p) => n + p.length, 0);
const png = new Uint8Array(total);
let off = 0;
for (const p of parts) {
  png.set(p, off);
  off += p.length;
}
await Bun.write(outPath, png);
console.log(`wrote ${outPath} (${width}x${height}, ${png.length} bytes)`);
