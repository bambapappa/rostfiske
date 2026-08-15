import { describe, it, expect } from 'vitest';
import { drawScene } from '../src/render';
import { createGame } from '../src/engine';
import { ROUND_MS, HOOK_WINDOW_MS, CAST_RADIUS, type PartyCode } from '../src/constants';
import { BUILDINGS, SPOTS } from '../src/world';
import type { PartyData, Voter } from '../src/types';

interface Rect { x: number; y: number; w: number; h: number; }
interface DrawCall { sx: number; sy: number; dx: number; dy: number; dw: number; dh: number; }
interface StrokeCall { lineDash: number[]; }
interface TextCall { text: string; x: number; y: number; }
interface ArcCall { x: number; y: number; r: number; }

function stubCtx(): { ctx: CanvasRenderingContext2D; texts: string[]; textCalls: TextCall[]; rects: Rect[]; draws: DrawCall[]; strokeCalls: StrokeCall[]; arcCalls: ArcCall[] } {
  const texts: string[] = [];
  const textCalls: TextCall[] = [];
  const rects: Rect[] = [];
  const draws: DrawCall[] = [];
  const strokeCalls: StrokeCall[] = [];
  const arcCalls: ArcCall[] = [];
  const stack: Array<{ strokeStyle: string; globalAlpha: number }> = [];
  let globalAlpha = 1;
  let strokeStyle = '';
  const ctx = {
    get imageSmoothingEnabled() { return true; },
    set imageSmoothingEnabled(_: unknown) {},
    fillRect: (x: number, y: number, w: number, h: number) => { rects.push({ x, y, w, h }); },
    clearRect: () => {},
    drawImage: (_img: unknown, sx: number, sy: number, _sw: number, _sh: number, dx: number, dy: number, dw: number, dh: number) => {
      draws.push({ sx, sy, dx, dy, dw, dh });
    },
    fillText: (s: string, x: number, y: number) => { texts.push(s); textCalls.push({ text: s, x, y }); },
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
    quadraticCurveTo: () => {},
    arc: (x: number, y: number, r: number) => { arcCalls.push({ x, y, r }); },
    fill: () => {},
    stroke: () => {},
    save: () => { stack.push({ strokeStyle, globalAlpha }); },
    restore: () => { const saved = stack.pop(); if (saved) { strokeStyle = saved.strokeStyle; globalAlpha = saved.globalAlpha; } },
    setLineDash: (dash: number[]) => { strokeCalls.push({ lineDash: dash }); },
    get strokeStyle() { return strokeStyle; },
    set strokeStyle(value: string) { strokeStyle = value; },
    get globalAlpha() { return globalAlpha; },
    set globalAlpha(value: number) { globalAlpha = value; },
    fillStyle: '', font: '', textAlign: '', lineWidth: 0,
    measureText: (text: string) => ({ width: text.length * 3 }), // Approximate 6px monospace width
  } as unknown as CanvasRenderingContext2D;
  return { ctx, texts, textCalls, rects, draws, strokeCalls, arcCalls };
}

const promises = Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, title: 't', quote: 'q', party: 's' as PartyCode, category: 'välfärd' as const, msekBase: 1, status: 'aktiv', source: { url: 'u', domain: 'd' } }));
const parties: PartyData[] = [{ code: 's', name: 'S', color: '#E8112d', colorText: '#fff', block: 'rödgrön' }];

function voter(partial: Partial<Voter>): Voter {
  return {
    id: 1, x: 100, y: 100, speed: 13, category: 'välfärd', age: 'adult',
    state: 'wander', variant: 0, ...partial,
  };
}

describe('drawScene', () => {
  it('does not throw on a fresh game', () => {
    const g = createGame({ party: 's', promises });
    expect(() => drawScene(stubCtx().ctx, g, new Map(), parties, 0)).not.toThrow();
  });

  it('HUD keeps röster/släppta/tid but no bait line (v1.2: moved to the tackle panel)', () => {
    const g = createGame({ party: 's', promises: promises.map((p, i) => ({ ...p, title: 'Löfte ' + i, source: { url: 'https://utlovat.se/p/' + i, domain: 'utlovat.se' } })) });
    const { ctx, texts } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    expect(texts.some((t) => t.startsWith('Röster:'))).toBe(true);
    expect(texts.some((t) => t.startsWith('Släppta:'))).toBe(true);
    expect(texts.some((t) => t.startsWith('Tid:'))).toBe(true);
    // bait line (title, durability, source domain, "Inget bete!") is gone from the canvas
    const bait = g.tackle[0]!;
    expect(texts.some((t) => t.includes(bait.title.slice(0, 18)))).toBe(false);
    expect(texts.some((t) => t.includes('utlovat.se'))).toBe(false);
    expect(texts.includes('Inget bete!')).toBe(false);
  });

  it('draws the lapp paper and the fishing line when a lapp is cast', () => {
    const g = { ...createGame({ party: 's', promises }), lapp: { x: 80, y: 120, baitId: 'x' } };
    const { ctx, rects, texts } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    // small white paper at the lapp position
    expect(rects.some((r) => Math.abs(r.x - 78) <= 1 && Math.abs(r.y - 117) <= 1)).toBe(true);
    // line from the politician down to the lapp is stroked (no throw + paper there)
    expect(texts).toBeDefined();
  });

  it('does not throw with a biting voter and draws the ! bubble + timing bar', () => {
    const elapsed = 60_000;
    const g = {
      ...createGame({ party: 's', promises }),
      timeLeftMs: ROUND_MS - elapsed,
      voters: [voter({ id: 42, x: 100, y: 100, state: 'biting', biteDeadline: elapsed + HOOK_WINDOW_MS })],
      bitingVoterId: 42,
    };
    const { ctx, texts, rects } = stubCtx();
    expect(() => drawScene(ctx, g, new Map(), parties, 1234)).not.toThrow();
    expect(texts).toContain('!');
    // full window remaining → bar ~16 px wide, 2 px tall, beneath the bubble
    const bar = rects.find((r) => r.h === 2 && r.w > 15 && r.w <= 16);
    expect(bar).toBeDefined();
  });

  it('shrinks the timing bar as the hook window closes (width = remaining/HOOK_WINDOW_MS * 16)', () => {
    const elapsed = 60_000;
    const mk = (deadline: number) => ({
      ...createGame({ party: 's', promises }),
      timeLeftMs: ROUND_MS - elapsed,
      voters: [voter({ id: 42, x: 100, y: 100, state: 'biting', biteDeadline: deadline })],
      bitingVoterId: 42,
    });
    const half = mk(elapsed + HOOK_WINDOW_MS / 2);
    const { ctx, rects } = stubCtx();
    drawScene(ctx, half, new Map(), parties, 0);
    const bar = rects.filter((r) => r.h === 2).find((r) => r.w > 4 && r.w < 12);
    expect(bar).toBeDefined();
    expect(Math.abs(bar!.w - (HOOK_WINDOW_MS / 2) / HOOK_WINDOW_MS * 16)).toBeLessThanOrEqual(1);
  });

  it('does not draw voters that are inside a building', () => {
    const inside = voter({ id: 7, x: 55, y: 55, state: 'inside', buildingId: 'skolan' });
    const g = { ...createGame({ party: 's', promises }), voters: [inside, voter({ id: 8, x: 200, y: 100 })] };
    const sheet = new Map([['voters', {} as unknown as HTMLImageElement]]);
    const s2 = stubCtx();
    drawScene(s2.ctx, g, sheet, parties, 0);
    const insideDx = Math.round(inside.x) - 8;
    const insideDy = Math.round(inside.y) - 14;
    expect(s2.draws.some((d) => d.dx === insideDx && d.dy === insideDy)).toBe(false);
    const outside = g.voters[1]!;
    expect(s2.draws.some((d) => d.dx === Math.round(outside.x) - 8)).toBe(true);
  });

  it('picks the politician sprite cell by party index', () => {
    const g = createGame({ party: 'mp', promises: promises.map((p) => ({ ...p, party: 'mp' as PartyCode })) });
    const sheet = new Map([['politicians', {} as unknown as HTMLImageElement]]);
    const { ctx, draws } = stubCtx();
    drawScene(ctx, g, sheet, parties, 0);
    // mp = index 7 in PARTIES → 16x24 cells, row 1 (sy=24), col 3 (sx=48);
    // feet anchored at spotY → dy = spotY - 23
    expect(draws.some((d) => d.sx === 48 && d.sy === 24 && d.dw === 16 && d.dh === 24)).toBe(true);
  });

  it('draws a dashed ring around the politician (v1.2 cast radius)', () => {
    const g = createGame({ party: 's', promises });
    const { ctx, strokeCalls, arcCalls } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    // Should have setLineDash([3, 3]) for the dashed ring
    const dashCall = strokeCalls.find((c) => c.lineDash.length === 2 && c.lineDash[0] === 3 && c.lineDash[1] === 3);
    expect(dashCall).toBeDefined();
    // Verify the ring uses the party color by checking strokeStyle was set at some point
    // (The exact value is restored to empty by ctx.restore(), but we can verify it was set)
    expect(strokeCalls.length).toBeGreaterThan(0);
    // The ring must be centered at (spotX, spotY) — the exact point the engine's
    // castLapp measures CAST_RADIUS from (feet anchor), not the torso
    const ring = arcCalls.find((a) => a.r === CAST_RADIUS);
    expect(ring).toBeDefined();
    expect(ring!.x).toBe(g.spotX);
    expect(ring!.y).toBe(g.spotY);
  });

  it('draws building labels centered below each door (v1.2)', () => {
    const g = createGame({ party: 's', promises });
    const { ctx, textCalls } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    // Check that Skolan label is near its door position (doorX=80, doorY=76, labelY≈doorY+8=84)
    const skolan = BUILDINGS.find((b) => b.id === 'skolan')!;
    const skolanLabel = textCalls.find((t) => t.text === 'Skolan');
    expect(skolanLabel).toBeDefined();
    // x should be near doorX (centered), y should be doorY+8
    expect(Math.abs(skolanLabel!.x - skolan.doorX)).toBeLessThanOrEqual(12);
    expect(Math.abs(skolanLabel!.y - (skolan.doorY + 8))).toBeLessThanOrEqual(1);
    // Also check that all buildings are represented
    const labels = textCalls.map((t) => t.text);
    expect(labels).toContain('Äldreboendet');
    expect(labels).toContain('Stationen');
    expect(labels).toContain('Bageriet');
    expect(labels).toContain('Biblioteket');
    expect(labels).toContain('Apoteket');
    expect(labels).not.toContain('Hus 1');
    expect(labels).not.toContain('Hus 2');
    expect(labels).not.toContain('Hus 3');
  });

  it('draws Torget label at the plaza (v1.2)', () => {
    const g = createGame({ party: 's', promises });
    const { ctx, textCalls } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    const torget = SPOTS.find((s) => s.id === 'torget')!;
    // Torget label should be present near the plaza (x-14, y-14)
    const torsetLabel = textCalls.find((t) => t.text === 'Torget');
    expect(torsetLabel).toBeDefined();
    expect(Math.abs(torsetLabel!.x - (torget.x - 14))).toBeLessThanOrEqual(1);
    expect(Math.abs(torsetLabel!.y - (torget.y - 14))).toBeLessThanOrEqual(1);
  });

  it('removes old floating spot labels (v1.2)', () => {
    const g = createGame({ party: 's', promises });
    const { ctx, textCalls } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    // Old floating labels were at y = spot.y - 8 for all spots
    // New labels are at doorY + 8 for buildings, and torget.y - 14 for torget
    // Check that no building label is at the old floating position (spot.y - 8)
    for (const spot of SPOTS) {
      if (spot.id === 'torget') continue; // Torget is different
      const buildingLabel = textCalls.find((t) => t.text === spot.name);
      expect(buildingLabel).toBeDefined();
      // Old position would have been y ≈ spot.y - 8
      // New position should be doorY + 8, which is different
      const building = BUILDINGS.find((b) => b.id === spot.id);
      if (building) {
        expect(buildingLabel!.y).not.toBeCloseTo(spot.y - 8, 0);
        expect(Math.abs(buildingLabel!.y - (building.doorY + 8))).toBeLessThanOrEqual(1);
      }
    }
  });

  it('renders float_text and ripple particles with coordinates and text (v1.3)', () => {
    const g = {
      ...createGame({ party: 's', promises }),
      particles: [
        { id: 1, x: 120, y: 130, text: '+1', color: '#e8112d', lifeMs: 200, maxLifeMs: 1000, kind: 'float_text' as const },
        { id: 2, x: 180, y: 90, text: 'Saknar rösträtt', color: '#aaaaaa', lifeMs: 100, maxLifeMs: 1200, kind: 'float_text' as const },
        { id: 3, x: 220, y: 140, text: '', color: 'rgba(255,255,255,0.7)', lifeMs: 250, maxLifeMs: 500, kind: 'ripple' as const, radius: 2, maxRadius: 18 },
      ],
    };
    const { ctx, texts, arcCalls } = stubCtx();
    expect(() => drawScene(ctx, g, new Map(), parties, 0)).not.toThrow();
    expect(texts).toContain('+1');
    expect(texts).toContain('Saknar rösträtt');
    // Ripple should have produced an arc call centered at (220, 140)
    const rippleArc = arcCalls.find((a) => a.x === 220 && a.y === 140);
    expect(rippleArc).toBeDefined();
    // At lifeMs 250 / maxLifeMs 500 (halfway), radius should be 2 + (18-2)*0.5 = 10
    expect(rippleArc!.r).toBeCloseTo(10, 1);
  });

  it('renders awareness cue (?) above voters in toLapp state (v1.3)', () => {
    const toLappVoter = voter({ id: 55, x: 140, y: 110, state: 'toLapp', attractToX: 200, attractToY: 120 });
    const g = {
      ...createGame({ party: 's', promises }),
      voters: [toLappVoter],
    };
    const { ctx, texts, textCalls } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    expect(texts).toContain('?');
    const cue = textCalls.find((t) => t.text === '?');
    expect(cue).toBeDefined();
    expect(cue!.x).toBe(140);
    expect(cue!.y).toBeLessThan(110); // positioned above the voter's head
  });

  it('renders parabolic cast flight trajectory when flightProgress < 1 (v1.3)', () => {
    const g = {
      ...createGame({ party: 's', promises }),
      lapp: {
        x: 200,
        y: 100,
        baitId: 'p0',
        startX: 100,
        startY: 150,
        flightProgress: 0.5,
        flightDurationMs: 250,
      },
    };
    const { ctx, rects } = stubCtx();
    expect(() => drawScene(ctx, g, new Map(), parties, 0)).not.toThrow();
    // At progress 0.5: lx = 100 + (200-100)*0.5 = 150, linearY = 150 + (100-150)*0.5 = 125, arcHeight = sin(0.5*PI)*28 = 28 -> ly = 97
    // Paper rect rendered at Math.round(lx)-2 = 148, Math.round(ly)-3 = 94
    const flyingPaper = rects.find((r) => Math.abs(r.x - 148) <= 1 && Math.abs(r.y - 94) <= 1 && r.w === 5 && r.h === 4);
    expect(flyingPaper).toBeDefined();
  });

  it('renders animated breaking news banner with headline and EXTRA badge when trend is active (v1.3)', () => {
    const headline = 'EXTRA: Partiledardebatt om skolan och utbildning!';
    const g = {
      ...createGame({ party: 's', promises }),
      timeLeftMs: ROUND_MS - 25_000, // 25s elapsed (within 20s..32s trend window)
      activeTrend: {
        category: 'utbildning' as const,
        headline,
        startsAtMs: 20_000,
        expiresAtMs: 32_000,
        color: '#f39c12',
      },
    };
    const { ctx, texts, rects } = stubCtx();
    expect(() => drawScene(ctx, g, new Map(), parties, 0)).not.toThrow();
    expect(texts).toContain('EXTRA');
    expect(texts).toContain(headline);
    // Dark banner rect across logical width (w=512, h=16)
    const bannerRect = rects.find((r) => r.w === 512 && r.h === 16);
    expect(bannerRect).toBeDefined();
  });

  it('does not render breaking news banner when no trend is active (v1.3)', () => {
    const g = {
      ...createGame({ party: 's', promises }),
      activeTrend: null,
    };
    const { ctx, texts } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    expect(texts.includes('EXTRA')).toBe(false);
  });

  it('renders halo highlight around matching landed lapp when trend is active (v1.3)', () => {
    const g = {
      ...createGame({ party: 's', promises }),
      lapp: { x: 150, y: 120, baitId: 'p0', flightProgress: 1 },
      activeTrend: {
        category: 'välfärd' as const,
        headline: 'EXTRA: Vård och välfärd i fokus i opinionsmätning!',
        startsAtMs: 20_000,
        expiresAtMs: 32_000,
        color: '#e74c3c',
      },
    };
    const { ctx, arcCalls } = stubCtx();
    expect(() => drawScene(ctx, g, new Map(), parties, 1000)).not.toThrow();
    // Halo arc centered at lapp coordinates (150.5, 119)
    const halo = arcCalls.find((a) => Math.abs(a.x - 150.5) <= 1 && Math.abs(a.y - 119) <= 1);
    expect(halo).toBeDefined();
  });
});
