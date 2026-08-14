import { describe, it, expect } from 'vitest';
import { createGame, step, onHookClick, cast } from '../src/engine';
import { makeRng } from '../src/rng';
import { ROUND_MS, MAX_VOTERS, TACKLE_SIZE } from '../src/constants';
import { toBait } from '../src/bait';
import type { PromiseData } from '../src/types';

const pp = (cat: any): PromiseData => ({ id: 'p-'+cat, title: cat, quote: 'q', party: 's', category: cat, msekBase: 1, status: 'aktiv', source: { url: 'u', domain: 'd' } });

describe('createGame', () => {
  it('starts in playing with full time and an active bait', () => {
    const g = createGame({ party: 's', promises: [pp('välfärd'),pp('skatter'),pp('övrigt'),pp(' migration'),pp('försvar'),pp('infrastruktur')], seed: 1 });
    expect(g.phase).toBe('playing');
    expect(g.timeLeftMs).toBe(ROUND_MS);
    expect(g.tackle.length).toBe(TACKLE_SIZE);
    expect(g.votes).toBe(0);
  });
  it('never spawns more than MAX_VOTERS', () => {
    const g = createGame({ party: 's', promises: [pp('välfärd'),pp('skatter'),pp('övrigt'),pp('försvar'),pp('infrastruktur'),pp('migration')], seed: 1 });
    const stepped = step(g, 10_000);
    expect(stepped.voters.length).toBeLessThanOrEqual(MAX_VOTERS);
  });
});

describe('time + game over', () => {
  it('decrements timeLeft and ends at zero', () => {
    const g = createGame({ party: 's', promises: [pp('välfärd'),pp('skatter'),pp('övrigt'),pp('försvar'),pp('infrastruktur'),pp('migration')], seed: 1 });
    const s = step(g, ROUND_MS + 1);
    expect(s.phase).toBe('game_over');
    expect(s.timeLeftMs).toBe(0);
  });
});

describe('hook click', () => {
  it('counts a vote when an adult is hooked in time', () => {
    const g = createGame({ party: 's', promises: [pp('välfärd'),pp('skatter'),pp('övrigt'),pp('försvar'),pp('infrastruktur'),pp('migration')], seed: 1 });
    // inject a biting adult at the rod
    const bait = g.tackle[0]!;
    const g2: typeof g = { ...g, voters: [{ id: 99, x: g.spotX, y: g.spotY, vx:0, vy:0, category: bait.category, age: 'adult', state: 'biting', biteDeadline: 10_000 }] };
    const g3 = onHookClick(g2, 5_000);
    expect(g3.votes).toBe(1);
    expect(g3.voters.find(v => v.id === 99)).toBeUndefined();
  });
  it('releases (no vote) when a minor is hooked', () => {
    const g = createGame({ party: 's', promises: [pp('välfärd'),pp('skatter'),pp('övrigt'),pp('försvar'),pp('infrastruktur'),pp('migration')], seed: 1 });
    const bait = g.tackle[0]!;
    const g2: typeof g = { ...g, voters: [{ id: 99, x: g.spotX, y: g.spotY, vx:0, vy:0, category: bait.category, age: 'minor', state: 'biting', biteDeadline: 10_000 }] };
    const g3 = onHookClick(g2, 5_000);
    expect(g3.votes).toBe(0);
    expect(g3.released).toBe(1);
  });
});

describe('one biter at a time', () => {
  it('only the first arriving voter bites; later arrivals stay attracted', () => {
    const g = createGame({ party: 's', promises: [pp('välfärd'),pp('skatter'),pp('övrigt'),pp('försvar'),pp('infrastruktur'),pp('migration')], seed: 1 });
    const cat = g.tackle[0]!.category;
    // Two matching voters already at the rod, both attracted.
    const g2: typeof g = {
      ...g,
      voters: [1, 2].map((id) => ({
        id, x: g.spotX, y: g.spotY, vx: 0, vy: 0, category: cat, age: 'adult' as const,
        state: 'attracted' as const, attractToX: g.spotX, attractToY: g.spotY,
      })),
    };
    const s = step(g2, 16);
    const biting = s.voters.filter((v) => v.state === 'biting');
    const attracted = s.voters.filter((v) => v.state === 'attracted');
    expect(biting).toHaveLength(1);
    expect(attracted).toHaveLength(1);
    expect(s.bitingVoterId).toBe(biting[0]!.id);
  });
});

describe('escape in step', () => {
  it('clears bitingVoterId when the biting voter escapes (deadline in the past)', () => {
    const g = createGame({ party: 's', promises: [pp('välfärd'),pp('skatter'),pp('övrigt'),pp('försvar'),pp('infrastruktur'),pp('migration')], seed: 1 });
    // Inject a biting voter whose hook window already closed, and track its id.
    const staleId = 42;
    const g2: typeof g = {
      ...g,
      bitingVoterId: staleId,
      voters: [{ id: staleId, x: g.spotX, y: g.spotY, vx: 0, vy: 0, category: g.tackle[0]!.category, age: 'adult', state: 'biting', biteDeadline: 1_000 }],
    };
    // Game clock `elapsed` after a 10s step is well past the 1_000 deadline → escape.
    const s = step(g2, 10_000);
    expect(s.bitingVoterId).toBeNull();
    const escaper = s.voters.find((v) => v.id === staleId);
    expect(escaper).toBeDefined();
    expect(escaper!.state).toBe('wander');
    expect(escaper!.biteDeadline).toBeUndefined();
  });
});
