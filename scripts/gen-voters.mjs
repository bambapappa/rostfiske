// Generates public/sprites/voters.png: 16 mixed voter variants, 16x16 each
// on a 128x32 sheet.
//   row 0, cells 0-7:  adults, body A (trousers) + body B (skirt), palettes 0-3
//   row 1, cells 8-11: adults, body C (long coat), palettes 0-3
//   row 1, cells 12-15: minors (smaller, ~12 px tall), palettes 0-3
// Adults = 3 base bodies x 4 palettes = 12 variants; minors = 4 variants.
//
// Run: `node scripts/gen-voters.mjs` — idempotent (same input → same bytes).
// License: CC0 (custom generated art, no external assets).

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Grid, writePng } from './pnglib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'sprites', 'voters.png');

const CELL = 16;
const COLS = 8;

const DARK = '#1a1a1a';
const SHOE = '#26232e';

// Neutral everyday palettes (hair + top + bottom + varied skin tones) —
// deliberately not party-colored.
const PALETTES = [
  { skin: '#e8b08a', hair: '#2a1a0f', top: '#d95763', bottom: '#3a4a6b' },
  { skin: '#8a5a3b', hair: '#141414', top: '#38b764', bottom: '#6b4a2f' },
  { skin: '#f0c8a0', hair: '#e3c56b', top: '#d8b13c', bottom: '#4a4a55' },
  { skin: '#c98a5b', hair: '#7a4a2f', top: '#9b6ad9', bottom: '#2f4f4f' },
];

function head(g, p, { hairSides = 2, hairY = 3 } = {}) {
  // head x6..9, y3..6; eyes; hair cap + side pixels
  g.rect(6, 3, 4, 4, p.skin);
  g.px(7, 5, DARK);
  g.px(9, 5, DARK);
  g.rect(6, 2, 4, 1, p.hair);
  for (let i = 0; i < hairSides; i++) {
    g.px(5, hairY + i, p.hair);
    g.px(10, hairY + i, p.hair);
  }
}

// Body A: trousers. Torso top-color, legs bottom-color.
function bodyTrousers(g, p) {
  head(g, p);
  g.rect(5, 7, 6, 4, p.top);          // torso
  g.rect(4, 8, 1, 3, p.top);          // sleeves
  g.rect(11, 8, 1, 3, p.top);
  g.px(4, 11, p.skin);                // hands
  g.px(11, 11, p.skin);
  g.rect(5, 11, 2, 3, p.bottom);      // legs
  g.rect(9, 11, 2, 3, p.bottom);
  g.rect(5, 14, 2, 1, SHOE);
  g.rect(9, 14, 2, 1, SHOE);
}

// Body B: skirt. Torso top-color, flared skirt bottom-color, bare legs.
function bodySkirt(g, p) {
  head(g, p, { hairSides: 3 });       // slightly longer hair
  g.rect(5, 7, 6, 3, p.top);          // torso
  g.rect(4, 8, 1, 2, p.top);          // sleeves
  g.rect(11, 8, 1, 2, p.top);
  g.px(4, 10, p.skin);                // hands
  g.px(11, 10, p.skin);
  g.rect(4, 10, 8, 3, p.bottom);      // flared skirt, y10..12
  g.px(6, 13, p.skin);                // legs
  g.px(9, 13, p.skin);
  g.px(6, 14, SHOE);                  // feet
  g.px(9, 14, SHOE);
}

// Body C: long coat. Collar in top color, coat in bottom color.
function bodyCoat(g, p) {
  head(g, p);
  g.rect(5, 7, 6, 2, p.top);          // collar/shoulders
  g.rect(5, 9, 6, 5, p.bottom);       // coat down to y13
  g.rect(4, 8, 1, 4, p.bottom);       // sleeves (coat color)
  g.rect(11, 8, 1, 4, p.bottom);
  g.px(4, 12, p.skin);                // hands
  g.px(11, 12, p.skin);
  g.px(7, 9, DARK);                   // coat buttons
  g.px(7, 11, DARK);
  g.rect(5, 14, 2, 1, SHOE);
  g.rect(9, 14, 2, 1, SHOE);
}

// Minor: smaller figure (~12 px tall, 6 px wide), bottom-aligned in the cell.
function bodyMinor(g, p) {
  // head x6..9, y4..6
  g.rect(6, 4, 4, 3, p.skin);
  g.px(7, 5, DARK);
  g.px(9, 5, DARK);
  g.rect(6, 3, 4, 1, p.hair);
  g.px(5, 4, p.hair);
  g.px(10, 4, p.hair);
  g.rect(6, 7, 4, 4, p.top);          // torso
  g.rect(6, 11, 1, 2, p.bottom);      // legs
  g.rect(9, 11, 1, 2, p.bottom);
  g.px(6, 13, SHOE);
  g.px(9, 13, SHOE);
}

const ADULT_BODIES = [bodyTrousers, bodySkirt, bodyCoat];

// Variant order on the sheet:
//   0..7   = body 0 palettes 0-3, body 1 palettes 0-3
//   8..11  = body 2 palettes 0-3
//   12..15 = minors palettes 0-3
const variants = [];
for (let b = 0; b < 2; b++) {
  for (let p = 0; p < PALETTES.length; p++) {
    variants.push({ draw: ADULT_BODIES[b], pal: PALETTES[p] });
  }
}
for (let p = 0; p < PALETTES.length; p++) {
  variants.push({ draw: ADULT_BODIES[2], pal: PALETTES[p] });
}
for (let p = 0; p < PALETTES.length; p++) {
  variants.push({ draw: bodyMinor, pal: PALETTES[p] });
}

const sheet = new Grid(CELL * COLS, CELL * 2);

variants.forEach(({ draw, pal }, i) => {
  const cx = (i % COLS) * CELL;
  const cy = Math.floor(i / COLS) * CELL;
  const cell = new Grid(CELL, CELL);
  draw(cell, pal);
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const idx = (y * CELL + x) * 4;
      if (cell.data[idx + 3] !== 0) {
        sheet.px(cx + x, cy + y, [
          cell.data[idx], cell.data[idx + 1], cell.data[idx + 2], cell.data[idx + 3],
        ]);
      }
    }
  }
});

writePng(OUT, sheet);
