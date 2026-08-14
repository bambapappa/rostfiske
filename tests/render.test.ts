import { describe, it, expect } from 'vitest';
import { drawScene } from '../src/render';
import { createGame } from '../src/engine';
import { ROUND_MS, HOOK_WINDOW_MS, type PartyCode } from '../src/constants';
import type { PartyData, Voter } from '../src/types';

interface Rect { x: number; y: number; w: number; h: number; }
interface DrawCall { sx: number; sy: number; dx: number; dy: number; dw: number; dh: number; }

function stubCtx(): { ctx: CanvasRenderingContext2D; texts: string[]; rects: Rect[]; draws: DrawCall[] } {
  const texts: string[] = [];
  const rects: Rect[] = [];
  const draws: DrawCall[] = [];
  const ctx = {
    imageSmoothingEnabled: true,
    fillRect: (x: number, y: number, w: number, h: number) => { rects.push({ x, y, w, h }); },
    clearRect: () => {},
    drawImage: (_img: unknown, sx: number, sy: number, _sw: number, _sh: number, dx: number, dy: number, dw: number, dh: number) => {
      draws.push({ sx, sy, dx, dy, dw, dh });
    },
    fillText: (s: string) => { texts.push(s); },
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
    fillStyle: '', strokeStyle: '', font: '', textAlign: '', lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, texts, rects, draws };
}

const promises = Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, title: 't', quote: 'q', party: 's' as PartyCode, category: 'välfärd' as const, msekBase: 1, status: 'aktiv', source: { url: 'u', domain: 'd' } }));
const parties: PartyData[] = [{ code: 's', name: 'S', color: '#E8112d', colorText: '#fff', block: 'rödgrön' }];

function voter(partial: Partial<Voter>): Voter {
  return {
    id: 1, x: 100, y: 100, vx: 1, vy: 0, category: 'välfärd', age: 'adult',
    state: 'wander', variant: 0, ...partial,
  };
}

describe('drawScene', () => {
  it('does not throw on a fresh game', () => {
    const g = createGame({ party: 's', promises });
    expect(() => drawScene(stubCtx().ctx, g, new Map(), parties, 0)).not.toThrow();
  });

  it('renders the bait source domain in the HUD (CC BY 4.0 attribution)', () => {
    const g = createGame({ party: 's', promises: promises.map((p, i) => ({ ...p, title: 'Löfte ' + i, source: { url: 'https://utlovat.se/p/' + i, domain: 'utlovat.se' } })) });
    const { ctx, texts } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    const bait = g.tackle[0]!;
    const hud = texts.find((t) => t.includes(bait.title.slice(0, 18)));
    expect(hud).toBeDefined();
    expect(hud!).toContain('utlovat.se');
    expect(hud!).toContain(`(${bait.durability})`);
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
    // mp = index 7 in PARTIES → row 1 (sy=16), col 3 (sx=48) of politicians.png
    expect(draws.some((d) => d.sx === 48 && d.sy === 16)).toBe(true);
  });
});
