// Generates three minimal valid placeholder PNGs (16x16, single solid color each)
// for public/sprites/. These are NOT art — they exist so the sprite loader has
// real, openable images to fetch (onload fires, onerror does not) while curated
// CC0 pixel-art is pending. Replace before public release.
//
// Run: `node scripts/gen-placeholder-sprites.mjs`
//
// Writes:
//   public/sprites/voters.png       (#E2B3C7 — pink)
//   public/sprites/politicians.png  (#B3C7E2 — blue)
//   public/sprites/city.png         (#B3E2C7 — green)
//
// PNG spec: https://www.w3.org/TR/png/

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import deflateSync from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'sprites');

const SHEETS = [
  { name: 'voters',       rgb: [0xe2, 0xb3, 0xc7] },
  { name: 'politicians',  rgb: [0xb3, 0xc7, 0xe2] },
  { name: 'city',         rgb: [0xb3, 0xe2, 0xc7] },
];

const WIDTH = 16;
const HEIGHT = 16;

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

function buildPng({ rgb }) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width, height, bitDepth=8, colorType=2 (truecolor RGB),
  //       compression=0, filter=0, interlace=0.
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type (RGB)
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw image data: one filter byte (0 = None) per scanline, then WIDTH RGB triples.
  const rowLen = 1 + WIDTH * 3;
  const raw = Buffer.alloc(rowLen * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: None
    for (let x = 0; x < WIDTH; x++) {
      const p = off + 1 + x * 3;
      raw[p] = rgb[0];
      raw[p + 1] = rgb[1];
      raw[p + 2] = rgb[2];
    }
  }

  const idat = deflateSync.deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const sheet of SHEETS) {
  const png = buildPng(sheet);
  const outPath = join(OUT_DIR, `${sheet.name}.png`);
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes) #${sheet.rgb.map((b) => b.toString(16).padStart(2, '0')).join('')}`);
}
