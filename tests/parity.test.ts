import { describe, it, expect } from 'vitest';
import { validatePromises, validateParties, promisesForParty } from '../src/api';
import { FALLBACK_PROMISES, FALLBACK_PARTIES } from '../src/fallback';
import { PARTIES, CATEGORIES, MIN_PROMISES_PER_PARTY } from '../src/constants';

describe('fallback neutrality parity', () => {
  const ps = validatePromises({ data: FALLBACK_PROMISES });

  it('has all 8 parties', () => {
    const parties = validateParties({ data: FALLBACK_PARTIES });
    expect(parties.map(p => p.code).sort()).toEqual([...PARTIES].sort());
  });

  it('gives every party at least MIN_PROMISES_PER_PARTY active promises', () => {
    for (const p of PARTIES) {
      expect(promisesForParty(ps, p).length).toBeGreaterThanOrEqual(MIN_PROMISES_PER_PARTY);
    }
  });

  it('collectively covers all 9 categories', () => {
    const present = new Set(ps.map(p => p.category));
    for (const c of CATEGORIES) expect(present.has(c)).toBe(true);
  });
});
