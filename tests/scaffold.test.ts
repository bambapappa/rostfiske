import { describe, it, expect } from 'vitest';
import { PARTIES, CATEGORIES, ROUND_MS, HOOK_WINDOW_MS, BAIT_DURABILITY, TACKLE_SIZE, MINOR_PROBABILITY } from '../src/constants';

describe('scaffold constants', () => {
  it('has exactly 8 parties', () => expect(PARTIES).toHaveLength(8));
  it('has exactly 9 categories', () => expect(CATEGORIES).toHaveLength(9));
  it('exposes decided balance values', () => {
    expect(ROUND_MS).toBe(180_000);
    expect(HOOK_WINDOW_MS).toBe(650);
    expect(BAIT_DURABILITY).toBe(6);
    expect(TACKLE_SIZE).toBe(5);
    expect(MINOR_PROBABILITY).toBe(0.15);
  });
});
