import { makeRng, type Rng } from './rng';
import {
  ROUND_MS, MAX_VOTERS, TACKLE_SIZE, CAST_RADIUS, LOGICAL_W, LOGICAL_H,
  TREND_1_START_MS, TREND_2_START_MS, TREND_DURATION_MS, TREND_ATTRACT_BOOST, TREND_SPEED_BOOST, TREND_HEADLINES,
  PARTY_COLORS, type PartyCode, type Category,
} from './constants';
import { buildTackle, activeBait, baitById, wearBait } from './bait';
import { tryEnter, tryExit, spawnAtBuilding, wanderStep } from './voter';
import { beginBite, hookSucceeds, bittenVoterEscapes, resolveCatch, resolveMiss, moveAttracted, noticeLapp, reachedLapp } from './fishing';
import { spotById, BUILDINGS, buildingById, buildingRects, pushOut } from './world';
import type { PromiseData, Bait, Voter, GamePhase, SpotId, Lapp, GameEvent, Particle, ActiveTrend, CaughtVote } from './types';
import { catchLine, CATEGORY_COLORS } from './ui';

export { PARTY_COLORS };

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
  caughtVotesHistory?: CaughtVote[];
  particles: Particle[];
  nextParticleId: number;
  activeTrend?: ActiveTrend | null;
  trend?: ActiveTrend | null;
  scheduledTrends?: ActiveTrend[];
  roundDurationMs?: number;
}

export interface CreateGameOpts {
  party: PartyCode;
  promises: PromiseData[];
  seed?: number;
  spotId?: SpotId;
  roundDurationMs?: number;
}

export function buildTrendSchedule(rng: Rng, partyPromises: PromiseData[] = []): ActiveTrend[] {
  const ISSUE_CATEGORIES: Category[] = [
    'välfärd', 'utbildning', 'skatter', 'klimat-miljö',
    'rättsväsende', 'migration', 'infrastruktur', 'försvar',
  ];
  const promiseCats = Array.from(
    new Set(partyPromises.map((p) => p.category).filter((c): c is Category => c !== 'övrigt'))
  );
  const pool = promiseCats.length >= 2 ? promiseCats : ISSUE_CATEGORIES;
  const cat1 = rng.pick(pool);
  const cat2Pool = pool.filter((c) => c !== cat1);
  const cat2 = cat2Pool.length > 0 ? rng.pick(cat2Pool) : rng.pick(ISSUE_CATEGORIES.filter((c) => c !== cat1));

  return [
    {
      category: cat1,
      headline: TREND_HEADLINES[cat1] ?? `EXTRA: ${cat1} i fokus!`,
      startsAtMs: TREND_1_START_MS,
      expiresAtMs: TREND_1_START_MS + TREND_DURATION_MS,
      color: CATEGORY_COLORS[cat1] ?? '#ffe66d',
    },
    {
      category: cat2,
      headline: TREND_HEADLINES[cat2] ?? `EXTRA: ${cat2} i fokus!`,
      startsAtMs: TREND_2_START_MS,
      expiresAtMs: TREND_2_START_MS + TREND_DURATION_MS,
      color: CATEGORY_COLORS[cat2] ?? '#ffe66d',
    },
  ];
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
  const scheduledTrends = buildTrendSchedule(rng, partyPromises);
  return {
    phase: 'playing', party: opts.party, tackle, voters: [],
    spotId, spotX: spot.x, spotY: spot.y,
    timeLeftMs: opts.roundDurationMs ?? ROUND_MS, votes: 0, released: 0, rng, nextVoterId: 1, spawnAccMs: 0,
    bitingVoterId: null, lapp: null, lastEvent: null, lastCatch: null,
    caughtVotesHistory: [],
    particles: [], nextParticleId: 1,
    scheduledTrends,
    activeTrend: null,
    trend: null,
    roundDurationMs: opts.roundDurationMs,
  };
}

/** Cast the note (lapp) carrying the active bait. Clamped to CAST_RADIUS from politician,
 *  then to screen bounds. Without an active bait the state is returned unchanged. Pure. */
export function castLapp(state: GameState, x: number, y: number): GameState {
  if (state.phase !== 'playing') return state;
  const bait = activeBait(state.tackle);
  if (!bait) return state;

  // v1.2: cast radius — clamp distance from politician to CAST_RADIUS
  const dx = x - state.spotX;
  const dy = y - state.spotY;
  const dist = Math.hypot(dx, dy);
  let cx: number, cy: number;
  if (dist > CAST_RADIUS) {
    // Scale toward politician so distance = exactly CAST_RADIUS
    const scale = CAST_RADIUS / dist;
    cx = state.spotX + dx * scale;
    cy = state.spotY + dy * scale;
  } else {
    cx = x;
    cy = y;
  }

  // Existing screen clamp
  cx = Math.max(0, Math.min(LOGICAL_W, cx));
  cy = Math.max(0, Math.min(LOGICAL_H, cy));

  // v1.2: a lapp cannot land inside a building footprint — push it out to the
  // nearest rect edge. NOTE: push-out runs AFTER the radius+screen clamps, so
  // a footprint-edge landing may sit slightly outside CAST_RADIUS (accepted
  // trade-off: keeping the lapp out of walls matters more than an exact radius).
  const pushed = pushOut(cx, cy, buildingRects());
  cx = pushed.x;
  cy = pushed.y;

  return {
    ...state,
    lapp: {
      x: cx,
      y: cy,
      baitId: bait.id,
      startX: state.spotX,
      startY: state.spotY - 10,
      flightProgress: 0,
      flightDurationMs: 250,
    },
    particles: [
      ...(state.particles ?? []),
      {
        id: state.nextParticleId ?? 1,
        x: cx,
        y: cy,
        text: '',
        color: 'rgba(255, 255, 255, 0.7)',
        lifeMs: 0,
        maxLifeMs: 500,
        kind: 'ripple',
        radius: 2,
        maxRadius: 18,
      },
    ],
    nextParticleId: (state.nextParticleId ?? 1) + 1,
    lastEvent: { kind: 'cast', text: `Kastar: ${bait.title}` },
  };
}

/** Change the politician's active fishing spot. Moving to a new spot reels in any
 *  active cast (lapp: null) and resets biting state so the player must cast anew from the new spot. */
export function changeSpot(state: GameState, spotId: SpotId): GameState {
  if (state.spotId === spotId) return state;
  const spot = spotById(spotId);
  // Any attracted or biting voter reverts to wander since the bait is reeled in
  const voters = state.voters.map((v) => {
    if (v.state === 'toLapp' || v.state === 'biting') {
      return { ...v, state: 'wander' as const, attractToX: undefined, attractToY: undefined, biteDeadline: undefined };
    }
    return v;
  });
  return {
    ...state,
    spotId,
    spotX: spot.x,
    spotY: spot.y,
    lapp: null,
    bitingVoterId: null,
    voters,
  };
}

export function step(state: GameState, dtMs: number): GameState {
  if (state.phase !== 'playing') return state;
  const timeLeftMs = Math.max(0, state.timeLeftMs - dtMs);
  if (timeLeftMs === 0) return { ...state, timeLeftMs: 0, phase: 'game_over' };

  const totalDuration = state.roundDurationMs ?? ROUND_MS;
  const elapsed = totalDuration - timeLeftMs; // game clock for hook deadlines & trends

  // Trends: determine active trend from schedule
  let scheduledTrends = state.scheduledTrends;
  if (!scheduledTrends || scheduledTrends.length === 0) {
    if (state.activeTrend) {
      scheduledTrends = [state.activeTrend];
    } else {
      scheduledTrends = buildTrendSchedule(state.rng, []);
    }
  }

  const currentActiveTrend = scheduledTrends.find(
    (t) => elapsed >= t.startsAtMs && elapsed < t.expiresAtMs
  ) ?? null;

  let lastEvent = state.lastEvent;
  const prevTrendCategory = state.activeTrend?.category ?? state.trend?.category;
  if (currentActiveTrend && currentActiveTrend.category !== prevTrendCategory) {
    lastEvent = { kind: 'trend', text: currentActiveTrend.headline };
  }

  // advance cast trajectory flight progress
  let lapp = state.lapp;
  if (lapp && lapp.flightProgress !== undefined && lapp.flightProgress < 1) {
    const dur = lapp.flightDurationMs ?? 250;
    const nextP = Math.min(1, lapp.flightProgress + dtMs / dur);
    lapp = { ...lapp, flightProgress: nextP };
  }

  // advance particles lifetimes & physics
  const particles = (state.particles ?? [])
    .map((p) => {
      const lifeMs = p.lifeMs + dtMs;
      if (p.kind === 'float_text') {
        return {
          ...p,
          lifeMs,
          y: p.y - (30 * dtMs) / 1000,
        };
      } else if (p.kind === 'ripple') {
        const progress = Math.min(1, lifeMs / p.maxLifeMs);
        const startR = p.radius ?? 2;
        const maxR = p.maxRadius ?? 18;
        return {
          ...p,
          lifeMs,
          radius: startR + (maxR - startR) * progress,
        };
      }
      return { ...p, lifeMs };
    })
    .filter((p) => p.lifeMs < p.maxLifeMs);

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
      // KNOWN-NOTES: toLapp movement intentionally ignores building footprints
      // (unlike wanderStep): lapp targets are always outside footprints (see
      // castLapp's push-out), and blocking an attracted voter en-route could
      // strand it against a wall — a sanctioned deviation from the README's
      // blanket "väljare går ej genom hus" claim.
      if (!lapp) {
        return { ...v, state: 'wander' as const, attractToX: undefined, attractToY: undefined };
      }
      // re-aim at the live lapp every step: a recast elsewhere must re-route
      // en-route voters instead of stranding them at stale coordinates
      const lappBait = baitById(state.tackle, lapp.baitId);
      const isTrendMatch = currentActiveTrend !== null && lappBait !== undefined && currentActiveTrend.category === lappBait.category;
      const speedMult = isTrendMatch ? TREND_SPEED_BOOST : 1;
      const moved = moveAttracted({ ...v, attractToX: lapp.x, attractToY: lapp.y }, dtMs, speedMult);
      if (reachedLapp(moved, lapp) && bitingVoterId === null) {
        const biter = beginBite(moved, elapsed);
        bitingVoterId = biter.id;
        lastEvent = { kind: 'napp', text: 'NAPP! Klicka nu!' };
        return biter;
      }
      return moved;
    }
    // wander: notice the lapp → head for a door → natural wandering
    if (lapp) {
      // the lapp attracts by its OWN cast bait (baitId), never by the active slot
      const lappBait = baitById(state.tackle, lapp.baitId);
      if (lappBait) {
        const isTrendMatch = currentActiveTrend !== null && currentActiveTrend.category === lappBait.category;
        const multiplier = isTrendMatch ? TREND_ATTRACT_BOOST : 1;
        const noticed = noticeLapp(v, lapp, lappBait.category, rng, dtMs, multiplier);
        if (noticed.state !== 'wander') return noticed;
      }
    }
    const door = BUILDINGS.find((b) => Math.hypot(v.x - b.doorX, v.y - b.doorY) < 24);
    if (door) {
      const entered = tryEnter(v, door, rng, dtMs, elapsed);
      if (entered.state !== 'wander') return entered;
    }
    // v1.2: per-voter speed, gradual turns, idle pauses, soft edge turns,
    // building collision (door zones excepted) — all inside wanderStep
    return wanderStep(v, dtMs, elapsed, rng, BUILDINGS);
  });

  let tackle = state.tackle;
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

  return {
    ...state,
    timeLeftMs,
    voters,
    rng,
    nextVoterId,
    spawnAccMs,
    bitingVoterId,
    lapp,
    lastEvent,
    tackle,
    particles,
    scheduledTrends,
    activeTrend: currentActiveTrend,
    trend: currentActiveTrend,
  };
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

    let nextParticleId = state.nextParticleId ?? 1;
    const particles = [...(state.particles ?? [])];
    if (res.released) {
      particles.push({
        id: nextParticleId++,
        x: v.x,
        y: v.y - 12,
        text: 'Saknar rösträtt',
        color: '#aaaaaa',
        lifeMs: 0,
        maxLifeMs: 1200,
        kind: 'float_text',
      });
    } else {
      particles.push({
        id: nextParticleId++,
        x: v.x,
        y: v.y - 12,
        text: '+1',
        color: PARTY_COLORS[state.party] ?? '#ffd700',
        lifeMs: 0,
        maxLifeMs: 1000,
        kind: 'float_text',
      });
    }

    const caughtVotesHistory = res.released
      ? (state.caughtVotesHistory ?? [])
      : [...(state.caughtVotesHistory ?? []), { category: bait.category, title: bait.title, party: state.party }];

    return {
      ...state, voters, tackle,
      votes: state.votes + res.votes,
      released: state.released + (res.released ? 1 : 0),
      bitingVoterId: null, lapp: null, lastCatch,
      lastEvent,
      caughtVotesHistory,
      particles,
      nextParticleId,
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
