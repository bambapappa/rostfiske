import { describe, it, expect } from 'vitest';
import { validatePromises, validateParties, promisesForParty } from '../src/api';

const rawPromise = {
  id: 'p-1', title: 'Mer välfärd', quote: 'vi lovar välfärd',
  parties: ['s'], category: 'välfärd', status: 'aktiv',
  cost: { msek_base: 1200 },
  source: { url: 'https://s.se', domain: 's.se' },
};
const rawPromiseCoerced = { id: 'x', title: '', parties: ['doesnotexist'], category: 'nope', status: 'aktiv', cost: {}, source: {} };

describe('validatePromises', () => {
  it('keeps aktiv promises, coerces unknown party/category, and defaults missing cost to 0', () => {
    const out = validatePromises({ data: [rawPromise, rawPromiseCoerced] });
    expect(out).toHaveLength(2);
    const p = out[0]!;
    expect(p.party).toBe('s');
    expect(p.category).toBe('välfärd');
    expect(p.msekBase).toBe(1200);
    expect(p.source.domain).toBe('s.se');
    const c = out[1]!;
    expect(c.party).toBe('s');        // unknown party coerced to 's'
    expect(c.category).toBe('övrigt'); // unknown category coerced to 'övrigt'
    expect(c.msekBase).toBe(0);        // missing cost defaults to 0
  });
  it('drops non-aktiv promises', () => {
    const out = validatePromises({ data: [{ ...rawPromise, status: 'borttagen' }] });
    expect(out).toHaveLength(0);
  });
});

describe('validateParties', () => {
  it('keeps known parties and fills defaults', () => {
    const out = validateParties({ data: [{ code: 's', name: 'S', color: '#E8112d' }] });
    expect(out[0]!.name).toBe('S');
    expect(out[0]!.colorText).toBeTruthy();
    expect(out[0]!.block).toBeTruthy();
  });
});

describe('promisesForParty', () => {
  it('filters by party', () => {
    const ps = validatePromises({ data: [rawPromise, { ...rawPromise, id: 'p-2', parties: ['m'] }] });
    expect(promisesForParty(ps, 's')).toHaveLength(1);
  });
});
