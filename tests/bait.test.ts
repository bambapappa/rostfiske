import { describe, it, expect } from 'vitest';
import { toBait, wearBait, isWorn, buildTackle, activeBait } from '../src/bait';
import { makeRng } from '../src/rng';
import { BAIT_DURABILITY, TACKLE_SIZE } from '../src/constants';
import type { PromiseData } from '../src/types';

const p = (id: string, cat: any = 'välfärd'): PromiseData => ({
  id, title: id, quote: 'q', party: 's', category: cat, msekBase: 10, status: 'aktiv',
  source: { url: 'u', domain: 'd' },
});

describe('bait wear', () => {
  it('starts full and is not worn', () => {
    const b = toBait(p('1'));
    expect(b.durability).toBe(BAIT_DURABILITY);
    expect(isWorn(b)).toBe(false);
  });
  it('wears by one per catch and becomes worn after maxDurability wears', () => {
    let b = toBait(p('1'));
    for (let i = 0; i < BAIT_DURABILITY; i++) b = wearBait(b);
    expect(isWorn(b)).toBe(true);
    expect(b.durability).toBe(0);
  });
  it('wearBait does not mutate the original', () => {
    const b = toBait(p('1'));
    const b2 = wearBait(b);
    expect(b.durability).toBe(BAIT_DURABILITY);
    expect(b2.durability).toBe(BAIT_DURABILITY - 1);
  });
});

describe('buildTackle', () => {
  it('picks TACKLE_SIZE distinct baits', () => {
    const promises = [p('1'), p('2'), p('3'), p('4'), p('5'), p('6'), p('7')];
    const t = buildTackle(promises, makeRng(1));
    expect(t).toHaveLength(TACKLE_SIZE);
    expect(new Set(t.map(b => b.id)).size).toBe(TACKLE_SIZE);
  });
  it('throws when too few promises', () => {
    expect(() => buildTackle([p('1'), p('2')], makeRng(1))).toThrow();
  });
});

describe('activeBait', () => {
  it('returns first non-worn bait', () => {
    const t = buildTackle([p('1'),p('2'),p('3'),p('4'),p('5'),p('6')], makeRng(2));
    expect(activeBait(t)!.id).toBe(t[0]!.id);
  });
  it('returns null when all worn', () => {
    const t = buildTackle([p('1'),p('2'),p('3'),p('4'),p('5'),p('6')], makeRng(2)).map(b => ({ ...b, durability: 0 }));
    expect(activeBait(t)).toBeNull();
  });
});
