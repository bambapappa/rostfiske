import { describe, it, expect } from 'vitest';
import { formatSummary, catchLine } from '../src/ui';
import { createGame } from '../src/engine';

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
