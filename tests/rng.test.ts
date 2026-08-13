import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/rng';

describe('makeRng', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(42), b = makeRng(42);
    expect(a.next()).toBe(b.next());
    expect(a.next()).toBe(b.next());
  });
  it('next() is in [0,1)', () => {
    const r = makeRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('int(n) is in [0,n)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) expect(r.int(5)).toBeLessThan(5);
  });
  it('pick returns an element of the array', () => {
    const arr = ['a','b','c'] as const;
    const r = makeRng(3);
    expect(arr).toContain(r.pick(arr));
  });
  it('bool(p) roughly respects p', () => {
    const r = makeRng(99); let hits = 0;
    for (let i = 0; i < 10000; i++) if (r.bool(0.25)) hits++;
    expect(hits).toBeGreaterThan(2200);
    expect(hits).toBeLessThan(2800);
  });
});
