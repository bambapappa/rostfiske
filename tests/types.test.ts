import { describe, it, expect } from 'vitest';
import type { Bait, Voter, VoterAge, GamePhase, Lapp, Building, GameEvent } from '../src/types';
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
    const v: Voter = { id: 1, x: 0, y: 0, vx: 0, vy: 0, category: 'skatter', age: 'adult', state: 'wander', variant: 0 };
    expect(v.age).toBe<'adult'|'minor'>('adult');
  });

  it('en lapp har position och kopplat bete', () => {
    const l: Lapp = { x: 10, y: 20, baitId: 'p-1' };
    expect(l.baitId).toBe('p-1');
  });

  it('voter kan vara inside', () => {
    const v: Voter = { id: 1, x: 0, y: 0, vx: 0, vy: 0, category: 'skatter', age: 'adult', state: 'inside', variant: 3 };
    expect(v.state).toBe('inside');
  });

  it('en byggnad har dörr och bias', () => {
    const b: Building = { id: 'skolan', name: 'Skolan', x: 56, y: 40, doorX: 56, doorY: 56, bias: { utbildning: 6 } };
    expect(b.doorX).toBe(56);
    expect(b.bias.utbildning).toBe(6);
  });

  it('ett game event har kind och text', () => {
    const e: GameEvent = { kind: 'cast', text: 'Du kastar ut lappen' };
    expect(e.kind).toBe('cast');
  });

  it('phase is one of the fixed states', () => {
    const p: GamePhase = 'playing';
    expect(p).toBe('playing');
  });
});
