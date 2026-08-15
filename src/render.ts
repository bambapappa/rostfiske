import { LOGICAL_W, LOGICAL_H, TOWN_COLS, TOWN_ROWS, ROUND_MS, HOOK_WINDOW_MS, PARTIES, CAST_RADIUS, LEADER_W, LEADER_H } from './constants';
import { SPOTS, BUILDINGS } from './world';
import { CATEGORY_COLORS } from './ui';
import type { GameState } from './engine';
import type { SheetMap } from './sprites';
import type { PartyData, Voter } from './types';

// ---------------------------------------------------------------------------
// Town layout — hand-authored 24x13 grid of 16px tiles from Kenney Tiny Town
// (public/sprites/city.png, 12x11 tile sheet, CC0). Tile indices below are
// row-major in that sheet (index = row * 12 + col).
// ---------------------------------------------------------------------------
const TILE_GRASS = 0;        // plain grass
const TILE_GRASS_ALT = 1;    // grass with speckles
const TILE_FLOWERS = 2;      // grass with white/yellow flowers
const TILE_TREE = 5;         // green tree (transparent bg → drawn as prop)
const TILE_TREE_FALL = 3;    // autumn tree (prop)
const TILE_BUSH = 16;        // bush (prop)
const TILE_DIRT = 25;        // plain dirt road
const TILE_PLAZA = 109;      // plain light concrete (torget)
const TILE_WATER = 111;      // water with waves
const GRAY_TOP = [48, 49, 50];   // slate-roof building, roof row (left/mid/right)
const GRAY_BOT = [60, 61, 62];   // slate-roof building, wall row
const RED_TOP = [52, 53, 54];    // red-roof building, roof row
const RED_BOT = [64, 65, 66];    // red-roof building, wall row
const SHEET_COLS = 12;

/** Terrain layer: one opaque tile per cell. */
function buildTerrain(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < TOWN_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < TOWN_COLS; c++) {
      const h = (c * 7 + r * 13) % 11; // fixed, seedless variation
      row.push(h === 0 ? TILE_GRASS_ALT : h === 5 ? TILE_FLOWERS : TILE_GRASS);
    }
    grid.push(row);
  }
  // two road strips: one full-width horizontal, one vertical from the station
  for (let c = 0; c < TOWN_COLS; c++) grid[6]![c] = TILE_DIRT;
  for (let r = 2; r <= 5; r++) grid[r]![12] = TILE_DIRT;
  // torget: concrete "circle" (diamond) around the default fishing spot
  const PLAZA: Array<[number, number]> = [
    [12, 7], [11, 8], [12, 8], [13, 8], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9],
  ];
  for (const [c, r] of PLAZA) grid[r]![c] = TILE_PLAZA;
  // buildings (tile rows top/bottom, anchored at left column); positions mirror
  // the door positions in world.ts (skolan, äldreboendet, stationen, 3 houses)
  const building = (left: number, top: number, t: number[], b: number[]) => {
    for (let i = 0; i < t.length; i++) {
      grid[top]![left + i] = t[i]!;
      grid[top + 1]![left + i] = b[i]!;
    }
  };
  building(2, 1, GRAY_TOP, GRAY_BOT);   // skolan
  building(18, 1, RED_TOP, RED_BOT);    // äldreboendet
  building(11, 0, GRAY_TOP, GRAY_BOT);  // stationen
  building(1, 8, GRAY_TOP.slice(0, 2), GRAY_BOT.slice(0, 2)); // hus 3
  building(7, 8, RED_TOP.slice(0, 2), RED_BOT.slice(0, 2));   // hus 1
  building(16, 8, GRAY_TOP.slice(0, 2), GRAY_BOT.slice(0, 2)); // hus 2
  // dirt thresholds in front of the doors (voters spawn/enter there)
  grid[3]![3] = TILE_DIRT;   // skolan door
  grid[3]![20] = TILE_DIRT;  // äldreboendet door
  grid[10]![2] = TILE_DIRT;  // hus 3 door
  grid[10]![7] = TILE_DIRT;  // hus 1 door
  grid[10]![16] = TILE_DIRT; // hus 2 door
  // small pond, bottom-right
  grid[10]![21] = TILE_WATER; grid[10]![22] = TILE_WATER;
  grid[11]![21] = TILE_WATER; grid[11]![22] = TILE_WATER;
  return grid;
}

const TERRAIN = buildTerrain();

/** Transparent props (trees/bushes) drawn on top of the terrain. */
const PROPS: Array<[col: number, row: number, tile: number]> = [
  // top edge (station occupies cols 11-13)
  [0, 0, TILE_TREE], [2, 0, TILE_TREE], [4, 0, TILE_TREE_FALL], [6, 0, TILE_TREE],
  [8, 0, TILE_TREE], [10, 0, TILE_TREE_FALL], [14, 0, TILE_TREE], [16, 0, TILE_TREE_FALL],
  [18, 0, TILE_TREE], [20, 0, TILE_TREE], [22, 0, TILE_TREE_FALL],
  // bottom edge (skip the pond columns 21-22)
  [0, 12, TILE_TREE], [2, 12, TILE_TREE_FALL], [4, 12, TILE_TREE], [6, 12, TILE_TREE],
  [8, 12, TILE_TREE_FALL], [10, 12, TILE_TREE], [12, 12, TILE_TREE], [14, 12, TILE_TREE_FALL],
  [16, 12, TILE_TREE], [18, 12, TILE_TREE], [20, 12, TILE_TREE_FALL], [23, 12, TILE_TREE],
  // scattered interior greenery (kept clear of doors, roads and the plaza)
  [6, 4, TILE_TREE], [22, 4, TILE_TREE_FALL], [4, 7, TILE_BUSH], [19, 7, TILE_TREE],
  [5, 11, TILE_TREE], [9, 11, TILE_BUSH],
];

function partyColor(parties: PartyData[], code: string): string {
  return parties.find((p) => p.code === code)?.color ?? '#888';
}

/** Source cell in voters.png for a voter's appearance variant.
 *  Adults: cells 0-11 (row 0 bodies 0/1, row 1 body 2). Minors: cells 12-15. */
function voterCell(v: Voter): number {
  return v.age === 'minor' ? 12 + (v.variant % 4) : Math.max(0, Math.min(11, v.variant));
}

export function drawScene(ctx: CanvasRenderingContext2D, state: GameState, sprites: SheetMap, parties: PartyData[], nowMs: number): void {
  ctx.imageSmoothingEnabled = false; // pixelperfect

  // --- city (terrain + props) ---
  const city = sprites.get('city');
  if (city) {
    for (let r = 0; r < TOWN_ROWS; r++) {
      for (let c = 0; c < TOWN_COLS; c++) {
        const idx = TERRAIN[r]![c]!;
        ctx.drawImage(city, (idx % SHEET_COLS) * 16, Math.floor(idx / SHEET_COLS) * 16, 16, 16, c * 16, r * 16, 16, 16);
      }
    }
    for (const [c, r, idx] of PROPS) {
      ctx.drawImage(city, (idx % SHEET_COLS) * 16, Math.floor(idx / SHEET_COLS) * 16, 16, 16, c * 16, r * 16, 16, 16);
    }
  } else {
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }

  // --- building labels (centered below each door) ---
  ctx.font = '6px monospace';
  ctx.textAlign = 'left';
  for (const b of BUILDINGS) {
    const metrics = ctx.measureText(b.name);
    const labelX = b.doorX - metrics.width / 2;
    const labelY = b.doorY + 8;
    // subtle dark backing for legibility
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(labelX - 1, labelY - 6, metrics.width + 2, 8);
    ctx.fillStyle = '#fff';
    ctx.fillText(b.name, labelX, labelY);
  }

  // --- torget label (at the plaza) ---
  const torget = SPOTS.find((s) => s.id === 'torget')!;
  ctx.fillStyle = '#fff';
  ctx.fillText('Torget', torget.x - 14, torget.y - 14);

  // --- v1.2 cast radius ring (dashed, party color at 25% alpha) ---
  const pcol = partyColor(parties, state.party);
  const ringCenterX = state.spotX;
  const ringCenterY = state.spotY - 8;
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = pcol;
  ctx.globalAlpha = 0.25;
  ctx.arc(ringCenterX, ringCenterY, CAST_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // --- fishing line + lapp (cast note) ---
  if (state.lapp) {
    const { x, y } = state.lapp;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(state.spotX, state.spotY - 10);
    ctx.lineTo(x, y - 2);
    ctx.stroke();
    ctx.fillStyle = '#fff'; // small white paper
    ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 5, 4);
  }

  // --- voters (inside a building = invisible) ---
  const voterImg = sprites.get('voters');
  for (const v of state.voters) {
    if (v.state === 'inside') continue;
    const minor = v.age === 'minor';
    if (voterImg) {
      const cell = voterCell(v);
      const sx = (cell % 8) * 16, sy = Math.floor(cell / 8) * 16;
      // feet at the voter position: adults' shoes at cell y14, minors' at y13
      ctx.drawImage(voterImg, sx, sy, 16, 16, Math.round(v.x) - 8, Math.round(v.y) - (minor ? 13 : 14), 16, 16);
    } else {
      ctx.fillStyle = CATEGORY_COLORS[v.category] ?? '#fff';
      ctx.fillRect(Math.round(v.x) - 3, Math.round(v.y) - 3, minor ? 5 : 7, minor ? 5 : 7);
    }
  }

  // --- bite indicator: pulsing yellow ! + shrinking timing bar ---
  const biter = state.voters.find((v) => v.id === state.bitingVoterId)
    ?? state.voters.find((v) => v.state === 'biting');
  if (biter && biter.state === 'biting') {
    const bx = Math.round(biter.x), by = Math.round(biter.y);
    const puff = Math.round(Math.abs(Math.sin(nowMs / 90)) * 2); // pulse 0..2 px
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(bx - 4 - Math.floor(puff / 2), by - 23 - puff, 9 + puff, 9 + puff);
    ctx.fillStyle = '#1a1c2c';
    ctx.font = '8px monospace';
    ctx.fillText('!', bx - 1, by - 16);
    // remaining hook window as a 16px-wide bar beneath the !
    const elapsed = ROUND_MS - state.timeLeftMs;
    const remaining = (biter.biteDeadline ?? elapsed) - elapsed;
    const frac = Math.max(0, Math.min(1, remaining / HOOK_WINDOW_MS));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 8, by - 13, 16, 2); // track
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(bx - 8, by - 13, Math.round(frac * 16), 2);
  }

  // --- politician (16x24 caricature cell per party index, 4x2 sheet;
  //     feet on the cell's bottom row → anchor so shoes land at spotY) ---
  const pol = sprites.get('politicians');
  const pIdx = PARTIES.indexOf(state.party);
  if (pol && pIdx >= 0) {
    ctx.drawImage(pol, (pIdx % 4) * LEADER_W, Math.floor(pIdx / 4) * LEADER_H, LEADER_W, LEADER_H, Math.round(state.spotX) - LEADER_W / 2, Math.round(state.spotY) - (LEADER_H - 1), LEADER_W, LEADER_H);
  } else {
    ctx.fillStyle = pcol;
    ctx.fillRect(state.spotX - 3, state.spotY - 12, 6, 12);
  }

  // --- HUD (v1.2: bait line moved to the #tackle DOM panel; sourceDomain
  //     shows on the panel's active slot, full source on each catch splash) ---
  ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`Röster: ${state.votes}`, 4, 10);
  ctx.fillText(`Släppta: ${state.released}`, 4, 20);
  ctx.fillText(`Tid: ${Math.ceil(state.timeLeftMs / 1000)}s`, 4, 30);
}
