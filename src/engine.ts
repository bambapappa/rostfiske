import { makeRng, type Rng } from './rng';
import { ROUND_MS, MAX_VOTERS, TACKLE_SIZE, VOTER_SPEED, LOGICAL_W, LOGICAL_H, type PartyCode } from './constants';
import { buildTackle, activeBait, baitById, wearBait } from './bait';
import { tryEnter, tryExit, spawnAtBuilding } from './voter';
import { beginBite, hookSucceeds, bittenVoterEscapes, resolveCatch, resolveMiss, moveAttracted, noticeLapp, reachedLapp } from './fishing';
import { spotById, BUILDINGS, buildingById } from './world';
import type { PromiseData, Bait, Voter, GamePhase, SpotId, Lapp, GameEvent } from './types';
import { catchLine } from './ui';

export interface GameState {
  phase: GamePhase;
  party: PartyCode;
  tackle: Bait[];
  voters: Voter[];
  spotId: SpotId;
  spotX: number;
  spotY: number;
  timeLeftMs: number;
  votes: number;
  released: number;
  rng: Rng;
  nextVoterId: number;
  spawnAccMs: number;
  bitingVoterId: number | null;
  lapp: Lapp | null;
  lastEvent: GameEvent | null;
  lastCatch: { title: string; msekBase: number; sourceUrl: string; sourceDomain: string; released: boolean } | null;
}

export interface CreateGameOpts {
  party: PartyCode;
  promises: PromiseData[];
  seed?: number;
  spotId?: SpotId;
}

export function createGame(opts: CreateGameOpts): GameState {
  const rng = makeRng(opts.seed ?? Math.floor(Math.random() * 1e9));
  const partyPromises = opts.promises.filter((p) => p.party === opts.party);
  if (partyPromises.length < TACKLE_SIZE) {
    throw new Error(`party ${opts.party} has too few promises (${partyPromises.length})`);
  }
  const tackle = buildTackle(partyPromises, rng);
  const spotId = opts.spotId ?? 'torget';
  const spot = spotById(spotId);
  return {
    phase: 'playing', party: opts.party, tackle, voters: [],
    spotId, spotX: spot.x, spotY: spot.y,
    timeLeftMs: ROUND_MS, votes: 0, released: 0, rng, nextVoterId: 1, spawnAccMs: 0,
    bitingVoterId: null, lapp: null, lastEvent: null, lastCatch: null,
  };
}

/** Cast the note (lapp) carrying the active bait. Clamped to the water bounds.
 *  Without an active bait the state is returned unchanged. Pure. */
export function castLapp(state: GameState, x: number, y: number): GameState {
  if (state.phase !== 'playing') return state;
  const bait = activeBait(state.tackle);
  if (!bait) return state;
  const cx = Math.max(0, Math.min(LOGICAL_W, x));
  const cy = Math.max(0, Math.min(LOGICAL_H, y));
  return {
    ...state,
    lapp: { x: cx, y: cy, baitId: bait.id },
    lastEvent: { kind: 'cast', text: `Kastar: ${bait.title}` },
  };
}

export function step(state: GameState, dtMs: number): GameState {
  if (state.phase !== 'playing') return state;
  const timeLeftMs = Math.max(0, state.timeLeftMs - dtMs);
  if (timeLeftMs === 0) return { ...state, timeLeftMs: 0, phase: 'game_over' };

  const elapsed = ROUND_MS - timeLeftMs; // game clock for hook deadlines

  // spawn at a random building's door, capped at MAX_VOTERS (inside voters count)
  let { rng, nextVoterId, spawnAccMs, voters } = state;
  spawnAccMs += dtMs;
  const SPAWN_INTERVAL = 700;
  while (voters.length < MAX_VOTERS && spawnAccMs >= SPAWN_INTERVAL) {
    spawnAccMs -= SPAWN_INTERVAL;
    const b = rng.pick(BUILDINGS);
    voters = [...voters, spawnAtBuilding(rng, nextVoterId++, b, elapsed)];
  }

  let bitingVoterId = state.bitingVoterId;
  let lastEvent = state.lastEvent;
  const missedIds: number[] = [];

  voters = voters.map((v) => {
    if (v.state === 'inside') {
      if (!v.buildingId) return v;
      return tryExit(v, buildingById(v.buildingId), rng, elapsed);
    }
    if (v.state === 'biting') {
      if (bittenVoterEscapes(v, elapsed)) {
        // escape IS the miss: resolved after the map (voter leaves with the lapp)
        missedIds.push(v.id);
      }
      return v;
    }
    if (v.state === 'toLapp') {
      const lapp = state.lapp;
      if (!lapp) {
        return { ...v, state: 'wander' as const, attractToX: undefined, attractToY: undefined };
      }
      // re-aim at the live lapp every step: a recast elsewhere must re-route
      // en-route voters instead of stranding them at stale coordinates
      const moved = moveAttracted({ ...v, attractToX: lapp.x, attractToY: lapp.y }, dtMs);
      if (reachedLapp(moved, lapp) && bitingVoterId === null) {
        const biter = beginBite(moved, elapsed);
        bitingVoterId = biter.id;
        lastEvent = { kind: 'napp', text: 'NAPP! Klicka nu!' };
        return biter;
      }
      return moved;
    }
    // wander: notice the lapp → head for a door → plain bounce-walk
    const lapp = state.lapp;
    if (lapp) {
      // the lapp attracts by its OWN cast bait (baitId), never by the active slot
      const lappBait = baitById(state.tackle, lapp.baitId);
      if (lappBait) {
        const noticed = noticeLapp(v, lapp, lappBait.category, rng, dtMs);
        if (noticed.state !== 'wander') return noticed;
      }
    }
    const door = BUILDINGS.find((b) => Math.hypot(v.x - b.doorX, v.y - b.doorY) < 24);
    if (door) {
      const entered = tryEnter(v, door, rng, dtMs, elapsed);
      if (entered.state !== 'wander') return entered;
    }
    const nx = v.x + (v.vx * VOTER_SPEED * dtMs) / 1000;
    const ny = v.y + (v.vy * VOTER_SPEED * dtMs) / 1000;
    if (nx < 0 || nx > LOGICAL_W) return { ...v, vx: -v.vx };
    if (ny < 0 || ny > LOGICAL_H) return { ...v, vy: -v.vy };
    return { ...v, x: nx, y: ny };
  });

  let tackle = state.tackle;
  let lapp = state.lapp;
  if (missedIds.length > 0) {
    // the biter took the lapp: wear the LAPP'S bait (resolveMiss no-ops at 0
    // durability), remove the voter, clear the angling state
    const lappBait = lapp ? baitById(tackle, lapp.baitId) : undefined;
    if (lappBait) tackle = tackle.map((b) => (b.id === lappBait.id ? resolveMiss(lappBait).bait : b));
    voters = voters.filter((v) => !missedIds.includes(v.id));
    lapp = null;
    bitingVoterId = null;
    // interaction events (napp/miss) always win over baitWorn within one step,
    // so a wear caused by this miss is NOT announced here — deterministically
    // skipped (the next cast announces the next bait instead)
    lastEvent = { kind: 'miss', text: 'Missad — väljaren tog lappen och gick' };
  }

  return { ...state, timeLeftMs, voters, rng, nextVoterId, spawnAccMs, bitingVoterId, lapp, lastEvent, tackle };
}

export function onHookClick(state: GameState, nowMs: number): GameState {
  if (state.phase !== 'playing') return state;
  // Resolve the active biting voter: prefer the tracked id, but fall back to
  // scanning the pool so synthetic/injected states (e.g. tests, replays) still
  // resolve correctly when bitingVoterId was not set.
  const targetId = state.bitingVoterId ?? state.voters.find((v) => v.state === 'biting')?.id ?? null;
  if (targetId === null) return state;
  const idx = state.voters.findIndex((v) => v.id === targetId);
  if (idx === -1) return { ...state, bitingVoterId: null };
  const v = state.voters[idx]!;
  // the cast promise IS the lapp's identity: resolve the bait via the lapp, not
  // via the active slot (falls back to the active bait for lapp-less states)
  const bait = (state.lapp ? baitById(state.tackle, state.lapp.baitId) : undefined) ?? activeBait(state.tackle);
  const voters = state.voters.filter((x) => x.id !== v.id);
  if (v.state === 'biting' && hookSucceeds(v, nowMs) && bait) {
    const res = resolveCatch(v);
    const wornBait = wearBait(bait); // no-ops at 0 durability
    const tackle = state.tackle.map((b) => (b.id === bait.id ? wornBait : b));
    const lastCatch = { title: bait.title, msekBase: bait.msekBase, sourceUrl: bait.sourceUrl, sourceDomain: bait.sourceDomain, released: res.released };
    // a catch that uses up the bait's last durability announces the wear (with
    // the byter-bete suffix when a successor exists, without it on the last bait);
    // otherwise the catch/release splash keeps the stage
    const usedUp = bait.durability > 0 && wornBait.durability === 0;
    const lastEvent: GameEvent = usedUp
      ? { kind: 'baitWorn', text: activeBait(tackle) ? `Betet slut: ${bait.title} — byter bete` : `Betet slut: ${bait.title}` }
      : { kind: res.released ? 'release' : 'catch', text: catchLine(lastCatch) };
    return {
      ...state, voters, tackle,
      votes: state.votes + res.votes,
      released: state.released + (res.released ? 1 : 0),
      bitingVoterId: null, lapp: null, lastCatch,
      lastEvent,
    };
  }
  // biting but outside the hook window → the same miss as an escaped biter
  // (interaction events win over baitWorn, so a wear here is never announced)
  let tackle = state.tackle;
  if (bait) tackle = tackle.map((b) => (b.id === bait.id ? resolveMiss(bait).bait : b));
  return {
    ...state, voters, tackle,
    bitingVoterId: null, lapp: null,
    lastEvent: { kind: 'miss', text: 'Missad — väljaren tog lappen och gick' },
  };
}
