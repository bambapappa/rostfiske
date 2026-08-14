import { describe, it, expect } from 'vitest';
import { SPOTS, spotById } from '../src/world';
import { LOGICAL_W, LOGICAL_H } from '../src/constants';

describe('city spots', () => {
  it('has 4 spots with distinct ids', () => {
    expect(SPOTS).toHaveLength(4);
    expect(new Set(SPOTS.map(s => s.id)).size).toBe(4);
  });
  it('every spot stands inside the screen', () => {
    for (const s of SPOTS) {
      expect(s.x).toBeGreaterThan(0); expect(s.x).toBeLessThan(LOGICAL_W);
      expect(s.y).toBeGreaterThan(0); expect(s.y).toBeLessThan(LOGICAL_H);
    }
  });
  it('school is biased toward utbildning', () => {
    const s = spotById('skolan');
    expect((s.bias.utbildning ?? 0)).toBeGreaterThan(1);
  });
  it('care home is biased toward välfärd', () => {
    expect((spotById('aldreboendet').bias.välfärd ?? 0)).toBeGreaterThan(1);
  });
  it('station is biased toward infrastruktur', () => {
    expect((spotById('stationen').bias.infrastruktur ?? 0)).toBeGreaterThan(1);
  });
  it('torget is flat (no bias > 1)', () => {
    const t = spotById('torget');
    expect(Object.values(t.bias).every(v => v === undefined)).toBe(true);
  });
});
