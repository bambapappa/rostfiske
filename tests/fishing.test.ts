import { describe, it, expect } from 'vitest';
import { beginBite, hookSucceeds, bittenVoterEscapes, resolveCatch, moveAttracted, noticeLapp, reachedLapp, resolveMiss } from '../src/fishing';
import { HOOK_WINDOW_MS, NOTICE_RADIUS, NOTICE_PROB_PER_SEC, PICKUP_DIST } from '../src/constants';
import type { Voter, Lapp, Bait } from '../src/types';
import { makeRng } from '../src/rng';

const wandering = (over: Partial<Voter> = {}): Voter => ({ id: 1, x: 0, y: 0, speed: 13, category: 'välfärd', age: 'adult', state: 'wander', variant: 0, ...over });
const lappAt = (x: number, y: number): Lapp => ({ x, y, baitId: 'b-1' });

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
    expect(moved.state).toBe('toLapp');
  });
});

describe('noticeLapp', () => {
  it('matching voter within radius with large dt becomes toLapp (seeded)', () => {
    const rng = makeRng(12345);
    const v = wandering({ x: 40, y: 50, category: 'välfärd' });
    const lapp = lappAt(40, 50);
    const noticed = noticeLapp(v, lapp, 'välfärd', rng, 10000); // p=4 >1, always true
    expect(noticed.state).toBe('toLapp');
    expect(noticed.attractToX).toBe(40);
    expect(noticed.attractToY).toBe(50);
    expect(noticed).not.toBe(v);
  });
  it('matching voter outside radius stays wander (same ref)', () => {
    const rng = makeRng(12345);
    const v = wandering({ x: 0, y: 0, category: 'välfärd' });
    const lapp = lappAt(200, 200); // >80 away
    const noticed = noticeLapp(v, lapp, 'välfärd', rng, 10000);
    expect(noticed.state).toBe('wander');
    expect(noticed).toBe(v);
  });
  it('non-matching voter within radius stays wander (same ref)', () => {
    const rng = makeRng(12345);
    const v = wandering({ x: 40, y: 50, category: 'skatter' });
    const lapp = lappAt(40, 50);
    const noticed = noticeLapp(v, lapp, 'välfärd', rng, 10000);
    expect(noticed.state).toBe('wander');
    expect(noticed).toBe(v);
  });
  it('dtMs=0 never notices (even with match and within radius)', () => {
    const rng = makeRng(12345);
    const v = wandering({ x: 40, y: 50, category: 'välfärd' });
    const lapp = lappAt(40, 50);
    const noticed = noticeLapp(v, lapp, 'välfärd', rng, 0);
    expect(noticed.state).toBe('wander');
    expect(noticed).toBe(v);
  });
  it('dtMs=0 never notices over 1000 iterations', () => {
    const rng = makeRng(42);
    const v = wandering({ x: 40, y: 50, category: 'välfärd' });
    const lapp = lappAt(40, 50);
    for (let i = 0; i < 1000; i++) {
      const noticed = noticeLapp(v, lapp, 'välfärd', rng, 0);
      expect(noticed.state).toBe('wander');
    }
  });
  it('only wanderers are affected (biting voter stays biting)', () => {
    const rng = makeRng(12345);
    const v = wandering({ x: 40, y: 50, category: 'välfärd', state: 'biting', biteDeadline: 5000 });
    const lapp = lappAt(40, 50);
    const noticed = noticeLapp(v, lapp, 'välfärd', rng, 10000);
    expect(noticed.state).toBe('biting');
    expect(noticed).toBe(v);
  });
  it('only wanderers are affected (inside voter stays inside)', () => {
    const rng = makeRng(12345);
    const v = wandering({ x: 40, y: 50, category: 'välfärd', state: 'inside', buildingId: 'skolan', insideUntil: 5000 });
    const lapp = lappAt(40, 50);
    const noticed = noticeLapp(v, lapp, 'välfärd', rng, 10000);
    expect(noticed.state).toBe('inside');
    expect(noticed).toBe(v);
  });
  it('probability check can fail even with match and radius', () => {
    const rng = makeRng(99999); // different seed
    const v = wandering({ x: 40, y: 50, category: 'välfärd' });
    const lapp = lappAt(40, 50);
    // Small dt gives small probability, might fail
    const noticed = noticeLapp(v, lapp, 'välfärd', rng, 100); // p=0.04
    // This specific seed with this dt happens to not trigger
    expect(noticed.state).toBe('wander');
    expect(noticed).toBe(v);
  });
});

describe('reachedLapp', () => {
  it('returns true when within PICKUP_DIST (3 px)', () => {
    const v = wandering({ x: 100, y: 100 });
    const lapp = lappAt(103, 100); // 3px away
    expect(reachedLapp(v, lapp)).toBe(true);
  });
  it('returns false when outside PICKUP_DIST (6 px)', () => {
    const v = wandering({ x: 100, y: 100 });
    const lapp = lappAt(106, 100); // 6px away
    expect(reachedLapp(v, lapp)).toBe(false);
  });
  it('returns true when exactly at the lapp', () => {
    const v = wandering({ x: 100, y: 100 });
    const lapp = lappAt(100, 100);
    expect(reachedLapp(v, lapp)).toBe(true);
  });
  it('works diagonally', () => {
    const v = wandering({ x: 0, y: 0 });
    const lapp = lappAt(3, 3); // sqrt(18) ≈ 4.24 > 4, but still close
    // Actually sqrt(18) ≈ 4.24 > PICKUP_DIST (4)
    // Let me recalculate... 3,3 should be within 4? sqrt(9+9) = 4.24 > 4
    // So 3,3 should be false
    expect(reachedLapp(v, lapp)).toBe(false);
    // 2,2: sqrt(8) ≈ 2.83 < 4, should be true
    const lapp2 = lappAt(2, 2);
    expect(reachedLapp(v, lapp2)).toBe(true);
  });
});

describe('resolveMiss', () => {
  it('decrements bait durability by 1', () => {
    const bait: Bait = {
      id: 'b-1', title: 'Test', quote: 'q', category: 'välfärd',
      party: 's', msekBase: 1000, sourceUrl: 'https://test.com', sourceDomain: 'test.com',
      durability: 5, maxDurability: 6,
    };
    const result = resolveMiss(bait);
    expect(result.bait.durability).toBe(4);
    expect(result.bait.maxDurability).toBe(6); // unchanged
  });
  it('returns lappGone: true', () => {
    const bait: Bait = {
      id: 'b-1', title: 'Test', quote: 'q', category: 'välfärd',
      party: 's', msekBase: 1000, sourceUrl: 'https://test.com', sourceDomain: 'test.com',
      durability: 5, maxDurability: 6,
    };
    const result = resolveMiss(bait);
    expect(result.lappGone).toBe(true);
  });
  it('worn bait stays at 0 durability', () => {
    const bait: Bait = {
      id: 'b-1', title: 'Test', quote: 'q', category: 'välfärd',
      party: 's', msekBase: 1000, sourceUrl: 'https://test.com', sourceDomain: 'test.com',
      durability: 0, maxDurability: 6,
    };
    const result = resolveMiss(bait);
    expect(result.bait.durability).toBe(0);
  });
});
