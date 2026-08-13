import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/rng';
import { rollAge, chooseCategory, matches, spawnVoter } from '../src/voter';
import { MINOR_PROBABILITY, LOGICAL_W, LOGICAL_H } from '../src/constants';
import type { FishingSpot } from '../src/types';

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
