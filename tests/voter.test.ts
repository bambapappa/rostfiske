import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/rng';
import { rollAge, chooseCategory, matches, spawnVoter, tryEnter, tryExit, spawnAtBuilding, blockedMove } from '../src/voter';
import { BUILDINGS, buildingById } from '../src/world';
import {
  MINOR_PROBABILITY, LOGICAL_W, LOGICAL_H,
  ENTER_PROB_PER_SEC, INSIDE_MIN_MS, INSIDE_MAX_MS, VOTER_VARIANTS,
} from '../src/constants';
import type { Building, FishingSpot, Voter } from '../src/types';

const flatSpot: FishingSpot = { id: 'torget', name: 'Torget', x: 100, y: 100, bias: {} };

describe('rollAge', () => {
  it('roughly respects MINOR_PROBABILITY', () => {
    const r = makeRng(5); let minors = 0;
    for (let i = 0; i < 10000; i++) if (rollAge(r) === 'minor') minors++;
    expect(minors).toBeGreaterThan(10000 * MINOR_PROBABILITY - 400);
    expect(minors).toBeLessThan(10000 * MINOR_PROBABILITY + 400);
  });
});

describe('chooseCategory', () => {
  it('returns a known category', () => {
    const c = chooseCategory(makeRng(1));
    expect(['välfärd','utbildning','skatter','klimat-miljö','rättsväsende','migration','infrastruktur','försvar','övrigt']).toContain(c);
  });
  it('is biased: heavy bias on utbildning dominates', () => {
    const r = makeRng(123); let edu = 0;
    for (let i = 0; i < 5000; i++) if (chooseCategory(r, { utbildning: 20 }) === 'utbildning') edu++;
    // With weight 20 vs 8 others at weight 1 each: 20/28 ≈ 71.4% → ~3571 expected
    expect(edu).toBeGreaterThan(3300);
    expect(edu).toBeLessThan(3900);
  });
});

describe('matches', () => {
  it('matches when categories are equal', () => {
    expect(matches('välfärd', { category: 'välfärd' } as any)).toBe(true);
    expect(matches('välfärd', { category: 'skatter' } as any)).toBe(false);
  });
});

describe('spawnVoter', () => {
  it('spawns within the screen and wandering', () => {
    const v = spawnVoter(makeRng(9), 1, flatSpot, {});
    expect(v.x).toBeGreaterThanOrEqual(0); expect(v.x).toBeLessThanOrEqual(LOGICAL_W);
    expect(v.y).toBeGreaterThanOrEqual(0); expect(v.y).toBeLessThanOrEqual(LOGICAL_H);
    expect(v.state).toBe('wander');
  });
});

const skolan: Building = { id: 'skolan', name: 'Skolan', x: 56, y: 40, doorX: 56, doorY: 56, bias: { utbildning: 6 } };

function makeVoter(overrides: Partial<Voter> = {}): Voter {
  return {
    id: 1, x: 50, y: 50, vx: 1, vy: 0, category: 'övrigt',
    age: 'adult', state: 'wander', variant: 0, ...overrides,
  };
}

describe('tryEnter', () => {
  it('only affects wander-state voters', () => {
    for (const state of ['toLapp', 'biting', 'inside'] as const) {
      const v = makeVoter({ state });
      const out = tryEnter(v, skolan, makeRng(1), 10_000, 0); // p > 1 → would always enter
      expect(out).toBe(v);
    }
  });

  it('never enters at dtMs=0 (probability 0)', () => {
    const r = makeRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = makeVoter();
      expect(tryEnter(v, skolan, r, 0, 0).state).toBe('wander');
    }
  });

  it('always enters at very large dtMs (probability clamped true by rng.bool)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = makeVoter();
      // ENTER_PROB_PER_SEC * dtMs/1000 = 0.15 * 10 = 1.5 > 1 → next() < 1.5 is always true
      const out = tryEnter(v, skolan, r, 10_000, 1000);
      expect(out.state).toBe('inside');
      expect(out.buildingId).toBe('skolan');
    }
  });

  it('sets insideUntil within [nowMs+INSIDE_MIN_MS, nowMs+INSIDE_MAX_MS) and does not mutate input', () => {
    const r = makeRng(3);
    for (let i = 0; i < 500; i++) {
      const nowMs = 12345;
      const v = makeVoter();
      const out = tryEnter(v, skolan, r, 10_000, nowMs);
      expect(out.insideUntil).toBeGreaterThanOrEqual(nowMs + INSIDE_MIN_MS);
      expect(out.insideUntil).toBeLessThan(nowMs + INSIDE_MAX_MS);
      expect(v.state).toBe('wander'); // original untouched
      expect(v.buildingId).toBeUndefined();
      expect(v.insideUntil).toBeUndefined();
      expect(out).not.toBe(v);
    }
  });

  it('roughly matches ENTER_PROB_PER_SEC at dtMs=1000', () => {
    const r = makeRng(99); let entered = 0; const N = 20_000;
    for (let i = 0; i < N; i++) if (tryEnter(makeVoter(), skolan, r, 1000, 0).state === 'inside') entered++;
    const expected = N * ENTER_PROB_PER_SEC; // 3000
    const sd = Math.sqrt(N * ENTER_PROB_PER_SEC * (1 - ENTER_PROB_PER_SEC)); // ≈ 50.5
    expect(entered).toBeGreaterThan(expected - 6 * sd); // > 2697
    expect(entered).toBeLessThan(expected + 6 * sd); // < 3303
  });
});

describe('tryExit', () => {
  it('leaves non-inside voters unchanged', () => {
    const v = makeVoter({ state: 'wander' });
    expect(tryExit(v, skolan, makeRng(1), 100_000)).toBe(v);
    const b = makeVoter({ state: 'biting' });
    expect(tryExit(b, skolan, makeRng(1), 100_000)).toBe(b);
  });

  it('does not exit before insideUntil', () => {
    const insideUntil = 10_000;
    const v = makeVoter({ state: 'inside', buildingId: 'skolan', insideUntil });
    expect(tryExit(v, skolan, makeRng(1), 9999)).toBe(v);
    expect(tryExit(v, skolan, makeRng(1), insideUntil - 1)).toBe(v);
  });

  it('exits at the door as wander with insideUntil/buildingId cleared', () => {
    const v = makeVoter({ state: 'inside', buildingId: 'skolan', insideUntil: 10_000, x: 999, y: 999 });
    const out = tryExit(v, skolan, makeRng(5), 10_000);
    expect(out.state).toBe('wander');
    expect(out.x).toBe(skolan.doorX);
    expect(out.y).toBe(skolan.doorY);
    expect(out.buildingId).toBeUndefined();
    expect(out.insideUntil).toBeUndefined();
    expect(v.state).toBe('inside'); // original untouched
    expect(v.x).toBe(999);
  });

  it('re-rolls category with the building bias: skolan → majority utbildning', () => {
    // bias utbildning:6 over 9 categories → 6/14 ≈ 42.9% (uniform would be 1/9 ≈ 11%)
    const r = makeRng(2024); let edu = 0; const N = 500;
    for (let i = 0; i < N; i++) {
      const v = makeVoter({ state: 'inside', buildingId: 'skolan', insideUntil: 0, category: 'välfärd' });
      if (tryExit(v, skolan, r, 1).category === 'utbildning') edu++;
    }
    // mean ≈ 214, sd ≈ 11 → threshold 150 is >5 sd below mean; uniform would give ~56
    expect(edu).toBeGreaterThan(150);
    expect(edu).toBeLessThan(280);
  });
});

describe('spawnAtBuilding', () => {
  it('spawns at the door with small jitter, wandering', () => {
    const r = makeRng(11);
    for (let i = 0; i < 200; i++) {
      const v = spawnAtBuilding(r, i, skolan, 0);
      expect(v.state).toBe('wander');
      expect(v.id).toBe(i);
      expect(v.x).toBeGreaterThanOrEqual(skolan.doorX - 10);
      expect(v.x).toBeLessThanOrEqual(skolan.doorX + 10);
      expect(v.y).toBeGreaterThanOrEqual(skolan.doorY - 7);
      expect(v.y).toBeLessThanOrEqual(skolan.doorY + 7);
      expect(v.x).toBeGreaterThanOrEqual(0); expect(v.x).toBeLessThanOrEqual(LOGICAL_W);
      expect(v.y).toBeGreaterThanOrEqual(0); expect(v.y).toBeLessThanOrEqual(LOGICAL_H);
      expect(v.variant).toBeGreaterThanOrEqual(0);
      expect(v.variant).toBeLessThan(VOTER_VARIANTS);
      expect(['minor', 'adult']).toContain(v.age);
    }
  });

  it('jitters: not every spawn lands on the exact door coordinate', () => {
    const r = makeRng(13); let moved = 0;
    for (let i = 0; i < 100; i++) {
      const v = spawnAtBuilding(r, i, skolan, 0);
      if (v.x !== skolan.doorX || v.y !== skolan.doorY) moved++;
    }
    expect(moved).toBeGreaterThan(50);
  });

  it('category drawn with the building bias: majority utbildning at skolan', () => {
    const r = makeRng(77); let edu = 0; const N = 500;
    for (let i = 0; i < N; i++) {
      if (spawnAtBuilding(r, i, skolan, 0).category === 'utbildning') edu++;
    }
    expect(edu).toBeGreaterThan(150); // mean ≈ 214; uniform would be ~56
    expect(edu).toBeLessThan(280);
  });

  it('rolls both ages over many spawns', () => {
    const r = makeRng(31); let minors = 0;
    for (let i = 0; i < 1000; i++) if (spawnAtBuilding(r, i, skolan, 0).age === 'minor') minors++;
    expect(minors).toBeGreaterThan(50); // ~150 expected (p=0.15)
    expect(minors).toBeLessThan(250);
  });
});

describe('blockedMove (v1.2)', () => {
  const skolan = buildingById('skolan'); // rect 32..80 x, 24..56 y; door (56,56)
  const base: Voter = { id: 1, x: 200, y: 120, vx: 1, vy: 0, category: 'välfärd', age: 'adult', state: 'wander', variant: 0 };

  it('returns the new position, blocked=false, when the target is free', () => {
    const r = blockedMove(base, 205, 120, BUILDINGS);
    expect(r).toEqual({ x: 205, y: 120, blocked: false });
  });

  it('blocks a step into a footprint: keeps the old position and flags blocked', () => {
    const v: Voter = { ...base, x: 34, y: 60 };
    const r = blockedMove(v, 34, 42, BUILDINGS); // (34,42) inside skolan rect, 26px from door
    expect(r).toEqual({ x: 34, y: 60, blocked: true });
  });

  it('allows a step onto the door point (door zone)', () => {
    const v: Voter = { ...base, x: 56, y: 60 };
    const r = blockedMove(v, 56, 56, BUILDINGS); // exact door coordinate
    expect(r).toEqual({ x: 56, y: 56, blocked: false });
  });

  it('allows a step near the door within the door radius', () => {
    const v: Voter = { ...base, x: 50, y: 62 };
    const r = blockedMove(v, 52, 58, BUILDINGS); // inside rect, ~4.5px from door
    expect(r.blocked).toBe(false);
    expect(r.x).toBe(52);
    expect(r.y).toBe(58);
  });
});
