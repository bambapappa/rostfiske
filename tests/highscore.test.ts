import { describe, it, expect } from 'vitest';
import {
  bestOf,
  addScore,
  bestByParty,
  calculateMandates,
  calculateIssueBreakdown,
  type ScoreRow,
} from '../src/highscore';
import { PARTIES } from '../src/constants';

describe('highscore', () => {
  it('bestOf returns top votes', () => {
    expect(bestOf([{ party: 's', votes: 3, released: 0, at: 1 }, { party: 'm', votes: 7, released: 0, at: 2 }])).toBe(7);
    expect(bestOf([])).toBe(0);
  });

  it('addScore sorts desc and caps at 10', () => {
    let rows: ScoreRow[] = [];
    for (let i = 0; i < 12; i++) rows = addScore(rows, { party: 's', votes: i, released: 0, at: i });
    expect(rows).toHaveLength(10);
    expect(rows[0]!.votes).toBe(11);
  });
});

describe('bestByParty', () => {
  it('initializes all 8 parties to 0 when no rows exist', () => {
    const scores = bestByParty([]);
    for (const p of PARTIES) {
      expect(scores[p]).toBe(0);
    }
  });

  it('calculates personal best votes per party across all 8 parties', () => {
    const rows: ScoreRow[] = [
      { party: 's', votes: 5, released: 1, at: 100 },
      { party: 's', votes: 12, released: 0, at: 200 },
      { party: 'm', votes: 8, released: 2, at: 300 },
      { party: 'sd', votes: 15, released: 0, at: 400 },
      { party: 'c', votes: 4, released: 1, at: 500 },
      { party: 'v', votes: 9, released: 3, at: 600 },
      { party: 'kd', votes: 6, released: 0, at: 700 },
      { party: 'l', votes: 3, released: 1, at: 800 },
      { party: 'mp', votes: 7, released: 2, at: 900 },
    ];
    const res = bestByParty(rows);
    expect(res).toEqual({
      s: 12,
      m: 8,
      sd: 15,
      c: 4,
      v: 9,
      kd: 6,
      l: 3,
      mp: 7,
    });
  });
});

describe('calculateMandates', () => {
  it('calculates mandates and threshold status for key vote levels (0, 3, 4, 7, 8, 14, 15, 30)', () => {
    // 0 votes -> 0 mandates (Under 4%-spärren)
    expect(calculateMandates(0)).toEqual({
      mandates: 0,
      statusText: 'Under 4%-spärren',
      passedThreshold: false,
    });

    // 3 votes -> 0 mandates (Under 4%-spärren)
    expect(calculateMandates(3)).toEqual({
      mandates: 0,
      statusText: 'Under 4%-spärren',
      passedThreshold: false,
    });

    // 4 votes -> 15 + (4-4)*4 = 15 mandates (Över riksdagsspärren)
    expect(calculateMandates(4)).toEqual({
      mandates: 15,
      statusText: 'Över riksdagsspärren',
      passedThreshold: true,
    });

    // 7 votes -> 15 + (7-4)*4 = 27 mandates (Över riksdagsspärren)
    expect(calculateMandates(7)).toEqual({
      mandates: 27,
      statusText: 'Över riksdagsspärren',
      passedThreshold: true,
    });

    // 8 votes -> 35 + (8-8)*5 = 35 mandates (Starkt valresultat)
    expect(calculateMandates(8)).toEqual({
      mandates: 35,
      statusText: 'Starkt valresultat',
      passedThreshold: true,
    });

    // 14 votes -> 35 + (14-8)*5 = 65 mandates (Starkt valresultat)
    expect(calculateMandates(14)).toEqual({
      mandates: 65,
      statusText: 'Starkt valresultat',
      passedThreshold: true,
    });

    // 15 votes -> 75 + (15-15)*6 = 75 mandates (Valsensation)
    expect(calculateMandates(15)).toEqual({
      mandates: 75,
      statusText: 'Valsensation',
      passedThreshold: true,
    });

    // 30 votes -> 75 + (30-15)*6 = 165 mandates (Valsensation)
    expect(calculateMandates(30)).toEqual({
      mandates: 165,
      statusText: 'Valsensation',
      passedThreshold: true,
    });
  });

  it('caps mandates at 349 (Riksdagens maxstorlek)', () => {
    expect(calculateMandates(100).mandates).toBe(349);
    expect(calculateMandates(100).statusText).toBe('Valsensation');
    expect(calculateMandates(100).passedThreshold).toBe(true);
  });
});

describe('calculateIssueBreakdown', () => {
  it('returns empty array when history is empty', () => {
    expect(calculateIssueBreakdown([])).toEqual([]);
  });

  it('calculates single category count and 100 percentage', () => {
    const breakdown = calculateIssueBreakdown([{ category: 'välfärd' }]);
    expect(breakdown).toEqual([
      { category: 'välfärd', count: 1, percentage: 100 },
    ]);
  });

  it('calculates counts and rounded percentages for multiple categories sorted by count desc', () => {
    const history = [
      { category: 'välfärd' as const },
      { category: 'välfärd' as const },
      { category: 'utbildning' as const },
      { category: 'skatter' as const },
    ];
    const res = calculateIssueBreakdown(history);
    expect(res).toHaveLength(3);
    expect(res[0]).toEqual({ category: 'välfärd', count: 2, percentage: 50 });
    expect(res[1]!.count).toBe(1);
    expect(res[1]!.percentage).toBe(25);
    expect(res[2]!.count).toBe(1);
    expect(res[2]!.percentage).toBe(25);
  });
});
