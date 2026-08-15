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
// Leaders (v1.2.1 corrections per the user's party-source links):
//   s  Magdalena Andersson   kvinna, mörkbrunt hår i knut
//   m  Ulf Kristersson       man, glasögon, grånat hår, sidbena
//   sd Jimmie Åkesson        man, mörkhårigt välkammat, kostym
//   c  Elisabeth Thand Ringqvist kvinna, ljust/blond hår
//   v  Nooshi Dadgostar      kvinna, mörkt hår, ljusbrun hy
//   kd Ebba Busch            kvinna, blont page
//   l  Simona Mohamsson      kvinna, ljusbrun hy, mörkt hår
//   mp Amanda Lind + Daniel Helldén — MP:s två språkrör, båda ritade som
//      två mindre figurer (~7 px breda) sida vid sida i MP-cellen.
//      Faktisk representation av partiledningen, inte en fördel: samma
//      världiga grundkropp och detaljnivå som alla andra celler.
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
    suit: '#4E9E2C', skin: '#e8b08a', hair: '#2b1c10',
    hairStyle: 'neat-combed',
  },
  {
    code: 'c', name: 'Elisabeth Thand Ringqvist', gender: 'kvinna',
    suit: '#00965E', skin: '#ecc19c', hair: '#e6cf8e',
    hairStyle: 'shoulder-length',
  },
  {
    code: 'v', name: 'Nooshi Dadgostar', gender: 'kvinna',
    suit: '#DA291C', skin: '#c68e63', hair: '#1f1410',
    hairStyle: 'long',
  },
  {
    code: 'kd', name: 'Ebba Busch', gender: 'kvinna',
    suit: '#231977', skin: '#ecc19c', hair: '#ecd27a',
    hairStyle: 'page',
  },
  {
    code: 'l', name: 'Simona Mohamsson', gender: 'kvinna',
    suit: '#006AB3', skin: '#c68e63', hair: '#241811',
    hairStyle: 'wavy-long',
  },
  {
    // MP has two språkrör — the cell shows BOTH as two smaller figures side
    // by side (~7 px wide each). Factual representation of the party's
    // leadership, same dignified style as every other cell.
    code: 'mp', name: 'Amanda Lind + Daniel Helldén', duo: true,
    suit: '#83CF39',
    figures: [
      {
        name: 'Amanda Lind', gender: 'kvinna',
        skin: '#ecc19c', hair: '#a14e26', hairStyle: 'mini-long',
      },
      {
        name: 'Daniel Helldén', gender: 'man',
        skin: '#ecc19c', hair: '#9a938c', hairStyle: 'mini-short', stubble: true,
      },
    ],
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
  // välkammat (mörkt för Åkesson): rak hårlinje + prydliga sideburns
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
  // axellångt med utåtgående våg (mörkt för Mohamsson)
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

// --- Mini figures (MP: both språkrör in one cell) ---
// Two ~7 px wide figures side by side at ox=0 and ox=9, same dignified
// construction as the base body, scaled down: head x ox+1..ox+5 y7..11,
// neck y12, suit torso y13..17, shirt/tie, legs y18..21, shoes y22..23
// (feet on the bottom row, like the full-size figures).
function drawMiniBody(g, ox, { suit, skin, gender }) {
  // head + neck
  g.rect(ox + 1, 7, 5, 5, skin);
  g.px(ox + 3, 12, skin);
  // eyes
  g.px(ox + 2, 9, DARK);
  g.px(ox + 4, 9, DARK);
  // suit: shoulders, torso, arms
  g.rect(ox, 13, 7, 1, suit);
  g.rect(ox + 1, 14, 5, 4, suit);
  g.rect(ox, 14, 1, 4, suit);
  g.rect(ox + 6, 14, 1, 4, suit);
  // shirt collar / tie
  g.px(ox + 3, 13, WHITE);
  if (gender === 'man') {
    g.px(ox + 3, 14, DARK);
    g.px(ox + 3, 15, DARK);
  }
  // hands, legs, shoes
  g.px(ox, 17, skin);
  g.px(ox + 6, 17, skin);
  g.rect(ox + 1, 18, 2, 4, DARK);
  g.rect(ox + 4, 18, 2, 4, DARK);
  g.rect(ox + 1, 22, 2, 2, SHOE);
  g.rect(ox + 4, 22, 2, 2, SHOE);
}

const MINI_HAIR = {
  // rödbrunt, axellångt: kalott + sidor ner mot axlarna
  'mini-long'(g, ox, { hair }) {
    g.rect(ox + 1, 5, 5, 2, hair);
    g.rect(ox, 7, 1, 4, hair);
    g.rect(ox + 6, 7, 1, 4, hair);
  },
  // grått, kort kammat: kalott ovan pannan
  'mini-short'(g, ox, { hair }) {
    g.rect(ox + 1, 5, 5, 2, hair);
    g.px(ox, 7, hair);
    g.px(ox + 6, 7, hair);
  },
};

// Skäggstubb (mini): subdued band along the mini figure's jaw.
function miniStubble(g, ox) {
  g.rect(ox + 1, 11, 5, 1, STUBBLE);
}

const sheet = new Grid(CELL_W * COLS, CELL_H * 2);

LEADERS.forEach((leader, i) => {
  const cx = (i % COLS) * CELL_W;
  const cy = Math.floor(i / COLS) * CELL_H;
  // Draw into a cell-local grid, then blit it onto the sheet so the
  // feature functions can use cell coordinates.
  const cell = new Grid(CELL_W, CELL_H);
  if (leader.duo) {
    leader.figures.forEach((fig, fi) => {
      const ox = fi * 9; // figures at x0..6 and x9..15
      drawMiniBody(cell, ox, { suit: leader.suit, ...fig });
      MINI_HAIR[fig.hairStyle](cell, ox, fig);
      if (fig.stubble) miniStubble(cell, ox);
    });
  } else {
    drawBaseBody(cell, leader);
    HAIR_FN[leader.hairStyle](cell, leader);
    if (leader.glasses) glasses(cell);
    if (leader.stubble) stubble(cell);
  }
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
