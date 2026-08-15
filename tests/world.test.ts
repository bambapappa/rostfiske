import { describe, it, expect } from 'vitest';
import { SPOTS, spotById, BUILDINGS, buildingById, buildingRects, buildingRect, isDoorZone, pushOut, BUILDING_W, BUILDING_H, spotAt } from '../src/world';
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
  it('every door lies inside the screen (512×288)', () => {
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
  it('neutral buildings (bageriet, biblioteket, apoteket) have flat bias (no category > 1)', () => {
    for (const id of ['bageriet', 'biblioteket', 'apoteket']) {
      const h = buildingById(id);
      expect(Object.values(h.bias).every(v => (v ?? 0) <= 1)).toBe(true);
    }
  });
  it('no building name contains "Hus"', () => {
    for (const b of BUILDINGS) {
      expect(b.name).not.toMatch(/Hus/i);
    }
  });
  it('buildingById throws on unknown id', () => {
    expect(() => buildingById('unknown' as any)).toThrow('unknown building');
  });
  it('all door pairs are at least 60px apart', () => {
    const doors = BUILDINGS.map(b => ({ x: b.doorX, y: b.doorY }));
    for (let i = 0; i < doors.length; i++) {
      for (let j = i + 1; j < doors.length; j++) {
        const d1 = doors[i];
        const d2 = doors[j];
        if (d1 && d2) {
          const dist = Math.hypot(d1.x - d2.x, d1.y - d2.y);
          expect(dist).toBeGreaterThanOrEqual(60);
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
    const r = buildingRect(buildingById('bageriet'));
    expect(r).toEqual({ x: 116, y: 206, w: 48, h: 32 });
  });
  it('the building center lies strictly inside its rect; edges do not', () => {
    const r = buildingRect(buildingById('skolan'))!; // 56..104 x, 44..76 y
    const inside = (x: number, y: number): boolean =>
      x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
    expect(inside(80, 60)).toBe(true); // center
    expect(inside(56, 60)).toBe(false); // left edge
    expect(inside(104, 60)).toBe(false); // right edge
  });
  it('isDoorZone: the door point is a zone, points beyond r are not', () => {
    const b = buildingById('bageriet'); // door at (140,238)
    expect(isDoorZone(140, 238, b)).toBe(true);
    expect(isDoorZone(145, 238, b)).toBe(true); // within default r=10
    expect(isDoorZone(151, 238, b)).toBe(false); // beyond r=10
    expect(isDoorZone(140, 238, b, 20)).toBe(true); // custom radius
  });
  it('every door sits exactly on its footprint edge', () => {
    // all six doors anchor on the rect's bottom edge — never 2px inside
    for (const b of BUILDINGS) {
      const r = buildingRect(b);
      expect(b.doorY).toBe(r.y + r.h);
    }
  });
  it('pushOut moves an interior point to the nearest edge, leaves outside points alone', () => {
    const rects = buildingRects();
    const bib = buildingRect(buildingById('biblioteket')); // 232..280 x, 216..248 y
    const out = pushOut(256, 222, rects); // 6px from top edge (y=216)
    expect(out.x).toBe(256);
    expect(out.y).toBe(216);
    const far = pushOut(10, 190, rects);
    expect(far).toEqual({ x: 10, y: 190 });
    const inBib = (x: number, y: number): boolean =>
      x > bib.x && x < bib.x + bib.w && y > bib.y && y < bib.y + bib.h;
    expect(inBib(out.x, out.y)).toBe(false);
  });
});

describe('spotAt (v1.2.2 click-to-move)', () => {
  it('returns the spot whose anchor (building door) is within 24 px', () => {
    expect(spotAt(80, 76)).toBe('skolan');        // skolan door
    expect(spotAt(430, 76)).toBe('aldreboendet'); // aldreboendet door
    expect(spotAt(256, 56)).toBe('stationen');    // stationen door
    expect(spotAt(80 + 24, 76)).toBe('skolan');   // exactly at radius = hit
    expect(spotAt(80 + 25, 76)).toBeNull();       // just outside = miss
  });
  it('torget anchors on its own center (no linked building)', () => {
    const t = spotById('torget');
    expect(spotAt(t.x, t.y)).toBe('torget');
    expect(spotAt(256, 160)).toBe('torget');
    expect(spotAt(t.x + 10, t.y - 10)).toBe('torget');
  });
  it('returns null on open ground', () => {
    expect(spotAt(10, 190)).toBeNull();
    expect(spotAt(340, 180)).toBeNull();
  });
});
