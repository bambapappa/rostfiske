// Minimal dependency-free PNG decoder for sheet-guard tests (v1.2).
// Supports exactly what our generated sprite sheets use: 8-bit RGBA
// (color type 6), non-interlaced, any of the five scanline filters.
// No external deps — node:zlib inflate plus manual un-filtering.
//
// PNG spec: https://www.w3.org/TR/png/

import { inflateSync } from 'node:zlib';

export interface DecodedPng {
  width: number;
  height: number;
  /** RGBA8 pixel data, row-major, width*height*4 bytes. */
  data: Uint8Array;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Paeth predictor (filter type 4). */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode a PNG Buffer into { width, height, data(RGBA8) }. Throws on anything
 *  other than 8-bit RGBA non-interlaced (our sheets' exact format). */
export function decodePng(buf: Buffer): DecodedPng {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG (bad signature)');

  let ihdr: Buffer | null = null;
  const idat: Buffer[] = [];
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    off += 12 + len; // length + type + data + crc
  }
  if (!ihdr) throw new Error('missing IHDR');
  if (idat.length === 0) throw new Error('missing IDAT');

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth} (want 8)`);
  if (colorType !== 6) throw new Error(`unsupported color type ${colorType} (want 6 = RGBA)`);
  if (interlace !== 0) throw new Error('interlaced PNG not supported');

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const data = new Uint8Array(stride * height);
  let pos = 0;
  const prev = new Uint8Array(stride); // previous (already un-filtered) row
  for (let y = 0; y < height; y++) {
    if (pos >= raw.length) throw new Error(`IDAT truncated at row ${y}`);
    const filter = raw[pos];
    pos += 1;
    const cur = data.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos + x] ?? 0;
      const a = x >= bpp ? cur[x - bpp]! : 0; // left
      const b = prev[x]!; // up
      const c = x >= bpp ? prev[x - bpp]! : 0; // up-left
      let v: number;
      switch (filter) {
        case 0: v = rawByte; break; // None
        case 1: v = rawByte + a; break; // Sub
        case 2: v = rawByte + b; break; // Up
        case 3: v = rawByte + ((a + b) >> 1); break; // Average
        case 4: v = rawByte + paeth(a, b, c); break; // Paeth
        default: throw new Error(`unknown filter type ${filter} at row ${y}`);
      }
      cur[x] = v & 0xff;
    }
    pos += stride;
    prev.set(cur);
  }
  return { width, height, data };
}
