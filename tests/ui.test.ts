import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatSummary, catchLine, eventText, showCharacterSelect } from '../src/ui';
import { createGame, castLapp, onHookClick } from '../src/engine';
import { PARTIES } from '../src/constants';
import type { GameEvent, PartyData } from '../src/types';
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
  children: FakeEl[];
  listeners: Record<string, Array<(e: unknown) => void>>;
  appendChild(c: FakeEl): FakeEl;
  addEventListener(t: string, fn: (e: unknown) => void): void;
}

function fakeEl(tag: string): FakeEl {
  const el: FakeEl = {
    tag, textContent: '', title: '', type: '', className: '',
    style: {}, children: [], listeners: {},
    appendChild(c) { el.children.push(c); return el; },
    addEventListener(t, fn) { (el.listeners[t] ??= []).push(fn); },
  };
  return el;
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
    showCharacterSelect(container as unknown as HTMLElement, PARTIES_TEST, () => {});
    expect(container.children).toHaveLength(PARTIES_TEST.length);
    PARTIES_TEST.forEach((p, i) => {
      const btn = container.children[i]!;
      expect(btn.tag).toBe('button');
      expect(btn.textContent).toBe(p.name); // party name, no winner framing
      expect(btn.style.borderColor).toBe(p.color); // party-color border
      expect(btn.className).toBe(container.children[0]!.className); // identical framing
    });
    // order matches the parties array (= PARTIES order)
    expect(PARTIES_TEST.map((p) => p.code)).toEqual([...PARTIES]);
  });

  it('invokes onPick with the party code on click', () => {
    const container = fakeEl('div');
    const picked: PartyCode[] = [];
    showCharacterSelect(container as unknown as HTMLElement, PARTIES_TEST, (c) => picked.push(c));
    const btn = container.children[3]!; // 'c'
    btn.listeners['click']![0]!({});
    expect(picked).toEqual(['c']);
  });

  it('enforces PARTIES order even when the caller passes a shuffled array (neutrality)', () => {
    const shuffled = [...PARTIES_TEST].reverse();
    const container = fakeEl('div');
    showCharacterSelect(container as unknown as HTMLElement, shuffled, () => {});
    expect(container.children.map((b) => b.textContent)).toEqual([...PARTIES.map((code) => PARTIES_TEST.find((p) => p.code === code)!.name)]);
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
    const biting = { ...g, timeLeftMs: 180_000 - elapsed, voters: [{ id: 9, x: 100, y: 100, vx: 0, vy: 0, category: 'välfärd' as const, age: 'adult' as const, state: 'biting' as const, variant: 0, biteDeadline: elapsed + 650 }], bitingVoterId: 9 };
    const s = onHookClick(biting, elapsed);
    expect(s.lastEvent?.kind).toBe('catch');
    expect(eventText(s.lastEvent!)).toBe(`Fångst: ${bait.title} · kostnad ${bait.msekBase} msek · källa ex.se (https://ex.se/p/${promises.findIndex((p) => p.title === bait.title)})`);
  });
});
