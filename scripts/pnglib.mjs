// Shared minimal PNG writer for the sprite generators.
// Reuses the byte-building logic (IHDR/IDAT/IEND + CRC-32) originally written
// for gen-placeholder-sprites.mjs, extended to RGBA (color type 6) so sprites
// can have transparent backgrounds.
//
// PNG spec: https://www.w3.org/TR/png/

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import deflateSync from 'node:zlib';

// CRC32 lookup table (PNG uses CRC-32/ISO-HDLC for chunk checksums).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

// Builds a PNG chunk: length(u32) + type + data + crc(u32 over type+data).
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = u32be(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([u32be(data.length), typeBuf, data, crcBuf]);
}

// Accepts [r,g,b] / [r,g,b,a] as-is; parses '#rgb', '#rrggbb', '#rrggbbaa'.
export function hex(color) {
  if (Array.isArray(color)) {
    return [color[0], color[1], color[2], color[3] ?? 255];
  }
  let s = color.replace('#', '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  if (s.length !== 6 && s.length !== 8) throw new Error(`bad color: ${color}`);
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
    s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255,
  ];
}

// A transparent RGBA pixel grid with tiny drawing helpers.
export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4); // all zero = fully transparent
  }

  px(x, y, color) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = hex(color);
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  rect(x, y, w, h, color) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, color);
    }
  }
}

// Encodes a Grid as a valid PNG (8-bit RGBA, no interlace).
export function buildPng(grid) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width, height, bitDepth=8, colorType=6 (RGBA),
  //       compression=0, filter=0, interlace=0.
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(grid.w, 0);
  ihdr.writeUInt32BE(grid.h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type (RGBA)
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw data: one filter byte (0 = None) per scanline, then w RGBA quads.
  const rowLen = 1 + grid.w * 4;
  const raw = Buffer.alloc(rowLen * grid.h);
  for (let y = 0; y < grid.h; y++) {
    raw[y * rowLen] = 0; // filter: None
    Buffer.from(grid.data.buffer, grid.data.byteOffset, grid.data.byteLength)
      .copy(raw, y * rowLen + 1, y * grid.w * 4, (y + 1) * grid.w * 4);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function writePng(path, grid) {
  mkdirSync(dirname(path), { recursive: true });
  const png = buildPng(grid);
  writeFileSync(path, png);
  console.log(`wrote ${path} (${grid.w}x${grid.h}, ${png.length} bytes)`);
}
