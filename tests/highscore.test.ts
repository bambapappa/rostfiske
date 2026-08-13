import { describe, it, expect } from 'vitest';
import { bestOf, addScore } from '../src/highscore';

describe('highscore', () => {
  it('bestOf returns top votes', () => {
    expect(bestOf([{party:'s',votes:3,released:0,at:1},{party:'m',votes:7,released:0,at:2}])).toBe(7);
    expect(bestOf([])).toBe(0);
  });
  it('addScore sorts desc and caps at 10', () => {
    let rows = [] as ReturnType<typeof addScore>;
    for (let i = 0; i < 12; i++) rows = addScore(rows, { party: 's', votes: i, released: 0, at: i });
    expect(rows).toHaveLength(10);
    expect(rows[0]!.votes).toBe(11);
  });
});
