import { HOOK_WINDOW_MS, ATTRACT_SPEED } from './constants';
import type { Voter } from './types';

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
    state: 'attracted',
    x: v.x + (dx / dist) * move,
    y: v.y + (dy / dist) * move,
  };
}
