// Generates public/sprites/politicians.png: 8 caricatures of the REAL 2026
// Swedish party leaders, 16x24 each on a 64x48 sheet (4 cols x 2 rows).
// Cell order matches PARTIES order:
//   row 0: s, m, sd, c
//   row 1: v, kd, l, mp
//
// The caricatures are paraphrases — simplified, neutral pixel portraits with
// a few recognizable descriptors (hair silhouette, hair color, glasses,
// stubble, skin tone). NOT exact portraits, and never mocking: every leader
// gets the same dignified base body (suit in party color, white shirt, tie
// or plain collar) and the same level of detail. Gender and skin tone are
// factual representation, not exaggeration.
//
// Leaders (search-verified 2026-08-15, see spec):
//   s  Magdalena Andersson   kvinna, mörkbrunt hår i knut
//   m  Ulf Kristersson       man, glasögon, grånat hår, sidbena
//   sd Jimmie Åkesson        man, blont välkammat, kostym
//   c  Elisabeth Thand Ringqvist kvinna, ljust/blond hår
//   v  Nooshi Dadgostar      kvinna, mörkt hår, brun hy
//   kd Ebba Busch            kvinna, blont page
//   l  Johan Pehrson         man, glasögon, grånat/hårbotten, skäggstubb
//   mp Amanda Lind           kvinna, rödbrunt hår (MP har två språkrör)
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

const CELL_W = 16;
const CELL_H = 24;
const COLS = 4; // cells per row

const DARK = '#1a1a1a';
const SHOE = '#26232e';
const WHITE = '#f2f2f2';
const STUBBLE = '#8a7466';

// Party order = sheet order. All descriptors are data so the sheet can be
// audited against the spec table without reading drawing code.
const LEADERS = [
  {
    code: 's', name: 'Magdalena Andersson', gender: 'kvinna',
    suit: '#E8112d', skin: '#ecc19c', hair: '#3a2418',
    hairStyle: 'bun',
  },
  {
    code: 'm', name: 'Ulf Kristersson', gender: 'man',
    suit: '#1B7FC1', skin: '#ecc19c', hair: '#8a7666',
    hairStyle: 'side-part', glasses: true,
  },
  {
    code: 'sd', name: 'Jimmie Åkesson', gender: 'man',
    suit: '#4E9E2C', skin: '#e8b08a', hair: '#e8cf7a',
    hairStyle: 'neat-combed',
  },
  {
    code: 'c', name: 'Elisabeth Thand Ringqvist', gender: 'kvinna',
    suit: '#00965E', skin: '#ecc19c', hair: '#e6cf8e',
    hairStyle: 'shoulder-length',
  },
  {
    code: 'v', name: 'Nooshi Dadgostar', gender: 'kvinna',
    suit: '#DA291C', skin: '#b07a52', hair: '#1f1410',
    hairStyle: 'long',
  },
  {
    code: 'kd', name: 'Ebba Busch', gender: 'kvinna',
    suit: '#231977', skin: '#ecc19c', hair: '#ecd27a',
    hairStyle: 'page',
  },
  {
    code: 'l', name: 'Johan Pehrson', gender: 'man',
    suit: '#006AB3', skin: '#e8b08a', hair: '#9a8f82',
    hairStyle: 'receding', glasses: true, stubble: true,
  },
  {
    code: 'mp', name: 'Amanda Lind', gender: 'kvinna',
    suit: '#83CF39', skin: '#ecc19c', hair: '#a14e26',
    hairStyle: 'wavy-long',
  },
];

// Shared base body. Same dignified construction for everyone (neutrality):
// head x5..10 y4..10, neck y11, suit torso y12..17, arms, white shirt
// (men get a tie, women a plain collar), legs y18..21, shoes y22..23.
// Feet land on the cell's bottom row (y23) so render can anchor at spotY.
function drawBaseBody(g, { suit, skin, gender }) {
  // head + neck
  g.rect(5, 4, 6, 7, skin);
  g.rect(7, 11, 2, 1, skin);
  // eyes
  g.px(6, 7, DARK);
  g.px(9, 7, DARK);
  // suit: shoulders (wider row), torso, arms
  g.rect(3, 12, 10, 1, suit);
  g.rect(4, 13, 8, 5, suit);
  g.rect(3, 13, 1, 4, suit);
  g.rect(12, 13, 1, 4, suit);
  // shirt collar / tie
  g.rect(7, 12, 2, 5, WHITE);
  if (gender === 'man') {
    g.px(7, 13, DARK);
    g.px(8, 13, DARK);
    g.px(7, 14, DARK);
    g.px(8, 14, DARK);
    g.px(7, 15, DARK);
  }
  // hands, legs, shoes
  g.px(3, 17, skin);
  g.px(12, 17, skin);
  g.rect(5, 18, 2, 4, DARK);
  g.rect(9, 18, 2, 4, DARK);
  g.rect(4, 22, 3, 2, SHOE);
  g.rect(9, 22, 3, 2, SHOE);
}

// Hair silhouettes — each leader gets a distinct outline so the 8 cells read
// differently at a glance. All drawn after (over) the base body.
const HAIR = {
  // mörkbrunt hår samlat i knut: sleek cap + bun bump on top of the head
  bun(g, { hair }) {
    g.rect(6, 1, 4, 1, hair); // knuten
    g.rect(5, 2, 6, 2, hair); // sleek cap
    g.px(4, 4, hair);         // pulled-back sides
    g.px(11, 4, hair);
  },
  // grånat/ljusbrunt hår med sidbena: asymmetrisk hårfäste, korta tinningar
  sidePart(g, { hair }) {
    g.rect(5, 2, 6, 2, hair);
    g.rect(5, 3, 2, 1, hair); // benan: mer hår på vänster sida
    g.px(4, 4, hair);
    g.px(11, 4, hair);
    g.px(4, 5, hair);
  },
  // blont välkammat: rak hårlinje + prydliga sideburns
  neatCombed(g, { hair }) {
    g.rect(5, 2, 6, 2, hair);
    g.rect(4, 3, 2, 1, hair);
    g.rect(10, 3, 2, 1, hair);
    g.rect(4, 4, 1, 2, hair); // sideburns
    g.rect(11, 4, 1, 2, hair);
  },
  // ljust/blondt axellångt hår
  shoulderLength(g, { hair }) {
    g.rect(5, 2, 6, 2, hair);
    g.rect(4, 3, 1, 9, hair); // ner till axlarna (y11)
    g.rect(11, 3, 1, 9, hair);
  },
  // mörkt, längst av alla: förbi axlarna (y14)
  long(g, { hair }) {
    g.rect(5, 2, 6, 2, hair);
    g.rect(4, 3, 1, 12, hair);
    g.rect(11, 3, 1, 12, hair);
  },
  // blont page: rak lugg + slutna sidor ner till käken
  page(g, { hair }) {
    g.rect(5, 2, 6, 2, hair);
    g.rect(5, 4, 6, 1, hair); // lugg over the forehead
    g.rect(4, 3, 1, 8, hair); // sidor till käklinjen (y10)
    g.rect(11, 3, 1, 8, hair);
  },
  // grånat, hög hårfäste/återgående tinningar
  receding(g, { hair }) {
    g.rect(5, 2, 6, 1, hair); // tunn kalott
    g.px(4, 3, hair);         // tinningar
    g.px(11, 3, hair);
  },
  // rödbrunt, axellångt med utåtgående våg
  wavyLong(g, { hair }) {
    g.rect(5, 2, 6, 2, hair);
    g.rect(4, 3, 1, 11, hair); // ner till y13
    g.rect(11, 3, 1, 11, hair);
    g.px(3, 11, hair);         // vågen svänger ut
    g.px(3, 12, hair);
    g.px(12, 11, hair);
    g.px(12, 12, hair);
  },
};

const HAIR_FN = {
  'bun': HAIR.bun,
  'side-part': HAIR.sidePart,
  'neat-combed': HAIR.neatCombed,
  'shoulder-length': HAIR.shoulderLength,
  'long': HAIR.long,
  'page': HAIR.page,
  'receding': HAIR.receding,
  'wavy-long': HAIR.wavyLong,
};

// Glasses: frame pixels outside each eye + a 2px bridge between them.
// Eyes (from the base body) stay visible inside the lenses.
function glasses(g) {
  g.px(5, 7, DARK);
  g.px(7, 7, DARK);
  g.px(8, 7, DARK);
  g.px(10, 7, DARK);
}

// Skäggstubb: a subdued stubble band along the jaw/chin.
function stubble(g) {
  g.rect(5, 10, 6, 1, STUBBLE);
  g.px(4, 9, STUBBLE);
  g.px(11, 9, STUBBLE);
}

const sheet = new Grid(CELL_W * COLS, CELL_H * 2);

LEADERS.forEach((leader, i) => {
  const cx = (i % COLS) * CELL_W;
  const cy = Math.floor(i / COLS) * CELL_H;
  // Draw into a cell-local grid, then blit it onto the sheet so the
  // feature functions can use cell coordinates.
  const cell = new Grid(CELL_W, CELL_H);
  drawBaseBody(cell, leader);
  HAIR_FN[leader.hairStyle](cell, leader);
  if (leader.glasses) glasses(cell);
  if (leader.stubble) stubble(cell);
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) {
      const idx = (y * CELL_W + x) * 4;
      if (cell.data[idx + 3] !== 0) {
        sheet.px(cx + x, cy + y, [
          cell.data[idx], cell.data[idx + 1], cell.data[idx + 2], cell.data[idx + 3],
        ]);
      }
    }
  }
});

writePng(OUT, sheet);
