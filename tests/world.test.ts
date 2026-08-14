import { describe, it, expect } from 'vitest';
import { SPOTS, spotById, BUILDINGS, buildingById } from '../src/world';
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

describe('buildings', () => {
  it('has exactly 6 buildings with unique ids', () => {
    expect(BUILDINGS).toHaveLength(6);
    expect(new Set(BUILDINGS.map(b => b.id)).size).toBe(6);
  });
  it('every door lies inside the screen (384×208)', () => {
    for (const b of BUILDINGS) {
      expect(b.doorX).toBeGreaterThanOrEqual(0); expect(b.doorX).toBeLessThanOrEqual(LOGICAL_W);
      expect(b.doorY).toBeGreaterThanOrEqual(0); expect(b.doorY).toBeLessThanOrEqual(LOGICAL_H);
    }
  });
  it('skolan is biased toward utbildning > 1', () => {
    const s = buildingById('skolan');
    expect((s.bias.utbildning ?? 0)).toBeGreaterThan(1);
  });
  it('äldreboendet is biased toward välfärd > 1', () => {
    const a = buildingById('aldreboendet');
    expect((a.bias.välfärd ?? 0)).toBeGreaterThan(1);
  });
  it('stationen is biased toward infrastruktur > 1', () => {
    const s = buildingById('stationen');
    expect((s.bias.infrastruktur ?? 0)).toBeGreaterThan(1);
  });
  it('hus buildings have flat bias (no category > 1)', () => {
    for (const id of ['hus1', 'hus2', 'hus3']) {
      const h = buildingById(id);
      expect(Object.values(h.bias).every(v => (v ?? 0) <= 1)).toBe(true);
    }
  });
  it('buildingById throws on unknown id', () => {
    expect(() => buildingById('unknown' as any)).toThrow('unknown building');
  });
  it('all door pairs are at least 20px apart', () => {
    const doors = BUILDINGS.map(b => ({ x: b.doorX, y: b.doorY }));
    for (let i = 0; i < doors.length; i++) {
      for (let j = i + 1; j < doors.length; j++) {
        const d1 = doors[i];
        const d2 = doors[j];
        if (d1 && d2) {
          const dist = Math.hypot(d1.x - d2.x, d1.y - d2.y);
          expect(dist).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });
});
