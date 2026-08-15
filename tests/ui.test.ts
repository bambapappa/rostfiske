import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatSummary, catchLine, eventText, showCharacterSelect, drawLeaderPortrait, renderTackle, CATEGORY_COLORS } from '../src/ui';
import { createGame, castLapp, onHookClick } from '../src/engine';
import { PARTIES, CATEGORIES, type Category } from '../src/constants';
import type { GameEvent, PartyData, Bait } from '../src/types';
import type { PartyCode } from '../src/constants';

describe('formatSummary', () => {
  it('reports votes and released neutrally', () => {
    const g = { ...createGame({ party: 's', promises: Array.from({length:6},(_,i)=>({id:'p'+i,title:'t',quote:'q',party:'s',category:'välfärd',msekBase:1000,status:'aktiv',source:{url:'u',domain:'d'}})) }), votes: 12, released: 3 };
    const s = formatSummary(g);
    expect(s).toContain('12');
    expect(s).toContain('3');
    expect(s.toLowerCase()).not.toContain('vann'); // no winner framing
  });
});

describe('catchLine', () => {
  const base = { title: 'Mer välfärd', msekBase: 1200, sourceUrl: 'https://example.com/p/1', sourceDomain: 'example.com' };
  it('attributes the source on a normal catch', () => {
    const line = catchLine({ ...base, released: false });
    expect(line).toBe('Fångst: Mer välfärd · kostnad 1200 msek · källa example.com (https://example.com/p/1)');
  });
  it('reports released minors neutrally', () => {
    const line = catchLine({ ...base, released: true });
    expect(line).toBe('Släppt tillbaka: saknar rösträtt');
  });
});

describe('eventText (spec table, all neutral)', () => {
  const catchEv: GameEvent = {
    kind: 'catch',
    text: 'Fångst: Mer välfärd · kostnad 1200 msek · källa example.com (https://example.com/p/1)',
  };
  const cases: Array<[GameEvent, string]> = [
    [{ kind: 'cast', text: 'Kastar: Mer välfärd' }, 'Kastar: Mer välfärd'],
    [{ kind: 'napp', text: 'NAPP! Klicka nu!' }, 'NAPP! Klicka nu!'],
    [catchEv, 'Fångst: Mer välfärd · kostnad 1200 msek · källa example.com (https://example.com/p/1)'],
    [{ kind: 'release', text: 'Släppt tillbaka: saknar rösträtt' }, 'Släppt tillbaka: saknar rösträtt'],
    [{ kind: 'miss', text: 'Missad — väljaren tog lappen och gick' }, 'Missad — väljaren tog lappen och gick'],
    [{ kind: 'baitWorn', text: 'Betet slut: Mer välfärd — byter bete' }, 'Betet slut: Mer välfärd — byter bete'],
    [{ kind: 'baitSelected', text: 'Bete 2: Mer välfärd' }, 'Bete 2: Mer välfärd'],
  ];
  for (const [ev, expected] of cases) {
    it(`${ev.kind} → exact spec string`, () => {
      expect(eventText(ev)).toBe(expected);
      expect(eventText(ev).toLowerCase()).not.toContain('vann');
    });
  }
  it('catch text keeps the CC BY 4.0 source attribution', () => {
    expect(eventText(catchEv)).toContain('källa example.com');
    expect(eventText(catchEv)).toContain('https://example.com/p/1');
  });
});

// ---- showCharacterSelect (fake DOM: node env has no document) ----

interface FakeEl {
  tag: string;
  textContent: string;
  title: string;
  type: string;
  className: string;
  style: Record<string, string>;
  width: number;
  height: number;
  children: FakeEl[];
  listeners: Record<string, Array<(e: unknown) => void>>;
  /** recorded drawImage args (excluding the image), for canvas stubs */
  draws: number[][];
  imageSmoothingEnabled: boolean;
  getContext(): { imageSmoothingEnabled: boolean; clearRect(): void; drawImage(img: unknown, ...args: number[]): void };
  appendChild(c: FakeEl): FakeEl;
  replaceChildren(): void;
  addEventListener(t: string, fn: (e: unknown) => void): void;
}

function fakeEl(tag: string): FakeEl {
  const el: FakeEl = {
    tag, textContent: '', title: '', type: '', className: '',
    style: {}, width: 0, height: 0, children: [], listeners: {},
    draws: [], imageSmoothingEnabled: true,
    getContext() {
      return {
        clearRect() { el.draws.length = 0; },
        drawImage(_img: unknown, ...args: number[]) { el.draws.push(args); },
        get imageSmoothingEnabled() { return el.imageSmoothingEnabled; },
        set imageSmoothingEnabled(v: boolean) { el.imageSmoothingEnabled = v; },
      };
    },
    appendChild(c) { el.children.push(c); return el; },
    replaceChildren() { el.children.length = 0; },
    addEventListener(t, fn) { (el.listeners[t] ??= []).push(fn); },
  };
  return el;
}

/** A stub politicians sheet: any object with width/height satisfies drawImage's
 *  image argument in the fake ctx. */
const SHEET_STUB = { width: 64, height: 48 } as unknown as HTMLImageElement;

/** The party-name span child of a select button. */
function nameSpan(btn: FakeEl): FakeEl {
  const span = btn.children.find((c) => c.tag === 'span');
  if (!span) throw new Error('button has no name span');
  return span;
}

/** The portrait canvas child of a select button. */
function portraitCanvas(btn: FakeEl): FakeEl {
  const c = btn.children.find((c) => c.tag === 'canvas');
  if (!c) throw new Error('button has no portrait canvas');
  return c;
}

const PARTIES_TEST: PartyData[] = [
  { code: 's', name: 'Socialdemokraterna', color: '#E8112D', colorText: '#fff', block: 'rödgrön' },
  { code: 'm', name: 'Moderaterna', color: '#52BDEC', colorText: '#fff', block: 'borgerlig' },
  { code: 'sd', name: 'Sverigedemokraterna', color: '#4E9ECD', colorText: '#fff', block: 'sd' },
  { code: 'c', name: 'Centerpartiet', color: '#009A54', colorText: '#fff', block: 'borgerlig' },
  { code: 'v', name: 'Vänsterpartiet', color: '#DA291C', colorText: '#fff', block: 'rödgrön' },
  { code: 'kd', name: 'Kristdemokraterna', color: '#34387C', colorText: '#fff', block: 'borgerlig' },
  { code: 'l', name: 'Liberalerna', color: '#006AA7', colorText: '#fff', block: 'borgerlig' },
  { code: 'mp', name: 'Miljöpartiet', color: '#83CF39', colorText: '#fff', block: 'rödgrön' },
];

describe('showCharacterSelect', () => {
  // node test env: provide the minimal `document` the DOM builder needs
  const g = globalThis as Record<string, unknown>;
  beforeEach(() => {
    g.document = { createElement: (tag: string) => fakeEl(tag) };
  });
  afterEach(() => {
    delete g.document;
  });

  it('renders one identically-styled button per party, in given (PARTIES) order', () => {
    const container = fakeEl('div');
    showCharacterSelect(container as unknown as HTMLElement, PARTIES_TEST, undefined, () => {});
    expect(container.children).toHaveLength(PARTIES_TEST.length);
    PARTIES_TEST.forEach((p, i) => {
      const btn = container.children[i]!;
      expect(btn.tag).toBe('button');
      expect(nameSpan(btn).textContent).toBe(p.name); // party name, no winner framing
      expect(btn.style.borderColor).toBe(p.color); // party-color border
      expect(btn.className).toBe(container.children[0]!.className); // identical framing
    });
    // order matches the parties array (= PARTIES order)
    expect(PARTIES_TEST.map((p) => p.code)).toEqual([...PARTIES]);
  });

  it('invokes onPick with the party code on click', () => {
    const container = fakeEl('div');
    const picked: PartyCode[] = [];
    showCharacterSelect(container as unknown as HTMLElement, PARTIES_TEST, undefined, (c) => picked.push(c));
    const btn = container.children[3]!; // 'c'
    btn.listeners['click']![0]!({});
    expect(picked).toEqual(['c']);
  });

  it('enforces PARTIES order even when the caller passes a shuffled array (neutrality)', () => {
    const shuffled = [...PARTIES_TEST].reverse();
    const container = fakeEl('div');
    showCharacterSelect(container as unknown as HTMLElement, shuffled, undefined, () => {});
    expect(container.children.map((b) => nameSpan(b).textContent)).toEqual([...PARTIES.map((code) => PARTIES_TEST.find((p) => p.code === code)!.name)]);
  });

  it('every button contains a 48×72 portrait canvas beside the name (identical structure)', () => {
    const container = fakeEl('div');
    showCharacterSelect(container as unknown as HTMLElement, PARTIES_TEST, SHEET_STUB, () => {});
    PARTIES_TEST.forEach((p, i) => {
      const btn = container.children[i]!;
      const canvas = portraitCanvas(btn);
      expect(canvas.width).toBe(48); // LEADER_W × 3
      expect(canvas.height).toBe(72); // LEADER_H × 3
      expect(nameSpan(btn).textContent).toBe(p.name);
      // the party's OWN cell was drawn onto the canvas (source rect from the sheet)
      const idx = PARTIES.indexOf(p.code);
      expect(canvas.draws).toEqual([[(idx % 4) * 16, Math.floor(idx / 4) * 24, 16, 24, 0, 0, 48, 72]]);
      expect(canvas.imageSmoothingEnabled).toBe(false); // crisp pixels, no blur
    });
  });

  it('renders the same canvas+name structure when the sheet is missing (asset fallback)', () => {
    const container = fakeEl('div');
    showCharacterSelect(container as unknown as HTMLElement, PARTIES_TEST, undefined, () => {});
    PARTIES_TEST.forEach((_, i) => {
      expect(portraitCanvas(container.children[i]!).draws).toEqual([]); // blank, not a crash
      expect(nameSpan(container.children[i]!)).toBeTruthy();
    });
  });
});

describe('drawLeaderPortrait (v1.2)', () => {
  const img = SHEET_STUB;

  it.each([...PARTIES])('draws party %s from its own sheet cell, scaled ×3, unsmoothed', (party) => {
    const canvas = fakeEl('canvas');
    drawLeaderPortrait(canvas as unknown as HTMLCanvasElement, img, party);
    const idx = PARTIES.indexOf(party);
    expect(canvas.draws).toEqual([
      [(idx % 4) * 16, Math.floor(idx / 4) * 24, 16, 24, 0, 0, 48, 72],
    ]);
    expect(canvas.imageSmoothingEnabled).toBe(false);
  });

  it('mp is the last cell: sx 48, sy 24', () => {
    const canvas = fakeEl('canvas');
    drawLeaderPortrait(canvas as unknown as HTMLCanvasElement, img, 'mp');
    expect(canvas.draws[0]).toEqual([48, 24, 16, 24, 0, 0, 48, 72]);
  });
});

describe('eventText over engine-produced events (spec strings at their source)', () => {
  const promises = Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, title: 'Löfte ' + i, quote: 'q', party: 's' as PartyCode, category: 'välfärd' as const, msekBase: 1000, status: 'aktiv', source: { url: 'https://ex.se/p/' + i, domain: 'ex.se' } }));

  it('renders engine cast events as the spec Kastar line', () => {
    const g = createGame({ party: 's', promises, seed: 1 });
    const bait = g.tackle[0]!;
    const s = castLapp(g, 100, 100);
    expect(s.lastEvent).not.toBeNull();
    expect(eventText(s.lastEvent!)).toBe(`Kastar: ${bait.title}`);
  });

  it('renders engine catch events with the full CC BY 4.0 source line', () => {
    const g = createGame({ party: 's', promises, seed: 1 });
    const bait = g.tackle[0]!;
    const elapsed = 60_000;
    const biting = { ...g, timeLeftMs: 180_000 - elapsed, voters: [{ id: 9, x: 100, y: 100, speed: 13, category: 'välfärd' as const, age: 'adult' as const, state: 'biting' as const, variant: 0, biteDeadline: elapsed + 650 }], bitingVoterId: 9 };
    const s = onHookClick(biting, elapsed);
    expect(s.lastEvent?.kind).toBe('catch');
    expect(eventText(s.lastEvent!)).toBe(`Fångst: ${bait.title} · kostnad ${bait.msekBase} msek · källa ex.se (https://ex.se/p/${promises.findIndex((p) => p.title === bait.title)})`);
  });
});

// ---- CATEGORY_COLORS + renderTackle (v1.2 tackle panel) ----

function mkBait(i: number, partial: Partial<Bait> = {}): Bait {
  return {
    id: 'b' + i, title: 'Bete ' + i, quote: 'q', category: 'välfärd', party: 's',
    msekBase: 1000, sourceUrl: 'https://ex.se/' + i, sourceDomain: 'ex.se',
    durability: 6, maxDurability: 6, ...partial,
  };
}

/** Find a fake descendant (depth-first) by one of its space-separated classes. */
function byClass(el: FakeEl, cls: string): FakeEl | undefined {
  for (const c of el.children) {
    if (c.className.split(' ').includes(cls)) return c;
    const hit = byClass(c, cls);
    if (hit) return hit;
  }
  return undefined;
}

describe('CATEGORY_COLORS', () => {
  it('covers every category with a distinct hex color', () => {
    for (const c of CATEGORIES) expect(CATEGORY_COLORS[c as Category]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(Object.values(CATEGORY_COLORS)).size).toBe(CATEGORIES.length);
  });
});

describe('renderTackle', () => {
  const g = globalThis as Record<string, unknown>;
  beforeEach(() => {
    g.document = { createElement: (tag: string) => fakeEl(tag) };
  });
  afterEach(() => {
    delete g.document;
  });

  it('renders one slot per bait (5), in tackle order, with 1–5 index hints', () => {
    const tackle = Array.from({ length: 5 }, (_, i) => mkBait(i));
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, tackle, 'b0', () => {});
    expect(container.children).toHaveLength(5);
    container.children.forEach((slot, i) => {
      expect(slot.tag).toBe('div');
      expect(slot.className.split(' ')).toContain('slot');
      expect(byClass(slot, 'hint')!.textContent).toBe(String(i + 1));
      expect(byClass(slot, 'title')!.textContent).toContain(tackle[i]!.title);
    });
  });

  it('pips = ▮ per remaining durability + ▯ outline remainder', () => {
    const tackle = Array.from({ length: 5 }, (_, i) => mkBait(i, { durability: i, maxDurability: 6 }));
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, tackle, null, () => {});
    container.children.forEach((slot, i) => {
      expect(byClass(slot, 'pips')!.textContent).toBe('▮'.repeat(i) + '▯'.repeat(6 - i));
    });
  });

  it('marks the active slot and dims worn slots', () => {
    const tackle = [mkBait(0, { durability: 0 }), mkBait(1), mkBait(2), mkBait(3), mkBait(4)];
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, tackle, 'b1', () => {});
    expect(container.children[0]!.className.split(' ')).toContain('worn');
    expect(container.children[0]!.className.split(' ')).not.toContain('active');
    expect(container.children[1]!.className.split(' ')).toContain('active');
    expect(container.children[1]!.className.split(' ')).not.toContain('worn');
  });

  it('truncates long titles to ~18 chars with an ellipsis', () => {
    const long = 'Ett väldigt långt vallöfte som inte får plats';
    const tackle = Array.from({ length: 5 }, (_, i) => mkBait(i, { title: i === 0 ? long : 'kort' }));
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, tackle, null, () => {});
    const title = byClass(container.children[0]!, 'title')!.textContent;
    expect(title.length).toBeLessThanOrEqual(18);
    expect(title.startsWith(long.slice(0, 17))).toBe(true);
    expect(title.endsWith('…')).toBe(true);
    expect(byClass(container.children[1]!, 'title')!.textContent).toBe('kort');
  });

  it('shows sourceDomain as subtext on the active slot only (CC BY 4.0)', () => {
    const tackle = Array.from({ length: 5 }, (_, i) => mkBait(i, { sourceDomain: 'doman' + i + '.se' }));
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, tackle, 'b2', () => {});
    expect(byClass(container.children[2]!, 'source')!.textContent).toBe('doman2.se');
    container.children.forEach((slot, i) => {
      if (i !== 2) expect(byClass(slot, 'source')).toBeUndefined();
    });
  });

  it('colors each chip from CATEGORY_COLORS', () => {
    const tackle = Array.from({ length: 5 }, (_, i) => mkBait(i, { category: CATEGORIES[i] as Category }));
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, tackle, null, () => {});
    container.children.forEach((slot, i) => {
      expect(byClass(slot, 'chip')!.style.background).toBe(CATEGORY_COLORS[CATEGORIES[i] as Category]);
    });
  });

  it('clicking a live slot calls onSelect with its index; worn slots do nothing', () => {
    const tackle = [mkBait(0, { durability: 0 }), mkBait(1), mkBait(2), mkBait(3), mkBait(4)];
    const container = fakeEl('div');
    const picked: number[] = [];
    renderTackle(container as unknown as HTMLElement, tackle, 'b1', (i) => picked.push(i));
    container.children[2]!.listeners['click']![0]!({});
    expect(picked).toEqual([2]);
    expect(container.children[0]!.listeners['click']).toBeUndefined();
  });

  it('rebuilds on every call — a re-render with new tackle replaces the slots', () => {
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, Array.from({ length: 5 }, (_, i) => mkBait(i)), null, () => {});
    renderTackle(container as unknown as HTMLElement, Array.from({ length: 5 }, (_, i) => mkBait(10 + i, { title: 'nytt ' + i })), null, () => {});
    expect(container.children).toHaveLength(5);
    expect(byClass(container.children[0]!, 'title')!.textContent).toBe('nytt 0');
  });

  it('is party-neutral: slot markup contains no party comparison or winner framing', () => {
    const tackle = Array.from({ length: 5 }, (_, i) => mkBait(i, { party: PARTIES[i] as PartyCode }));
    const container = fakeEl('div');
    renderTackle(container as unknown as HTMLElement, tackle, 'b0', () => {});
    for (const slot of container.children) {
      const all = [slot.title, slot.className, ...slot.children.flatMap((c) => [c.textContent, c.className])].join(' ').toLowerCase();
      expect(all).not.toContain('vann');
      expect(all).not.toContain('bäst');
    }
  });
});

describe('renderBuildingBadges', () => {
  const g = globalThis as unknown as { document?: { createElement: (t: string) => FakeEl } };
  beforeEach(() => {
    g.document = { createElement: (tag: string) => fakeEl(tag) };
  });
  afterEach(() => {
    delete g.document;
  });

  it('renders one button per spot with correct text and active class', async () => {
    const { renderBuildingBadges } = await import('../src/ui');
    const { SPOTS } = await import('../src/world');
    const container = fakeEl('div');
    const picked: string[] = [];
    renderBuildingBadges(container as unknown as HTMLElement, SPOTS, 'skolan', (id) => picked.push(id));
    expect(container.children).toHaveLength(SPOTS.length);
    const skolanBtn = container.children.find((c) => c.textContent === 'Skolan')!;
    expect(skolanBtn).toBeDefined();
    expect(skolanBtn.className).toContain('active');
    // Clicking triggers onSelect
    skolanBtn.listeners['click']![0]!({ stopPropagation: () => {} });
    expect(picked).toEqual(['skolan']);
  });
});

