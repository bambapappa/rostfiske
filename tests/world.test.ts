import { describe, it, expect } from 'vitest';
import { SPOTS, spotById, BUILDINGS, buildingById, buildingRects, buildingRect, isDoorZone, pushOut, BUILDING_W, BUILDING_H } from '../src/world';
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

describe('building footprints (v1.2)', () => {
  it('buildingRects returns 6 rects of 48×32 centered on each building', () => {
    const rects = buildingRects();
    expect(rects).toHaveLength(6);
    for (let i = 0; i < BUILDINGS.length; i++) {
      const b = BUILDINGS[i]!;
      const r = rects[i]!;
      expect(r.w).toBe(48);
      expect(r.h).toBe(32);
      expect(r.x).toBe(b.x - BUILDING_W / 2);
      expect(r.y).toBe(b.y - BUILDING_H / 2);
    }
  });
  it('buildingRect centers on a single building', () => {
    const r = buildingRect(buildingById('hus1'));
    expect(r).toEqual({ x: 96, y: 134, w: 48, h: 32 });
  });
  it('the building center lies strictly inside its rect; edges do not', () => {
    const r = buildingRect(buildingById('skolan'))!; // 32..80 x, 24..56 y
    const inside = (x: number, y: number): boolean =>
      x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
    expect(inside(56, 40)).toBe(true); // center
    expect(inside(32, 40)).toBe(false); // left edge
    expect(inside(80, 40)).toBe(false); // right edge
  });
  it('isDoorZone: the door point is a zone, points beyond r are not', () => {
    const b = buildingById('hus1'); // door at (120,166)
    expect(isDoorZone(120, 166, b)).toBe(true);
    expect(isDoorZone(125, 166, b)).toBe(true); // within default r=10
    expect(isDoorZone(131, 166, b)).toBe(false); // beyond r=10
    expect(isDoorZone(120, 166, b, 20)).toBe(true); // custom radius
  });
  it('every door sits exactly on its footprint edge (v1.2 fix: hus1-3 too)', () => {
    // all six doors anchor on the rect's bottom edge — never 2px inside
    for (const b of BUILDINGS) {
      const r = buildingRect(b);
      expect(b.doorY).toBe(r.y + r.h);
    }
  });
  it('pushOut moves an interior point to the nearest edge, leaves outside points alone', () => {
    const rects = buildingRects();
    const hus2 = buildingRect(buildingById('hus2')); // 240..288 x, 134..166 y
    const out = pushOut(264, 140, rects); // 6px from top edge
    expect(out.x).toBe(264);
    expect(out.y).toBe(134);
    const far = pushOut(10, 190, rects);
    expect(far).toEqual({ x: 10, y: 190 });
    const inHus2 = (x: number, y: number): boolean =>
      x > hus2.x && x < hus2.x + hus2.w && y > hus2.y && y < hus2.y + hus2.h;
    expect(inHus2(out.x, out.y)).toBe(false);
  });
});
