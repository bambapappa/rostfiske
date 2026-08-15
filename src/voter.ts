import type { Rng } from './rng';
import {
  CATEGORIES, MINOR_PROBABILITY, LOGICAL_W, LOGICAL_H, VOTER_VARIANTS,
  ENTER_PROB_PER_SEC, INSIDE_MIN_MS, INSIDE_MAX_MS, type Category,
} from './constants';
import { buildingRect, pointInRect, isDoorZone } from './world';
import type { Voter, VoterAge, VoterState, FishingSpot, Building } from './types';

export function rollAge(rng: Rng): VoterAge {
  return rng.bool(MINOR_PROBABILITY) ? 'minor' : 'adult';
}

export function chooseCategory(rng: Rng, bias: Partial<Record<Category, number>> = {}): Category {
  const weights = CATEGORIES.map((c) => {
    const w = bias[c];
    return typeof w === 'number' && w > 0 ? w : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < CATEGORIES.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return CATEGORIES[i]!;
  }
  return CATEGORIES[CATEGORIES.length - 1]!;
}

export function matches(baitCategory: Category, voter: { category: Category }): boolean {
  return baitCategory === voter.category;
}

export function spawnVoter(rng: Rng, id: number, spot: FishingSpot, bias: Partial<Record<Category, number>>): Voter {
  const category = chooseCategory(rng, bias);
  const age = rollAge(rng);
  const x = Math.max(0, Math.min(LOGICAL_W, spot.x + (rng.next() * 120 - 60)));
  const y = Math.max(0, Math.min(LOGICAL_H, spot.y + (rng.next() * 80 - 40)));
  const ang = rng.next() * Math.PI * 2;
  const state: VoterState = 'wander';
  const variant = Math.floor(rng.next() * VOTER_VARIANTS);
  return { id, x, y, vx: Math.cos(ang), vy: Math.sin(ang), category, age, state, variant };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Proposed move (v1.2): if (nx,ny) lands inside a building footprint — and not
 *  within that building's door zone — the move is refused: the voter keeps its
 *  old position and `blocked` is true. Otherwise the new position is returned
 *  with `blocked: false`. Pure. */
export function blockedMove(
  v: Voter,
  nx: number,
  ny: number,
  buildings: Building[],
): { x: number; y: number; blocked: boolean } {
  for (const b of buildings) {
    if (!pointInRect(nx, ny, buildingRect(b))) continue; // not in this footprint
    if (isDoorZone(nx, ny, b)) continue; // door exception for this building
    return { x: v.x, y: v.y, blocked: true };
  }
  return { x: nx, y: ny, blocked: false };
}

/** A wander-state voter at the door may enter; probability ENTER_PROB_PER_SEC * dtSec. Pure. */
export function tryEnter(v: Voter, b: Building, rng: Rng, dtMs: number, nowMs: number): Voter {
  if (v.state !== 'wander') return v;
  if (!rng.bool((ENTER_PROB_PER_SEC * dtMs) / 1000)) return v;
  const stayMs = INSIDE_MIN_MS + rng.next() * (INSIDE_MAX_MS - INSIDE_MIN_MS);
  return { ...v, state: 'inside', buildingId: b.id, insideUntil: nowMs + stayMs };
}

/** An inside voter steps out when nowMs >= insideUntil: at the door, category re-rolled
 *  with the building's bias (category only — never party). Pure. */
export function tryExit(v: Voter, b: Building, rng: Rng, nowMs: number): Voter {
  if (v.state !== 'inside' || v.insideUntil === undefined || nowMs < v.insideUntil) return v;
  return {
    ...v,
    state: 'wander',
    x: b.doorX,
    y: b.doorY,
    category: chooseCategory(rng, b.bias),
    buildingId: undefined,
    insideUntil: undefined,
  };
}

/** Spawn a voter at a building's door (± small jitter) with the building's category bias. Pure. */
export function spawnAtBuilding(rng: Rng, id: number, b: Building, nowMs: number): Voter {
  const x = clamp(b.doorX + (rng.next() * 20 - 10), 0, LOGICAL_W);
  const y = clamp(b.doorY + (rng.next() * 14 - 7), 0, LOGICAL_H);
  const ang = rng.next() * Math.PI * 2;
  const state: VoterState = 'wander';
  return {
    id,
    x,
    y,
    vx: Math.cos(ang),
    vy: Math.sin(ang),
    category: chooseCategory(rng, b.bias),
    age: rollAge(rng),
    state,
    variant: rng.int(VOTER_VARIANTS),
  };
}
