import type { Rng } from './rng';
import { BAIT_DURABILITY, TACKLE_SIZE } from './constants';
import type { PromiseData, Bait } from './types';

export function toBait(p: PromiseData): Bait {
  return {
    id: p.id, title: p.title, quote: p.quote,
    category: p.category, party: p.party, msekBase: p.msekBase,
    sourceUrl: p.source.url, sourceDomain: p.source.domain,
    durability: BAIT_DURABILITY, maxDurability: BAIT_DURABILITY,
  };
}

export function wearBait(b: Bait): Bait {
  return { ...b, durability: Math.max(0, b.durability - 1) };
}

export function isWorn(b: Bait): boolean {
  return b.durability <= 0;
}

export function buildTackle(promises: PromiseData[], rng: Rng): Bait[] {
  if (promises.length < TACKLE_SIZE) {
    throw new Error(`need at least ${TACKLE_SIZE} promises, got ${promises.length}`);
  }
  const pool = [...promises];
  // Fisher-Yates partial shuffle
  for (let i = 0; i < TACKLE_SIZE; i++) {
    const j = i + rng.int(pool.length - i);
    const a = pool[i]!, b = pool[j]!;
    pool[i] = b; pool[j] = a;
  }
  return pool.slice(0, TACKLE_SIZE).map(toBait);
}

export function activeBait(tackle: Bait[]): Bait | null {
  return tackle.find((b) => !isWorn(b)) ?? null;
}
