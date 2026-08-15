import type { Rng } from './rng';
import {
  CATEGORIES, MINOR_PROBABILITY, LOGICAL_W, LOGICAL_H, VOTER_VARIANTS,
  ENTER_PROB_PER_SEC, INSIDE_MIN_MS, INSIDE_MAX_MS,
  VOTER_SPEED_MIN, VOTER_SPEED_MAX, TURN_INTERVAL_MIN_MS, TURN_INTERVAL_MAX_MS,
  TURN_RATE_MAX, IDLE_PROB_PER_SEC, IDLE_MIN_MS, IDLE_MAX_MS,
  type Category,
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
  const heading = rng.next() * Math.PI * 2;
  const state: VoterState = 'wander';
  const variant = Math.floor(rng.next() * VOTER_VARIANTS);
  return {
    id, x, y, speed: rollSpeed(rng), heading, headingTarget: heading,
    category, age, state, variant,
  };
}

/** Individual wander speed in [VOTER_SPEED_MIN, VOTER_SPEED_MAX] px/s. */
function rollSpeed(rng: Rng): number {
  return VOTER_SPEED_MIN + rng.next() * (VOTER_SPEED_MAX - VOTER_SPEED_MIN);
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
  const heading = rng.next() * Math.PI * 2;
  const state: VoterState = 'wander';
  return {
    id,
    x,
    y,
    speed: rollSpeed(rng),
    heading,
    headingTarget: heading,
    nextTurnAt: nowMs + rollTurnInterval(rng),
    category: chooseCategory(rng, b.bias),
    age: rollAge(rng),
    state,
    variant: rng.int(VOTER_VARIANTS),
  };
}

/** Time until the next heading retarget, in [TURN_INTERVAL_MIN, MAX] ms. */
function rollTurnInterval(rng: Rng): number {
  return TURN_INTERVAL_MIN_MS + rng.next() * (TURN_INTERVAL_MAX_MS - TURN_INTERVAL_MIN_MS);
}

/** Wrap an angle to [0, 2π). */
function wrapAngle(a: number): number {
  const r = a % (Math.PI * 2);
  return r < 0 ? r + Math.PI * 2 : r;
}

/** Shortest signed angle from `from` to `target`, in [-π, π]. */
function angleTo(target: number, from: number): number {
  const d = wrapAngle(target - from);
  return d > Math.PI ? d - Math.PI * 2 : d;
}

/** v1.2 natural wandering: one wander-state step. The voter moves at its own
 *  speed along `heading`, which converges toward `headingTarget` at most
 *  TURN_RATE_MAX rad/s (never an instant reversal). Every TURN_INTERVAL a new
 *  random target is drawn; occasionally the voter pauses (idle) for
 *  IDLE_MIN–MAX ms. Screen edges turn the target softly back toward the play
 *  area instead of bouncing; blocked building steps keep the position and
 *  draw a new target. Pure. */
export function wanderStep(v: Voter, dtMs: number, nowMs: number, rng: Rng, buildings: Building[]): Voter {
  // paused ("tittar i skyltfönster"): completely still
  if (nowMs < (v.idleUntil ?? 0)) return v;

  // occasionally start a pause — position untouched this step
  if (rng.bool((IDLE_PROB_PER_SEC * dtMs) / 1000)) {
    const idleMs = IDLE_MIN_MS + rng.next() * (IDLE_MAX_MS - IDLE_MIN_MS);
    return { ...v, idleUntil: nowMs + idleMs };
  }

  let heading = v.heading ?? 0;
  let headingTarget = v.headingTarget ?? heading;
  let nextTurnAt = v.nextTurnAt ?? nowMs;

  // periodic retarget: new random direction every 1–3 s
  if (nowMs >= nextTurnAt) {
    headingTarget = rng.next() * Math.PI * 2;
    nextTurnAt = nowMs + rollTurnInterval(rng);
  }

  // gradual turn toward the target, capped by TURN_RATE_MAX · dt
  const maxTurn = (TURN_RATE_MAX * dtMs) / 1000;
  heading = wrapAngle(heading + Math.min(maxTurn, Math.max(-maxTurn, angleTo(headingTarget, heading))));

  // move at the individual speed along the current heading
  let nx = v.x + (Math.cos(heading) * v.speed * dtMs) / 1000;
  let ny = v.y + (Math.sin(heading) * v.speed * dtMs) / 1000;

  // screen edges: soft turn — reflect the target back toward the play area and
  // clamp the position (the heading itself keeps converging gradually)
  if (nx < 0 || nx > LOGICAL_W) {
    headingTarget = wrapAngle(Math.PI - headingTarget);
    nx = Math.max(0, Math.min(LOGICAL_W, nx));
  }
  if (ny < 0 || ny > LOGICAL_H) {
    headingTarget = wrapAngle(-headingTarget);
    ny = Math.max(0, Math.min(LOGICAL_H, ny));
  }

  // building footprints block (door zones excepted): keep the position and
  // re-aim at a fresh random direction
  const move = blockedMove(v, nx, ny, buildings);
  if (move.blocked) {
    return { ...v, idleUntil: undefined, heading, headingTarget: rng.next() * Math.PI * 2, nextTurnAt };
  }
  return { ...v, x: move.x, y: move.y, idleUntil: undefined, heading, headingTarget, nextTurnAt };
}
