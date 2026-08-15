import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/rng';
import { rollAge, chooseCategory, matches, spawnVoter, tryEnter, tryExit, spawnAtBuilding, blockedMove, wanderStep } from '../src/voter';
import { BUILDINGS, buildingById } from '../src/world';
import {
  MINOR_PROBABILITY, LOGICAL_W, LOGICAL_H,
  ENTER_PROB_PER_SEC, INSIDE_MIN_MS, INSIDE_MAX_MS, VOTER_VARIANTS,
  VOTER_SPEED_MIN, VOTER_SPEED_MAX, TURN_INTERVAL_MIN_MS, TURN_INTERVAL_MAX_MS,
  IDLE_MIN_MS, IDLE_MAX_MS, TURN_RATE_MAX,
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
    id: 1, x: 50, y: 50, speed: 13, category: 'övrigt',
    age: 'adult', state: 'wander', variant: 0, ...overrides,
  };
}

/** shortest signed angular difference, wrapped to [-π, π] */
function angDiff(a: number): number {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
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
  const base: Voter = { id: 1, x: 200, y: 120, speed: 13, category: 'välfärd', age: 'adult', state: 'wander', variant: 0 };

  it('returns the new position, blocked=false, when the target is free', () => {
    const r = blockedMove(base, 205, 120, BUILDINGS);
    expect(r).toEqual({ x: 205, y: 120, blocked: false });
  });

  it('blocks a step into a footprint: keeps the old position and flags blocked', () => {
    const v: Voter = { ...base, x: 34, y: 60 };
    const r = blockedMove(v, 34, 42, BUILDINGS); // (34,42) inside skolan rect, 26px from door
    expect(r).toEqual({ x: 34, y: 60, blocked: true });
  });

  it('allows a step strictly inside the footprint when within the door radius (door zone)', () => {
    const v: Voter = { ...base, x: 52, y: 62 };
    // (52,50) is strictly interior (32<52<80, 24<50<56) AND ~7.2px from the
    // door (56,56) — this exercises the isDoorZone exception INSIDE blockedMove
    const r = blockedMove(v, 52, 50, BUILDINGS);
    expect(r).toEqual({ x: 52, y: 50, blocked: false });
  });

  it('blocks an interior point just outside the door radius', () => {
    const v: Voter = { ...base, x: 40, y: 60 };
    // (40,45) is strictly interior but ~19.4px from the door — no exception
    const r = blockedMove(v, 40, 45, BUILDINGS);
    expect(r).toEqual({ x: 40, y: 60, blocked: true });
  });
});

describe('wanderStep (v1.2 natural wandering)', () => {
  // open space at torget — no footprint or door zone interferes with movement
  const OPEN = { x: 200, y: 120 };

  it('spawns give each voter an individual speed in [VOTER_SPEED_MIN, VOTER_SPEED_MAX]', () => {
    const r = makeRng(5);
    for (let i = 0; i < 500; i++) {
      const v = spawnAtBuilding(r, i, skolan, 0);
      expect(v.speed).toBeGreaterThanOrEqual(VOTER_SPEED_MIN);
      expect(v.speed).toBeLessThanOrEqual(VOTER_SPEED_MAX);
    }
    const v = spawnVoter(makeRng(9), 1, flatSpot, {});
    expect(v.speed).toBeGreaterThanOrEqual(VOTER_SPEED_MIN);
    expect(v.speed).toBeLessThanOrEqual(VOTER_SPEED_MAX);
  });

  it('moves along its heading at its own speed when the target is aligned', () => {
    // heading == headingTarget → no turn; p(idle) = 0.08/s · 0.5 s = 0.04 —
    // seed 2 draws false on that roll (verified deterministic for this stream)
    const v0 = makeVoter({ ...OPEN, heading: 0.3, headingTarget: 0.3, nextTurnAt: 1e9, speed: 12 });
    const v1 = wanderStep(v0, 500, 0, makeRng(2), BUILDINGS);
    expect(v1.x - OPEN.x).toBeCloseTo(Math.cos(0.3) * 6, 5);
    expect(v1.y - OPEN.y).toBeCloseTo(Math.sin(0.3) * 6, 5);
  });

  it('turns gradually toward the target — never a 180° jump', () => {
    let v = makeVoter({ ...OPEN, heading: 0, headingTarget: Math.PI, nextTurnAt: 1_000_000, speed: 13 });
    const rng = makeRng(3);
    let prev = 0;
    for (let i = 0; i < 10; i++) {
      v = wanderStep(v, 400, 10_000 + i * 400, rng, BUILDINGS);
      // invariant: per-step turn is capped by TURN_RATE_MAX · dt — a full π
      // reversal in one step would violate this
      expect(Math.abs(angDiff(v.heading! - prev))).toBeLessThanOrEqual(TURN_RATE_MAX * 0.4 + 1e-9);
      prev = v.heading!;
    }
    // 4 s of turning at ≥ 2.5 rad/s capacity converges to the π target
    expect(Math.abs(angDiff(Math.PI - prev))).toBeLessThan(0.5);
  });

  it('re-targets on schedule: new random headingTarget and nextTurnAt +1–3 s', () => {
    const v0 = makeVoter({ ...OPEN, heading: 0, headingTarget: 0, nextTurnAt: 5_000, speed: 12 });
    // p(idle) = 0.008 with dt=100 ms — seed 4 draws false (verified deterministic)
    const v1 = wanderStep(v0, 100, 5_000, makeRng(4), BUILDINGS);
    expect(v1.headingTarget).not.toBe(0); // new random target drawn
    expect(v1.nextTurnAt!).toBeGreaterThanOrEqual(5_000 + TURN_INTERVAL_MIN_MS);
    expect(v1.nextTurnAt!).toBeLessThanOrEqual(5_000 + TURN_INTERVAL_MAX_MS);
  });

  it('an active idle pause freezes the voter completely', () => {
    const v0 = makeVoter({ ...OPEN, heading: 0, headingTarget: 0, nextTurnAt: 1e9, speed: 12, idleUntil: 10_000 });
    const v1 = wanderStep(v0, 500, 9_999, makeRng(1), BUILDINGS);
    expect(v1).toBe(v0); // nowMs < idleUntil → untouched
  });

  it('idle starts occasionally (0.5–1.5 s) without moving', () => {
    // large dt saturates the probability: 0.08/s · 10 s = 0.8 per seed
    let started = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const v0 = makeVoter({ ...OPEN, heading: 0, headingTarget: 0, nextTurnAt: 1e9, speed: 12 });
      const v1 = wanderStep(v0, 10_000, 0, makeRng(seed), BUILDINGS);
      if (v1.idleUntil !== undefined) {
        started++;
        expect(v1.idleUntil).toBeGreaterThanOrEqual(IDLE_MIN_MS);
        expect(v1.idleUntil).toBeLessThanOrEqual(IDLE_MAX_MS);
        expect(v1.x).toBe(OPEN.x); // position untouched while pausing
        expect(v1.y).toBe(OPEN.y);
      }
    }
    expect(started).toBeGreaterThan(10); // p = 0.8 → ~16 of 20 expected
  });

  it('idle clears after idleUntil: wandering resumes', () => {
    const v0 = makeVoter({ ...OPEN, heading: 0.1, headingTarget: 0.1, nextTurnAt: 1e9, speed: 14, idleUntil: 5_000 });
    // nowMs past idleUntil; p(idle restart) = 0.08/s · 0.5 s = 0.04 — seed 6
    // draws false (verified deterministic)
    const v1 = wanderStep(v0, 500, 5_500, makeRng(6), BUILDINGS);
    expect(v1.idleUntil).toBeUndefined();
    expect(v1.x).toBeGreaterThan(OPEN.x); // moving again
  });

  it('a blocked step keeps the position and picks a new heading target', () => {
    // stationen footprint 168..216 x, 8..40 y, door (192,40): start below its
    // right part heading straight up — 2 s · 16 px/s lands deep inside
    let blockedCount = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const v0 = makeVoter({
        x: 214, y: 56, heading: -Math.PI / 2, headingTarget: -Math.PI / 2,
        nextTurnAt: 1e9, speed: 16,
      });
      const v1 = wanderStep(v0, 2_000, 0, makeRng(seed), BUILDINGS);
      expect(v1.state).toBe('wander');
      expect(v1.x).toBe(214); // never walks through the house (idle or blocked)
      expect(v1.y).toBe(56);
      if (v1.headingTarget !== -Math.PI / 2) blockedCount++; // blocked → re-target
    }
    expect(blockedCount).toBeGreaterThan(15); // p(idle eats the step) = 0.16
  });

  it('bounds: soft turn away from the edge instead of a hard bounce', () => {
    // heading straight right at the right edge — the step must stay on screen
    // and the target must be reflected back toward it
    let turned = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const v0 = makeVoter({ x: LOGICAL_W - 1, y: 104, heading: 0, headingTarget: 0, nextTurnAt: 1e9, speed: 16 });
      const v1 = wanderStep(v0, 1_000, 0, makeRng(seed), BUILDINGS);
      expect(v1.x).toBeLessThanOrEqual(LOGICAL_W);
      if (Math.cos(v1.headingTarget!) < 0) turned++;
    }
    expect(turned).toBeGreaterThan(10); // reflection unless idle ate the step
  });

  it('long runs never leave the screen', () => {
    for (let seed = 1; seed <= 10; seed++) {
      let v = makeVoter({
        x: 190, y: 100, heading: (seed * 0.7) % (Math.PI * 2),
        headingTarget: (seed * 0.7) % (Math.PI * 2), nextTurnAt: 0, speed: 16,
      });
      const rng = makeRng(seed * 31 + 7);
      for (let i = 0; i < 600; i++) { // 60 s of wandering at 10 fps
        v = wanderStep(v, 100, i * 100, rng, BUILDINGS);
        expect(v.x).toBeGreaterThanOrEqual(0);
        expect(v.x).toBeLessThanOrEqual(LOGICAL_W);
        expect(v.y).toBeGreaterThanOrEqual(0);
        expect(v.y).toBeLessThanOrEqual(LOGICAL_H);
      }
    }
  });
});
