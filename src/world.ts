import { LOGICAL_W, LOGICAL_H, type Category } from './constants';
import type { FishingSpot, SpotId, Building, Rect } from './types';

export const SPOTS: FishingSpot[] = [
  { id: 'torget',       name: 'Torget',        x: 256, y: 160, bias: {} },
  { id: 'skolan',       name: 'Skolan',        x: 80,  y: 76,  bias: { utbildning: 6 } },
  { id: 'aldreboendet', name: 'Äldreboendet',  x: 430, y: 76,  bias: { välfärd: 6 } },
  { id: 'stationen',    name: 'Stationen',     x: 256, y: 56,  bias: { infrastruktur: 6 } },
  { id: 'bageriet',     name: 'Bageriet',      x: 140, y: 238, bias: {} },
  { id: 'biblioteket',  name: 'Biblioteket',   x: 256, y: 248, bias: {} },
  { id: 'apoteket',     name: 'Apoteket',      x: 392, y: 238, bias: {} },
];

export function spotById(id: SpotId): FishingSpot {
  const s = SPOTS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown spot ${id}`);
  return s;
}

/** Click-to-move radius (px) around a spot's anchor point (v1.2.2). */
export const SPOT_CLICK_R = 24;

/** Anchor point of a spot: the linked building's door, or the spot's own
 *  center for spots without a building (torget). Pure. */
export function spotAnchor(s: FishingSpot): { x: number; y: number } {
  const b = BUILDINGS.find((x) => x.id === s.id);
  return b ? { x: b.doorX, y: b.doorY } : { x: s.x, y: s.y };
}

/** Which fishing spot a click on (x, y) selects, or null when the click is
 *  not within SPOT_CLICK_R of any spot's anchor. Pure. */
export function spotAt(x: number, y: number, r: number = SPOT_CLICK_R): SpotId | null {
  for (const s of SPOTS) {
    const a = spotAnchor(s);
    if (Math.hypot(x - a.x, y - a.y) <= r) return s.id;
  }
  return null;
}

export const BUILDINGS: Building[] = [
  { id: 'skolan',       name: 'Skolan',       x: 80,  y: 60,  doorX: 80,  doorY: 76,  bias: { utbildning: 6 } },
  { id: 'aldreboendet', name: 'Äldreboendet', x: 430, y: 60,  doorX: 430, doorY: 76,  bias: { välfärd: 6 } },
  { id: 'stationen',    name: 'Stationen',    x: 256, y: 40,  doorX: 256, doorY: 56,  bias: { infrastruktur: 6 } },
  { id: 'bageriet',     name: 'Bageriet',     x: 140, y: 222, doorX: 140, doorY: 238, bias: {} },
  { id: 'biblioteket',  name: 'Biblioteket',  x: 256, y: 232, doorX: 256, doorY: 248, bias: {} },
  { id: 'apoteket',     name: 'Apoteket',     x: 392, y: 222, doorX: 392, doorY: 238, bias: {} },
];

export function buildingById(id: string): Building {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown building ${id}`);
  return b;
}

/** Footprint size of a building, logical px (v1.2). */
export const BUILDING_W = 48;
export const BUILDING_H = 32;
/** Radius (px) around a door where the footprint does not block (the door zone). */
export const DOOR_ZONE_R = 10;

/** Footprint rect of one building: 48×32 centered on its (x,y). The door is
 *  NOT carved out of the rect — the door exception lives in isDoorZone and is
 *  applied by the move/cast checks. Pure. */
export function buildingRect(b: Building): Rect {
  return { x: b.x - BUILDING_W / 2, y: b.y - BUILDING_H / 2, w: BUILDING_W, h: BUILDING_H };
}

/** Footprint rects of all buildings. Pure. */
export function buildingRects(): Rect[] {
  return BUILDINGS.map(buildingRect);
}

/** Strict interior test: rect edges count as outside, so a point pushed to an
 *  edge (see pushOut) is no longer inside. Pure. */
export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
}

/** True when (x,y) lies within r px of building b's door — the door zone where
 *  the footprint does not block movement. Pure. */
export function isDoorZone(x: number, y: number, b: Building, r: number = DOOR_ZONE_R): boolean {
  return Math.hypot(x - b.doorX, y - b.doorY) <= r;
}

/** Push an interior point out to the nearest rect edge (v1.2 cast clamp).
 *  Points outside every rect are returned unchanged. Pure. */
export function pushOut(x: number, y: number, rects: Rect[]): { x: number; y: number } {
  for (const r of rects) {
    if (!pointInRect(x, y, r)) continue;
    const dLeft = x - r.x;
    const dRight = r.x + r.w - x;
    const dTop = y - r.y;
    const dBottom = r.y + r.h - y;
    const min = Math.min(dLeft, dRight, dTop, dBottom);
    if (min === dLeft) return { x: r.x, y };
    if (min === dRight) return { x: r.x + r.w, y };
    if (min === dTop) return { x, y: r.y };
    return { x, y: r.y + r.h };
  }
  return { x, y };
}
