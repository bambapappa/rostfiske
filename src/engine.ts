import { makeRng, type Rng } from './rng';
import { ROUND_MS, MAX_VOTERS, TACKLE_SIZE, VOTER_SPEED, LOGICAL_W, LOGICAL_H, type PartyCode } from './constants';
import { buildTackle, activeBait, wearBait, isWorn } from './bait';
import { matches, spawnVoter } from './voter';
import { beginBite, hookSucceeds, bittenVoterEscapes, resolveCatch, moveAttracted } from './fishing';
import { spotById } from './world';
import type { PromiseData, Bait, Voter, GamePhase, SpotId } from './types';

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
    bitingVoterId: null, lastCatch: null,
  };
}

export function step(state: GameState, dtMs: number): GameState {
  if (state.phase !== 'playing') return state;
  const timeLeftMs = Math.max(0, state.timeLeftMs - dtMs);
  if (timeLeftMs === 0) return { ...state, timeLeftMs: 0, phase: 'game_over' };

  const elapsed = ROUND_MS - timeLeftMs; // game clock for hook deadlines
  const bait = activeBait(state.tackle);

  // spawn
  let { rng, nextVoterId, spawnAccMs, voters } = state;
  spawnAccMs += dtMs;
  const SPAWN_INTERVAL = 700;
  while (voters.length < MAX_VOTERS && spawnAccMs >= SPAWN_INTERVAL) {
    spawnAccMs -= SPAWN_INTERVAL;
    voters = [...voters, spawnVoter(rng, nextVoterId++, spotById(state.spotId), spotById(state.spotId).bias)];
  }

  // update voters
  let bitingVoterId = state.bitingVoterId;
  voters = voters.map((v) => {
    if (v.state === 'biting') {
      if (bittenVoterEscapes(v, elapsed)) {
        // escaped → return to wandering (clear stale id so later biters can register)
        if (bitingVoterId === v.id) bitingVoterId = null;
        return { ...v, state: 'wander' as const, biteDeadline: undefined };
      }
      return v;
    }
    if (bait && v.attractToX !== undefined && v.attractToY !== undefined) {
      // moving toward rod
      const moved = moveAttracted(v, dtMs);
      const arrived = Math.hypot(moved.x - state.spotX, moved.y - state.spotY) < 6;
      if (arrived) {
        const b = beginBite(moved, elapsed);
        if (bitingVoterId === null) bitingVoterId = b.id;
        return b;
      }
      return moved;
    }
    if (bait && matches(bait.category, v)) {
      // begin attraction toward the rod
      return { ...v, state: 'attracted', attractToX: state.spotX, attractToY: state.spotY };
    }
    // wander
    const nx = v.x + (v.vx * VOTER_SPEED * dtMs) / 1000;
    const ny = v.y + (v.vy * VOTER_SPEED * dtMs) / 1000;
    if (nx < 0 || nx > LOGICAL_W) return { ...v, vx: -v.vx };
    if (ny < 0 || ny > LOGICAL_H) return { ...v, vy: -v.vy };
    return { ...v, x: nx, y: ny };
  });

  return { ...state, timeLeftMs, voters, rng, nextVoterId, spawnAccMs, bitingVoterId };
}

export function cast(state: GameState): GameState {
  // attraction is assigned in step() when a matching voter wanders; cast is a
  // no-op marker hook for input/animation. Kept for API symmetry and future use.
  return state;
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
  const bait = activeBait(state.tackle);
  let tackle = state.tackle;
  let votes = state.votes;
  let released = state.released;
  let lastCatch = state.lastCatch;
  if (hookSucceeds(v, nowMs) && bait) {
    const res = resolveCatch(v);
    votes += res.votes;
    if (res.released) released += 1;
    tackle = tackle.map((b) => (b === bait ? wearBait(b) : b));
    lastCatch = { title: bait.title, msekBase: bait.msekBase, sourceUrl: bait.sourceUrl, sourceDomain: bait.sourceDomain, released: res.released };
  }
  const voters = state.voters.filter((x) => x.id !== v.id);
  return { ...state, voters, tackle, votes, released, bitingVoterId: null, lastCatch };
}

// re-export for tests/consumers
export { isWorn };
