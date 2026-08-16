import { LOGICAL_W, LOGICAL_H, TOWN_COLS, TOWN_ROWS, ROUND_MS, HOOK_WINDOW_MS, PARTIES, CAST_RADIUS, LEADER_W, LEADER_H } from './constants';
import { SPOTS, BUILDINGS } from './world';
import { CATEGORY_COLORS, FALLBACK_COLOR } from './ui';
import type { GameState } from './engine';
import type { SheetMap } from './sprites';
import type { PartyData, Voter } from './types';

// ---------------------------------------------------------------------------
// Town layout — hand-authored 32x18 grid of 16px tiles from Kenney Tiny Town
// (public/sprites/city.png, 12x11 tile sheet, CC0). Tile indices below are
// row-major in that sheet (index = row * 12 + col).
// ---------------------------------------------------------------------------
const TILE_GRASS = 0;        // plain grass
const TILE_GRASS_ALT = 1;    // grass with speckles
const TILE_FLOWERS = 2;      // grass with white/yellow flowers
// 16x16 self-contained single-tile tree props
const TILE_TREE_ROUND = 5;      // round green canopy
const TILE_TREE_FALL_MED = 27;  // autumn pine with trunk (16x16)
const TILE_TREE_GREEN_MED = 28; // green pine with trunk (16x16)

// 16x32 two-tile pine trees (top crown + bottom base/trunk)
const PINE_GREEN_TOP = 4;
const PINE_GREEN_BOT = 16;
const PINE_FALL_TOP = 3;
const PINE_FALL_BOT = 15;

const TILE_DIRT = 25;        // plain dirt road
const TILE_PLAZA = 109;      // plain light concrete (torget)
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
  // road network: central vertical avenue, north & south horizontal connectors
  for (let c = 4; c <= 27; c++) grid[5]![c] = TILE_DIRT;
  for (let c = 7; c <= 25; c++) grid[14]![c] = TILE_DIRT;
  for (let r = 3; r <= 15; r++) grid[r]![16] = TILE_DIRT;
  // torget: concrete plaza around the default fishing spot (col 16, row 10)
  const PLAZA: Array<[number, number]> = [
    [16, 8],
    [15, 9], [16, 9], [17, 9],
    [14, 10], [15, 10], [16, 10], [17, 10], [18, 10],
    [15, 11], [16, 11], [17, 11],
    [16, 12],
  ];
  for (const [c, r] of PLAZA) grid[r]![c] = TILE_PLAZA;
  // buildings (tile rows top/bottom, anchored at left column); positions mirror
  // the door positions in world.ts (skolan, äldreboendet, stationen, bageriet, biblioteket, apoteket)
  const building = (left: number, top: number, t: number[], b: number[]) => {
    for (let i = 0; i < t.length; i++) {
      grid[top]![left + i] = t[i]!;
      grid[top + 1]![left + i] = b[i]!;
    }
  };
  building(4, 2, GRAY_TOP, GRAY_BOT);   // skolan
  building(15, 1, GRAY_TOP, GRAY_BOT);  // stationen
  building(25, 2, RED_TOP, RED_BOT);    // äldreboendet
  building(7, 12, RED_TOP, RED_BOT);    // bageriet
  building(15, 13, GRAY_TOP, GRAY_BOT); // biblioteket
  building(23, 12, RED_TOP, RED_BOT);   // apoteket
  // dirt thresholds in front of the doors (voters spawn/enter there)
  grid[4]![5] = TILE_DIRT;   // skolan door
  grid[3]![16] = TILE_DIRT;  // stationen door
  grid[4]![26] = TILE_DIRT;  // äldreboendet door
  grid[14]![8] = TILE_DIRT;  // bageriet door
  grid[15]![16] = TILE_DIRT; // biblioteket door
  grid[14]![24] = TILE_DIRT; // apoteket door
  return grid;
}

const TERRAIN = buildTerrain();

/** Transparent props (complete trees/bushes) drawn on top of the terrain.
 *  All 2-tile trees are always paired with both top crown + bottom trunk so no half trees appear. */
function buildProps(): Array<[col: number, row: number, tile: number]> {
  const props: Array<[number, number, number]> = [];

  const addTree2 = (col: number, row: number, kind: 'green' | 'fall') => {
    if (row < 0 || row + 1 >= TOWN_ROWS || col < 0 || col >= TOWN_COLS) return;
    const topTile = kind === 'green' ? PINE_GREEN_TOP : PINE_FALL_TOP;
    const botTile = kind === 'green' ? PINE_GREEN_BOT : PINE_FALL_BOT;
    props.push([col, row, topTile], [col, row + 1, botTile]);
  };

  const addTree1 = (col: number, row: number, tile: number) => {
    if (row < 0 || row >= TOWN_ROWS || col < 0 || col >= TOWN_COLS) return;
    props.push([col, row, tile]);
  };

  // Top edge row of complete 2-tile trees (rows 0..1, clear of Stationen at cols 14..18)
  const topCols: Array<[number, 'green' | 'fall']> = [
    [0, 'green'], [2, 'fall'], [4, 'green'], [6, 'fall'],
    [8, 'green'], [10, 'fall'], [12, 'green'],
    [19, 'fall'], [21, 'green'], [23, 'fall'],
    [25, 'green'], [27, 'fall'], [29, 'green'], [31, 'fall'],
  ];
  for (const [c, k] of topCols) {
    addTree2(c, 0, k);
  }

  // Bottom edge row of complete 2-tile trees (rows 16..17, clear of building doors)
  const botCols: Array<[number, 'green' | 'fall']> = [
    [0, 'green'], [2, 'fall'], [4, 'green'],
    [11, 'fall'], [13, 'green'],
    [18, 'fall'], [20, 'green'],
    [27, 'fall'], [29, 'green'], [31, 'fall'],
  ];
  for (const [c, k] of botCols) {
    addTree2(c, 16, k);
  }

  // Left & Right boundary complete 2-tile trees
  addTree2(0, 3, 'fall');
  addTree2(0, 6, 'green');
  addTree2(0, 9, 'fall');
  addTree2(0, 12, 'green');

  addTree2(31, 3, 'green');
  addTree2(31, 6, 'fall');
  addTree2(31, 9, 'green');
  addTree2(31, 12, 'fall');

  // Interior park greenery: self-contained 16x16 trees clear of roads, doors & torget
  addTree1(1, 8, TILE_TREE_ROUND);
  addTree1(2, 10, TILE_TREE_GREEN_MED);
  addTree1(10, 8, TILE_TREE_FALL_MED);
  addTree1(11, 11, TILE_TREE_ROUND);

  addTree1(21, 8, TILE_TREE_ROUND);
  addTree1(22, 10, TILE_TREE_GREEN_MED);
  addTree1(29, 8, TILE_TREE_FALL_MED);
  addTree1(30, 10, TILE_TREE_ROUND);

  addTree1(5, 16, TILE_TREE_ROUND);
  addTree1(12, 16, TILE_TREE_GREEN_MED);
  addTree1(20, 16, TILE_TREE_FALL_MED);
  addTree1(26, 16, TILE_TREE_ROUND);

  return props;
}

const PROPS: Array<[col: number, row: number, tile: number]> = buildProps();


function partyColor(parties: PartyData[], code: string): string {
  return parties.find((p) => p.code === code)?.color ?? FALLBACK_COLOR;
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
  // Centered at (spotX, spotY): the exact point the engine's castLapp
  // measures CAST_RADIUS from (the politician's feet anchor).
  const pcol = partyColor(parties, state.party);
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = pcol;
  ctx.globalAlpha = 0.25;
  ctx.arc(state.spotX, state.spotY, CAST_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // --- fishing line + lapp (cast note) ---
  if (state.lapp) {
    const { x, y, startX, startY, flightProgress } = state.lapp;
    if (flightProgress !== undefined && flightProgress < 1) {
      const p = Math.max(0, Math.min(1, flightProgress));
      const sx = startX ?? state.spotX;
      const sy = startY ?? (state.spotY - 10);
      const lx = sx + (x - sx) * p;
      const linearY = sy + (y - sy) * p;
      const arcHeight = Math.sin(p * Math.PI) * 28;
      const ly = linearY - arcHeight;

      // curving cast line
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(state.spotX, state.spotY - 10);
      ctx.quadraticCurveTo((sx + x) / 2, Math.min(sy, y) - 30, lx, ly);
      ctx.stroke();

      // ground shadow of flying note
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(Math.round(lx) - 2, Math.round(linearY) - 1, 5, 2);

      // flying paper note
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(lx) - 2, Math.round(ly) - 3, 5, 4);
      ctx.restore();
    } else {
      // landed note
      const activeTrend = state.activeTrend ?? state.trend;
      const lappBait = state.tackle.find((b) => b.id === state.lapp!.baitId);
      const isTrendMatch = activeTrend && lappBait && lappBait.category === activeTrend.category;

      ctx.strokeStyle = isTrendMatch ? (activeTrend.color || '#ffe66d') : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(state.spotX, state.spotY - 10);
      ctx.lineTo(x, y - 2);
      ctx.stroke();

      if (isTrendMatch) {
        // subtle pulse aura around trending note
        const pulse = Math.sin(nowMs / 120) * 1.5 + 4;
        ctx.save();
        ctx.strokeStyle = activeTrend.color || '#ffe66d';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + 0.5, y - 1, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = '#fff'; // small white paper
      ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 5, 4);
    }
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
      ctx.fillStyle = CATEGORY_COLORS[v.category] ?? FALLBACK_COLOR;
      ctx.fillRect(Math.round(v.x) - 3, Math.round(v.y) - 3, minor ? 5 : 7, minor ? 5 : 7);
    }

    // --- voter awareness cue (when heading to lapp) ---
    if (v.state === 'toLapp') {
      const vx = Math.round(v.x);
      const vy = Math.round(v.y) - (minor ? 16 : 18);
      const bob = Math.round(Math.sin((nowMs + v.id * 100) / 120) * 1.5);
      ctx.save();
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(vx, vy + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1c2c';
      ctx.font = 'bold 5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', vx, vy + bob + 2);
      ctx.restore();
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

  // --- particles (landing ripples & floating feedback text) ---
  if (state.particles && state.particles.length > 0) {
    for (const p of state.particles) {
      const lifeRatio = Math.max(0, Math.min(1, p.lifeMs / p.maxLifeMs));
      const alpha = Math.max(0, 1 - lifeRatio);

      if (p.kind === 'ripple') {
        const startR = p.radius ?? 2;
        const maxR = p.maxRadius ?? 18;
        const r = startR + (maxR - startR) * lifeRatio;
        ctx.save();
        ctx.strokeStyle = p.color || 'rgba(255, 255, 255, 0.7)';
        ctx.globalAlpha = alpha * 0.8;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === 'float_text') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillText(p.text, Math.round(p.x) + 1, Math.round(p.y) + 1);
        ctx.fillStyle = p.color || '#fff';
        ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
        ctx.restore();
      }
    }
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

  // --- active trend breaking news banner (slides down from top of canvas) ---
  const activeTrend = state.activeTrend ?? state.trend;
  if (activeTrend) {
    const totalDuration = state.roundDurationMs ?? ROUND_MS;
    const elapsed = totalDuration - state.timeLeftMs;
    const trendAge = Math.max(0, elapsed - activeTrend.startsAtMs);
    const trendRemaining = Math.max(0, activeTrend.expiresAtMs - elapsed);

    // Slide animation: 350ms slide-in, 350ms slide-out
    const slideIn = Math.min(1, trendAge / 350);
    const slideOut = Math.min(1, trendRemaining / 350);
    const slide = Math.min(slideIn, slideOut);
    const bannerH = 16;
    const bannerY = -bannerH + bannerH * slide;

    const accentColor = activeTrend.color || CATEGORY_COLORS[activeTrend.category] || '#ffe66d';

    ctx.save();
    // Banner dark slate bar
    ctx.fillStyle = 'rgba(12, 14, 26, 0.94)';
    ctx.fillRect(0, bannerY, LOGICAL_W, bannerH);

    // Bottom accent border (2px)
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, bannerY + bannerH - 2, LOGICAL_W, 2);

    // Badge: Category / EXTRA pill
    ctx.fillStyle = accentColor;
    ctx.fillRect(6, bannerY + 2, 42, bannerH - 6);

    ctx.fillStyle = '#10121f';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXTRA', 27, bannerY + 9);

    // Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(activeTrend.headline, 54, bannerY + 9);

    // Mini duration timer / countdown bar at right edge
    const totalTrendTime = activeTrend.expiresAtMs - activeTrend.startsAtMs;
    if (totalTrendTime > 0) {
      const frac = Math.max(0, Math.min(1, trendRemaining / totalTrendTime));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(LOGICAL_W - 50, bannerY + 6, 44, 3);
      ctx.fillStyle = accentColor;
      ctx.fillRect(LOGICAL_W - 50, bannerY + 6, Math.round(44 * frac), 3);
    }
    ctx.restore();
  }
}
