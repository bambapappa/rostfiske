// Generates public/sprites/politicians.png: 8 party-leader caricatures,
// 16x16 each on a 128x32 sheet. Cell order matches PARTIES order:
//   row 0: s, m, sd, c
//   row 1: v, kd, l, mp
//
// Each leader = base body (suit in party color + skin tone) drawn
// programmatically, plus a distinguishing-feature overlay (hair style/color,
// glasses, mustache, beard). Cartoon "liknande" caricatures, deliberately
// simplified: S dark quiff, M glasses + sideburns, SD blond neat, C mustache
// + glasses, V long dark hair, KD blond page, L bald + beard, MP auburn.
//
// Suit colors mirror FALLBACK_PARTIES in src/fallback.ts (display-only).
//
// Run: `node scripts/gen-leaders.mjs` — idempotent (same input → same bytes).
// License: CC0 (custom generated art, no external assets).

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Grid, writePng } from './pnglib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'sprites', 'politicians.png');

const CELL = 16; // sprite size
const COLS = 8;  // cells per row

const DARK = '#1a1a1a';
const SHOE = '#26232e';
const WHITE = '#f2f2f2';

// Party order = sheet order. suit colors from FALLBACK_PARTIES.
const LEADERS = [
  {
    code: 's', suit: '#E8112d', skin: '#e8b08a', hair: '#3a2a1a',
    feature: 'dark quiff (hårsnibb)',
  },
  {
    code: 'm', suit: '#1B7FC1', skin: '#ecc19c', hair: '#7a6a58',
    feature: 'glasses + sideburns',
  },
  {
    code: 'sd', suit: '#4E9E2C', skin: '#e8b08a', hair: '#e3c56b',
    feature: 'blond neat',
  },
  {
    code: 'c', suit: '#00965E', skin: '#ecc19c', hair: '#5a4632',
    feature: 'mustache + glasses',
  },
  {
    code: 'v', suit: '#DA291C', skin: '#d9a066', hair: '#20150f',
    feature: 'long dark hair',
  },
  {
    code: 'kd', suit: '#231977', skin: '#ecc19c', hair: '#d9b44a',
    feature: 'blond page',
  },
  {
    code: 'l', suit: '#006AB3', skin: '#e8b08a', hair: '#8a7a6a',
    feature: 'bald + beard',
  },
  {
    code: 'mp', suit: '#83CF39', skin: '#ecc19c', hair: '#9a4f2b',
    feature: 'auburn',
  },
];

// Head occupies x5..10, y3..8. Torso y10..13, legs y14, shoes y15.
function drawBaseBody(g, { suit, skin }) {
  // head + neck
  g.rect(5, 3, 6, 6, skin);
  g.rect(7, 9, 2, 1, skin);
  // eyes
  g.px(6, 5, DARK);
  g.px(9, 5, DARK);
  // suit: shoulders (wider row), torso, arms
  g.rect(3, 10, 10, 1, suit);
  g.rect(4, 11, 8, 3, suit);
  g.rect(3, 11, 1, 3, suit);
  g.rect(12, 11, 1, 3, suit);
  // shirt + tie
  g.rect(7, 10, 2, 3, WHITE);
  g.px(7, 11, DARK);
  g.px(8, 11, DARK);
  g.px(7, 12, DARK);
  // hands, legs, shoes
  g.px(3, 14, skin);
  g.px(12, 14, skin);
  g.rect(5, 14, 2, 1, DARK);
  g.rect(9, 14, 2, 1, DARK);
  g.rect(4, 15, 3, 1, SHOE);
  g.rect(9, 15, 3, 1, SHOE);
}

// Distinguishing-feature overlays, drawn after the base body.
const FEATURES = {
  s(g, { hair }) {
    // dark hair cap + upward quiff/snibb at the front
    g.rect(5, 2, 6, 1, hair);
    g.rect(4, 3, 1, 2, hair);
    g.rect(11, 3, 1, 2, hair);
    g.rect(9, 1, 2, 1, hair); // snibben
  },
  m(g, { hair }) {
    // hair + sideburns down the sides of the face + glasses
    g.rect(5, 2, 6, 1, hair);
    g.rect(4, 3, 1, 4, hair); // sideburn
    g.rect(11, 3, 1, 4, hair);
    glasses(g);
  },
  sd(g, { hair }) {
    // neat blond hairline
    g.rect(5, 2, 6, 1, hair);
    g.rect(4, 3, 2, 1, hair);
    g.rect(10, 3, 2, 1, hair);
    g.px(4, 4, hair);
    g.px(11, 4, hair);
  },
  c(g, { hair }) {
    // brown hair + mustache + glasses
    g.rect(5, 2, 6, 1, hair);
    g.rect(4, 3, 1, 2, hair);
    g.rect(11, 3, 1, 2, hair);
    g.rect(6, 6, 4, 1, hair); // mustache
    glasses(g);
  },
  v(g, { hair }) {
    // long dark hair down past the shoulders
    g.rect(5, 2, 6, 1, hair);
    g.rect(4, 3, 1, 8, hair);
    g.rect(11, 3, 1, 8, hair);
  },
  kd(g, { hair }) {
    // blond page/bob: cap + straight fringe + sides to the jaw
    g.rect(5, 2, 6, 1, hair);
    g.rect(4, 3, 8, 1, hair); // fringe covers the forehead
    g.rect(4, 4, 1, 4, hair);
    g.rect(11, 4, 1, 4, hair);
  },
  l(g, { hair }) {
    // bald crown + full beard around the chin/jaw
    g.rect(5, 7, 6, 1, hair); // beard along the chin
    g.px(4, 6, hair);
    g.px(11, 6, hair);
    g.px(4, 7, hair);
    g.px(11, 7, hair);
    g.px(5, 8, hair); // beard corners on the chin row
    g.px(10, 8, hair);
  },
  mp(g, { hair }) {
    // auburn hair, slightly wavy sides
    g.rect(5, 2, 6, 1, hair);
    g.rect(4, 3, 1, 3, hair);
    g.rect(11, 3, 1, 3, hair);
    g.px(4, 6, hair);
    g.px(11, 6, hair);
  },
};

// Round glasses: frames outside each eye + bridge over the nose.
// Eyes (drawn by the base body) remain visible inside the lenses.
function glasses(g) {
  g.px(5, 5, DARK);
  g.px(10, 5, DARK);
  g.px(7, 5, DARK); // bridge
}

const sheet = new Grid(CELL * COLS, CELL * 2);

LEADERS.forEach((leader, i) => {
  const cx = (i % COLS) * CELL;
  const cy = Math.floor(i / COLS) * CELL;
  // Draw into a cell-local grid, then blit it onto the sheet so the
  // feature functions can use cell coordinates.
  const cell = new Grid(CELL, CELL);
  drawBaseBody(cell, leader);
  FEATURES[leader.code](cell, leader);
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
