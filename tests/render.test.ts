import { describe, it, expect } from 'vitest';
import { drawScene } from '../src/render';
import { createGame } from '../src/engine';
import type { GameState } from '../src/engine';
import type { PartyData } from '../src/types';

function stubCtx() {
  const noop = () => {};
  return {
    imageSmoothingEnabled: true,
    fillRect: noop, clearRect: noop, drawImage: noop,
    fillText: noop, beginPath: noop, arc: noop, fill: noop, stroke: noop,
    fillStyle: '', strokeStyle: '', font: '', textAlign: '',
  } as unknown as CanvasRenderingContext2D;
}

describe('drawScene', () => {
  it('does not throw on a fresh game', () => {
    const g = createGame({ party: 's', promises: Array.from({length:6},(_,i)=>({id:'p'+i,title:'t',quote:'q',party:'s',category:'välfärd',msekBase:1,status:'aktiv',source:{url:'u',domain:'d'}})) });
    const parties: PartyData[] = [{code:'s',name:'S',color:'#E8112d',colorText:'#fff',block:'rödgrön'}];
    expect(() => drawScene(stubCtx(), g, new Map(), parties, 0)).not.toThrow();
  });
});
