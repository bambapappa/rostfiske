import { describe, it, expect } from 'vitest';
import { formatSummary } from '../src/ui';
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
