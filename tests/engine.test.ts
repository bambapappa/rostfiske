import { describe, it, expect } from 'vitest';
import { createGame, step, onHookClick, castLapp, type GameState } from '../src/engine';
import { ROUND_MS, MAX_VOTERS, TACKLE_SIZE, LOGICAL_W, LOGICAL_H, CATEGORIES } from '../src/constants';
import { activeBait } from '../src/bait';
import { buildingById } from '../src/world';
import type { PromiseData, Voter } from '../src/types';

const pp = (cat: any): PromiseData => ({ id: 'p-'+cat, title: cat, quote: 'q', party: 's', category: cat, msekBase: 1, status: 'aktiv', source: { url: 'u', domain: 'd' } });
const PROMISES = ['välfärd','skatter','övrigt','migration','försvar','infrastruktur'].map(pp);
const mk = (seed = 1) => createGame({ party: 's', promises: PROMISES, seed });

const voter = (over: Partial<Voter> & { id: number }): Voter => ({
  x: 200, y: 120, vx: 1, vy: 0, category: 'välfärd', age: 'adult',
  state: 'wander', variant: 0, ...over,
});

describe('createGame', () => {
  it('starts in playing with full time, no lapp and no event', () => {
    const g = mk();
    expect(g.phase).toBe('playing');
    expect(g.timeLeftMs).toBe(ROUND_MS);
    expect(g.tackle.length).toBe(TACKLE_SIZE);
    expect(g.votes).toBe(0);
    expect(g.lapp).toBeNull();
    expect(g.lastEvent).toBeNull();
  });
  it('never spawns more than MAX_VOTERS', () => {
    const g = mk();
    const stepped = step(g, 10_000);
    expect(stepped.voters.length).toBeLessThanOrEqual(MAX_VOTERS);
  });
});

describe('castLapp', () => {
  it('places the lapp at the clamped position with a cast event', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const s = castLapp(g, -20, 99_999);
    expect(s.lapp).toEqual({ x: 0, y: LOGICAL_H, baitId: bait.id });
    expect(s.lastEvent).toEqual({ kind: 'cast', text: `Kastar: ${bait.title}` });
  });
  it('is a no-op without an active bait', () => {
    const g = mk();
    const wornOut = { ...g, tackle: g.tackle.map((b) => ({ ...b, durability: 0 })) };
    expect(castLapp(wornOut, 100, 100)).toBe(wornOut);
  });
});

describe('angling loop (seeded lapp → toLapp → biting)', () => {
  it('a nearby matching wanderer notices, walks to the lapp and bites', () => {
    const g = mk(7);
    const bait = activeBait(g.tackle)!;
    const withLapp = castLapp(g, 200, 120);
    const g1: GameState = { ...withLapp, voters: [voter({ id: 9, x: 160, y: 120, category: bait.category })] };
    // long dt → notice probability saturates (0.4/s · 5 s = 2.0)
    const s1 = step(g1, 5_000);
    expect(s1.voters.find((v) => v.id === 9)!.state).toBe('toLapp');
    // 34 px/s · 2 s = 68 px ≥ the 40 px gap → arrives and bites
    const s2 = step(s1, 2_000);
    const biter = s2.voters.find((v) => v.id === 9)!;
    expect(biter.state).toBe('biting');
    expect(s2.bitingVoterId).toBe(9);
    // the lapp stays in the biter's hand until resolution
    expect(s2.lapp).not.toBeNull();
    expect(s2.lastEvent).toEqual({ kind: 'napp', text: 'NAPP! Klicka nu!' });
  });
  it('a non-matching wanderer ignores the lapp', () => {
    const g = mk(7);
    const bait = activeBait(g.tackle)!;
    const other = CATEGORIES.find((c) => c !== bait.category)!;
    const withLapp = castLapp(g, 200, 120);
    const g1: GameState = { ...withLapp, voters: [voter({ id: 9, x: 160, y: 120, category: other })] };
    const s = step(g1, 5_000);
    expect(s.voters.find((v) => v.id === 9)!.state).toBe('wander');
  });
});

describe('one biter at a time', () => {
  it('only the first arriving voter bites; later arrivals stay toLapp', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const g2: GameState = {
      ...g,
      lapp: { x: 200, y: 120, baitId: bait.id },
      voters: [1, 2].map((id) => voter({
        id, x: 200, y: 120, category: bait.category,
        state: 'toLapp', attractToX: 200, attractToY: 120,
      })),
    };
    const s = step(g2, 16);
    const biting = s.voters.filter((v) => v.state === 'biting');
    const held = s.voters.filter((v) => v.state === 'toLapp');
    expect(biting).toHaveLength(1);
    expect(held).toHaveLength(1);
    expect(s.bitingVoterId).toBe(biting[0]!.id);
  });
});

describe('recast while voters are en route', () => {
  it('re-aims en-route voters at the live lapp instead of stranding them', () => {
    const g = mk(7);
    const bait = activeBait(g.tackle)!;
    const g1: GameState = {
      ...g,
      lapp: { x: 200, y: 120, baitId: bait.id },
      voters: [voter({ id: 9, x: 160, y: 120, category: bait.category, state: 'toLapp', attractToX: 200, attractToY: 120 })],
    };
    const recast = castLapp(g1, 350, 120); // player recasts elsewhere (same active bait)
    expect(recast.lapp).toEqual({ x: 350, y: 120, baitId: bait.id });
    const s1 = step(recast, 1_000);
    const v1 = s1.voters.find((v) => v.id === 9)!;
    expect(v1.state).toBe('toLapp');
    expect(v1.attractToX).toBe(350);
    expect(v1.attractToY).toBe(120);
    // 34 px/s · 1 s = 34 px toward the NEW lapp — not frozen at stale coordinates
    expect(v1.x).toBeGreaterThan(160);
    expect(v1.x).toBeLessThan(350);
    // no toLapp voter ever stalls: each step closes the distance while en route
    let s = s1;
    for (let i = 0; i < 5; i++) {
      const before = s.voters.find((v) => v.id === 9)!.x;
      s = step(s, 500);
      const after = s.voters.find((v) => v.id === 9)!;
      if (after.state === 'toLapp') expect(after.x).toBeGreaterThan(before);
    }
    // 34 px/s · 10 s = 340 px ≥ the 190 px gap → reaches the live lapp and bites
    const s2 = step(s, 10_000);
    expect(s2.voters.find((v) => v.id === 9)!.state).toBe('biting');
    expect(s2.bitingVoterId).toBe(9);
  });
});

describe('lapp identity (baitId, not the active slot)', () => {
  it('keeps attracting the cast category after the player switches active bait', () => {
    const g = mk(7);
    const bait = activeBait(g.tackle)!; // the cast bait
    const other = g.tackle.find((b) => b.id !== bait.id && b.durability > 0)!;
    const reordered = [other, ...g.tackle.filter((b) => b.id !== other.id)]; // what main.ts onSelectBait does
    const g1: GameState = {
      ...g,
      tackle: reordered,
      lapp: { x: 200, y: 120, baitId: bait.id },
      voters: [
        voter({ id: 1, x: 180, y: 120, category: bait.category }),
        voter({ id: 2, x: 180, y: 121, category: other.category }),
      ],
    };
    // long dt → notice probability saturates for anyone in range
    const s = step(g1, 5_000);
    expect(s.voters.find((v) => v.id === 1)!.state).toBe('toLapp');
    expect(s.voters.find((v) => v.id === 2)!.state).toBe('wander');
  });
  it('a catch wears the cast bait, not the newly active one', () => {
    const g = mk(7);
    const bait = activeBait(g.tackle)!;
    const other = g.tackle.find((b) => b.id !== bait.id && b.durability > 0)!;
    const g2: GameState = {
      ...g,
      tackle: [other, ...g.tackle.filter((b) => b.id !== other.id)],
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 99,
      voters: [voter({ id: 99, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 10_000 })],
    };
    const s = onHookClick(g2, 5_000);
    expect(s.votes).toBe(1);
    expect(s.tackle.find((b) => b.id === bait.id)!.durability).toBe(bait.durability - 1);
    expect(s.tackle.find((b) => b.id === other.id)!.durability).toBe(other.durability);
  });
  it('a lapp whose bait is worn out still attracts, bites and catches — wear no-ops at 0', () => {
    const g = mk(7);
    const bait = activeBait(g.tackle)!;
    const g1: GameState = {
      ...g,
      tackle: g.tackle.map((b) => ({ ...b, durability: 0 })),
      lapp: { x: 200, y: 120, baitId: bait.id },
      voters: [
        voter({ id: 8, x: 180, y: 120, category: bait.category }), // wanderer may still notice
        voter({ id: 9, x: 200, y: 120, category: bait.category, state: 'toLapp', attractToX: 200, attractToY: 120 }),
      ],
    };
    const s1 = step(g1, 5_000); // long dt → notice probability saturates
    expect(s1.voters.find((v) => v.id === 8)!.state).toBe('toLapp'); // worn bait still attracts
    expect(s1.voters.find((v) => v.id === 9)!.state).toBe('biting');
    const s2 = onHookClick(s1, ROUND_MS - s1.timeLeftMs); // within the hook window
    expect(s2.votes).toBe(1);
    expect(s2.tackle.find((b) => b.id === bait.id)!.durability).toBe(0); // nothing further to wear
    expect(s2.lastEvent?.kind).toBe('catch'); // no baitWorn: durability did not drop to 0
  });
});

describe('miss (expired hook window)', () => {
  it('an escaped biter takes the lapp: bait worn, voter gone, lapp null, miss event', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const g2: GameState = {
      ...g,
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 42,
      voters: [voter({ id: 42, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 1_000 })],
    };
    // elapsed after a 10 s step is far past the 1 s deadline → escape/miss
    const s = step(g2, 10_000);
    expect(s.voters.find((v) => v.id === 42)).toBeUndefined();
    expect(s.bitingVoterId).toBeNull();
    expect(s.lapp).toBeNull();
    expect(s.lastEvent).toEqual({ kind: 'miss', text: 'Missad — väljaren tog lappen och gick' });
    expect(activeBait(s.tackle)!.durability).toBe(bait.durability - 1);
  });
  it('wearing out the bait on a miss keeps the miss splash (interaction beats baitWorn)', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const g2: GameState = {
      ...g,
      tackle: g.tackle.map((b) => (b === bait ? { ...b, durability: 1 } : b)),
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 42,
      voters: [voter({ id: 42, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 1_000 })],
    };
    const s = step(g2, 10_000);
    expect(s.tackle.find((b) => b.id === bait.id)!.durability).toBe(0);
    expect(activeBait(s.tackle)!.id).not.toBe(bait.id);
    // the miss splash wins over baitWorn within one step
    expect(s.lastEvent).toEqual({ kind: 'miss', text: 'Missad — väljaren tog lappen och gick' });
    // deterministic skip: the suppressed baitWorn is NOT replayed on a later step
    const s2 = step(s, 500);
    expect(s2.lastEvent).toEqual({ kind: 'miss', text: 'Missad — väljaren tog lappen och gick' });
  });
  it('a miss wears the lapp bait, not the active slot bait', () => {
    const g = mk();
    const lappBait = g.tackle[1]!;
    const active = g.tackle[0]!;
    const g2: GameState = {
      ...g,
      lapp: { x: 100, y: 100, baitId: lappBait.id },
      bitingVoterId: 42,
      voters: [voter({ id: 42, x: 100, y: 100, category: lappBait.category, state: 'biting', biteDeadline: 1_000 })],
    };
    const s = step(g2, 10_000);
    expect(s.tackle.find((b) => b.id === lappBait.id)!.durability).toBe(lappBait.durability - 1);
    expect(s.tackle.find((b) => b.id === active.id)!.durability).toBe(active.durability);
    expect(activeBait(s.tackle)!.id).toBe(active.id); // active slot untouched
    expect(s.lastEvent).toEqual({ kind: 'miss', text: 'Missad — väljaren tog lappen och gick' });
  });
  it('the same miss text wins even when it wears the very last bait', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const g2: GameState = {
      ...g,
      tackle: g.tackle.map((b) => ({ ...b, durability: b === bait ? 1 : 0 })),
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 42,
      voters: [voter({ id: 42, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 1_000 })],
    };
    const s = step(g2, 10_000);
    expect(activeBait(s.tackle)).toBeNull();
    expect(s.lastEvent).toEqual({ kind: 'miss', text: 'Missad — väljaren tog lappen och gick' });
  });
});

describe('hook click', () => {
  it('counts a vote and wears the bait when an adult is hooked in time', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const g2: GameState = {
      ...g,
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 99,
      voters: [voter({ id: 99, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 10_000 })],
    };
    const g3 = onHookClick(g2, 5_000);
    expect(g3.votes).toBe(1);
    expect(g3.voters.find((v) => v.id === 99)).toBeUndefined();
    expect(g3.bitingVoterId).toBeNull();
    expect(g3.lapp).toBeNull();
    expect(g3.lastEvent).toEqual({
      kind: 'catch',
      text: `Fångst: ${bait.title} · kostnad ${bait.msekBase} msek · källa ${bait.sourceDomain} (${bait.sourceUrl})`,
    });
    expect(g3.lastCatch?.released).toBe(false);
    expect(activeBait(g3.tackle)!.durability).toBe(bait.durability - 1);
  });
  it('announces baitWorn (no suffix) when a catch uses up the very last bait', () => {
    const g = mk();
    const bait = g.tackle[0]!;
    const g2: GameState = {
      ...g,
      tackle: g.tackle.map((b) => ({ ...b, durability: b.id === bait.id ? 1 : 0 })),
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 99,
      voters: [voter({ id: 99, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 10_000 })],
    };
    const s = onHookClick(g2, 5_000);
    expect(s.votes).toBe(1);
    expect(s.tackle.find((b) => b.id === bait.id)!.durability).toBe(0);
    expect(activeBait(s.tackle)).toBeNull();
    // the catch itself is still recorded in lastCatch; the wear takes the splash
    expect(s.lastCatch?.title).toBe(bait.title);
    expect(s.lastEvent).toEqual({ kind: 'baitWorn', text: `Betet slut: ${bait.title}` });
  });
  it('announces baitWorn (with suffix) when a catch uses up a bait that has a successor', () => {
    const g = mk();
    const bait = g.tackle[0]!;
    const g2: GameState = {
      ...g,
      tackle: g.tackle.map((b) => (b.id === bait.id ? { ...b, durability: 1 } : b)),
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 99,
      voters: [voter({ id: 99, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 10_000 })],
    };
    const s = onHookClick(g2, 5_000);
    expect(s.tackle.find((b) => b.id === bait.id)!.durability).toBe(0);
    expect(activeBait(s.tackle)!.id).not.toBe(bait.id);
    expect(s.lastEvent).toEqual({ kind: 'baitWorn', text: `Betet slut: ${bait.title} — byter bete` });
  });
  it('releases (no vote) when a minor is hooked', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const g2: GameState = {
      ...g,
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 99,
      voters: [voter({ id: 99, x: 100, y: 100, category: bait.category, age: 'minor', state: 'biting', biteDeadline: 10_000 })],
    };
    const g3 = onHookClick(g2, 5_000);
    expect(g3.votes).toBe(0);
    expect(g3.released).toBe(1);
    expect(g3.lastEvent).toEqual({ kind: 'release', text: 'Släppt tillbaka: saknar rösträtt' });
    expect(g3.lapp).toBeNull();
  });
  it('clicking outside the hook window is the same miss as an escape', () => {
    const g = mk();
    const bait = activeBait(g.tackle)!;
    const g2: GameState = {
      ...g,
      lapp: { x: 100, y: 100, baitId: bait.id },
      bitingVoterId: 99,
      voters: [voter({ id: 99, x: 100, y: 100, category: bait.category, state: 'biting', biteDeadline: 1_000 })],
    };
    const g3 = onHookClick(g2, 5_000);
    expect(g3.votes).toBe(0);
    expect(g3.released).toBe(0);
    expect(g3.voters.find((v) => v.id === 99)).toBeUndefined();
    expect(g3.lapp).toBeNull();
    expect(g3.bitingVoterId).toBeNull();
    expect(g3.lastEvent).toEqual({ kind: 'miss', text: 'Missad — väljaren tog lappen och gick' });
    expect(activeBait(g3.tackle)!.durability).toBe(bait.durability - 1);
  });
});

describe('buildings in step', () => {
  it('a wanderer at a door enters, stays inside, then exits at the door', () => {
    const skolan = buildingById('skolan');
    const g1: GameState = { ...mk(), voters: [voter({ id: 5, x: skolan.doorX, y: skolan.doorY + 4 })] };
    // enter probability saturates (0.15/s · 10 s = 1.5)
    const entered = step(g1, 10_000);
    const v1 = entered.voters.find((v) => v.id === 5)!;
    expect(v1.state).toBe('inside');
    expect(v1.buildingId).toBe('skolan');
    expect(v1.insideUntil).toBeGreaterThan(10_000);
    // still inside before the deadline
    const still = step(entered, 100);
    expect(still.voters.find((v) => v.id === 5)!.state).toBe('inside');
    // elapsed 30_000 > insideUntil (≤ 20_000) → steps out at the door
    const exited = step(entered, 20_000);
    const v2 = exited.voters.find((v) => v.id === 5)!;
    expect(v2.state).toBe('wander');
    expect(v2.x).toBe(skolan.doorX);
    expect(v2.y).toBe(skolan.doorY);
    expect(v2.buildingId).toBeUndefined();
    expect(v2.insideUntil).toBeUndefined();
  });
});

describe('time + game over', () => {
  it('decrements timeLeft and ends at zero', () => {
    const g = mk();
    const s = step(g, ROUND_MS + 1);
    expect(s.phase).toBe('game_over');
    expect(s.timeLeftMs).toBe(0);
  });
});
