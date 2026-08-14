import { describe, it, expect } from 'vitest';
import { validatePromises, validateParties, promisesForParty } from '../src/api';

const rawPromise = {
  id: 'p-1', title: 'Mer välfärd', quote: 'vi lovar välfärd',
  parties: ['s'], category: 'välfärd', status: 'aktiv',
  cost: { msek_base: 1200 },
  source: { url: 'https://s.se', domain: 's.se' },
};
const rawUnknownParty = { id: 'x', title: '', parties: ['doesnotexist'], category: 'nope', status: 'aktiv', cost: {}, source: {} };
const rawUnknownCategory = { id: 'y', title: '', parties: ['m'], category: 'nope', status: 'aktiv', cost: {}, source: {} };

describe('validatePromises', () => {
  it('drops aktiv promises with unknown parties (neutrality: no coercion to a party)', () => {
    const out = validatePromises({ data: [rawPromise, rawUnknownParty] });
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('p-1');
    expect(out.map((p) => p.id)).not.toContain('x');
  });
  it('keeps unknown categories but coerces them to övrigt', () => {
    const out = validatePromises({ data: [rawUnknownCategory] });
    expect(out).toHaveLength(1);
    expect(out[0]!.party).toBe('m');
    expect(out[0]!.category).toBe('övrigt');
    expect(out[0]!.msekBase).toBe(0); // missing cost defaults to 0
  });
  it('keeps valid promises and maps fields', () => {
    const out = validatePromises({ data: [rawPromise] });
    const p = out[0]!;
    expect(p.party).toBe('s');
    expect(p.category).toBe('välfärd');
    expect(p.msekBase).toBe(1200);
    expect(p.source.domain).toBe('s.se');
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
