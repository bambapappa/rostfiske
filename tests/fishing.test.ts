import { describe, it, expect } from 'vitest';
import { beginBite, hookSucceeds, bittenVoterEscapes, resolveCatch, moveAttracted } from '../src/fishing';
import { HOOK_WINDOW_MS } from '../src/constants';
import type { Voter } from '../src/types';

const wandering = (over: Partial<Voter> = {}): Voter => ({ id: 1, x: 0, y: 0, vx: 1, vy: 0, category: 'välfärd', age: 'adult', state: 'wander', ...over });

describe('hook window', () => {
  it('beginBite opens a window', () => {
    const v = beginBite(wandering(), 1000);
    expect(v.state).toBe('biting');
    expect(v.biteDeadline).toBe(1000 + HOOK_WINDOW_MS);
  });
  it('hook succeeds within the window', () => {
    const v = beginBite(wandering(), 1000);
    expect(hookSucceeds(v, 1000)).toBe(true);
    expect(hookSucceeds(v, 1000 + HOOK_WINDOW_MS)).toBe(true);
  });
  it('voter escapes after the window', () => {
    const v = beginBite(wandering(), 1000);
    expect(bittenVoterEscapes(v, 1000 + HOOK_WINDOW_MS + 1)).toBe(true);
    expect(bittenVoterEscapes(v, 999)).toBe(false);
  });
});

describe('resolveCatch', () => {
  it('counts an adult as a vote', () => {
    expect(resolveCatch(wandering({ age: 'adult' }))).toEqual({ votes: 1, released: false });
  });
  it('releases a minor with no vote', () => {
    expect(resolveCatch(wandering({ age: 'minor' }))).toEqual({ votes: 0, released: true });
  });
});

describe('moveAttracted', () => {
  it('moves toward the target at ATTRACT_SPEED', () => {
    const v = wandering({ x: 0, y: 0, attractToX: 100, attractToY: 0 });
    const moved = moveAttracted(v, 1000); // 1s
    // 34 px/s for 1s toward x=100 from 0 → ~34
    expect(moved.x).toBeGreaterThan(30);
    expect(moved.x).toBeLessThanOrEqual(35);
    expect(moved.state).toBe('attracted');
  });
});
