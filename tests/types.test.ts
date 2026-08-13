import { describe, it, expect } from 'vitest';
import type { Bait, Voter, VoterAge, GamePhase } from '../src/types';
import { BAIT_DURABILITY } from '../src/constants';

describe('domain types', () => {
  it('a fresh bait starts at full durability', () => {
    const b: Bait = {
      id: 'p-1', title: 'Mer välfärd', quote: 'vi lovar',
      category: 'välfärd', party: 's', msekBase: 1000,
      sourceUrl: 'https://x', sourceDomain: 'x.se',
      durability: BAIT_DURABILITY, maxDurability: BAIT_DURABILITY,
    };
    expect(b.durability).toBe(b.maxDurability);
  });

  it('a voter has a category and an age', () => {
    const v: Voter = { id: 1, x: 0, y: 0, vx: 0, vy: 0, category: 'skatter', age: 'adult', state: 'wander' };
    expect(v.age).toBe<'adult'|'minor'>('adult');
  });

  it('phase is one of the fixed states', () => {
    const p: GamePhase = 'playing';
    expect(p).toBe('playing');
  });
});
