import { HOOK_WINDOW_MS, ATTRACT_SPEED, NOTICE_RADIUS, NOTICE_PROB_PER_SEC, PICKUP_DIST } from './constants';
import type { Voter, Lapp, Bait } from './types';
import { wearBait } from './bait';
import type { Rng } from './rng';
import type { Category } from './constants';

export function beginBite(v: Voter, nowMs: number): Voter {
  return { ...v, state: 'biting', biteDeadline: nowMs + HOOK_WINDOW_MS };
}

export function hookSucceeds(v: Voter, nowMs: number): boolean {
  return v.state === 'biting' && typeof v.biteDeadline === 'number' && nowMs <= v.biteDeadline;
}

export function bittenVoterEscapes(v: Voter, nowMs: number): boolean {
  return v.state === 'biting' && typeof v.biteDeadline === 'number' && nowMs > v.biteDeadline;
}

export function resolveCatch(v: Voter): { votes: number; released: boolean } {
  return v.age === 'minor' ? { votes: 0, released: true } : { votes: 1, released: false };
}

export function moveAttracted(v: Voter, dtMs: number): Voter {
  if (typeof v.attractToX !== 'number' || typeof v.attractToY !== 'number') return v;
  const dx = v.attractToX - v.x, dy = v.attractToY - v.y;
  const dist = Math.hypot(dx, dy) || 1;
  const step = (ATTRACT_SPEED * dtMs) / 1000;
  const move = Math.min(step, dist);
  return {
    ...v,
    state: 'toLapp',
    x: v.x + (dx / dist) * move,
    y: v.y + (dy / dist) * move,
  };
}

export function noticeLapp(
  v: Voter,
  lapp: Lapp,
  lappCategory: Category,
  rng: Rng,
  dtMs: number,
  attractMultiplier: number = 1
): Voter {
  // Only wanderers can notice
  if (v.state !== 'wander') return v;

  // Distance check
  const dist = Math.hypot(v.x - lapp.x, v.y - lapp.y);
  if (dist > NOTICE_RADIUS) return v;

  // Category match check
  if (v.category !== lappCategory) return v;

  // Probability check (dtMs=0 → probability 0 → never)
  const probability = NOTICE_PROB_PER_SEC * (dtMs / 1000) * attractMultiplier;
  if (!rng.bool(probability)) return v;

  // All checks passed → transition to toLapp
  return {
    ...v,
    state: 'toLapp',
    attractToX: lapp.x,
    attractToY: lapp.y,
  };
}

export function reachedLapp(v: Voter, lapp: Lapp): boolean {
  if (lapp.flightProgress !== undefined && lapp.flightProgress < 1) {
    return false;
  }
  const dist = Math.hypot(v.x - lapp.x, v.y - lapp.y);
  return dist <= PICKUP_DIST;
}

export function resolveMiss(bait: Bait): { bait: Bait; lappGone: true } {
  return {
    bait: wearBait(bait),
    lappGone: true,
  };
}
