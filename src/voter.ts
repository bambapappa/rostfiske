import type { Rng } from './rng';
import { CATEGORIES, MINOR_PROBABILITY, LOGICAL_W, LOGICAL_H, type Category } from './constants';
import type { Voter, VoterAge, VoterState, FishingSpot } from './types';

export function rollAge(rng: Rng): VoterAge {
  return rng.bool(MINOR_PROBABILITY) ? 'minor' : 'adult';
}

export function chooseCategory(rng: Rng, bias: Partial<Record<Category, number>> = {}): Category {
  const weights = CATEGORIES.map((c) => {
    const w = bias[c];
    return typeof w === 'number' && w > 0 ? w : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < CATEGORIES.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return CATEGORIES[i]!;
  }
  return CATEGORIES[CATEGORIES.length - 1]!;
}

export function matches(baitCategory: Category, voter: { category: Category }): boolean {
  return baitCategory === voter.category;
}

export function spawnVoter(rng: Rng, id: number, spot: FishingSpot, bias: Partial<Record<Category, number>>): Voter {
  const category = chooseCategory(rng, bias);
  const age = rollAge(rng);
  const x = Math.max(0, Math.min(LOGICAL_W, spot.x + (rng.next() * 120 - 60)));
  const y = Math.max(0, Math.min(LOGICAL_H, spot.y + (rng.next() * 80 - 40)));
  const ang = rng.next() * Math.PI * 2;
  const state: VoterState = 'wander';
  return { id, x, y, vx: Math.cos(ang), vy: Math.sin(ang), category, age, state };
}
