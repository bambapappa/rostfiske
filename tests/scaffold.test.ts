import { describe, it, expect } from 'vitest';
import {
  PARTIES, CATEGORIES, ROUND_MS, HOOK_WINDOW_MS, BAIT_DURABILITY, TACKLE_SIZE, MINOR_PROBABILITY,
  LOGICAL_W, LOGICAL_H, TOWN_COLS, TOWN_ROWS, NOTICE_RADIUS, NOTICE_PROB_PER_SEC, PICKUP_DIST,
  INSIDE_MIN_MS, INSIDE_MAX_MS, ENTER_PROB_PER_SEC, VOTER_VARIANTS,
} from '../src/constants';

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
  it('exposes v1.1 angling, building and town values', () => {
    expect(LOGICAL_W).toBe(384);
    expect(LOGICAL_H).toBe(208);
    expect(TOWN_COLS).toBe(24);
    expect(TOWN_ROWS).toBe(13);
    expect(NOTICE_RADIUS).toBe(80);
    expect(NOTICE_PROB_PER_SEC).toBe(0.4);
    expect(PICKUP_DIST).toBe(4);
    expect(INSIDE_MIN_MS).toBe(3000);
    expect(INSIDE_MAX_MS).toBe(10000);
    expect(ENTER_PROB_PER_SEC).toBe(0.15);
    expect(VOTER_VARIANTS).toBe(12);
  });
  it('logical size is an integer tile grid (16 px tiles)', () => {
    expect(LOGICAL_W % 16).toBe(0);
    expect(LOGICAL_H % 16).toBe(0);
    expect(LOGICAL_W / 16).toBe(TOWN_COLS);
    expect(LOGICAL_H / 16).toBe(TOWN_ROWS);
  });
});
