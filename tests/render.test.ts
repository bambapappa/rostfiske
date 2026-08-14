import { describe, it, expect } from 'vitest';
import { drawScene } from '../src/render';
import { createGame } from '../src/engine';
import type { PartyData } from '../src/types';

function stubCtx(): { ctx: CanvasRenderingContext2D; texts: string[] } {
  const texts: string[] = [];
  const record = (s: string) => { texts.push(s); };
  const ctx = {
    imageSmoothingEnabled: true,
    fillRect: () => {}, clearRect: () => {}, drawImage: () => {},
    fillText: record, beginPath: () => {}, arc: () => {}, fill: () => {}, stroke: () => {},
    fillStyle: '', strokeStyle: '', font: '', textAlign: '',
  } as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

describe('drawScene', () => {
  it('does not throw on a fresh game', () => {
    const g = createGame({ party: 's', promises: Array.from({length:6},(_,i)=>({id:'p'+i,title:'t',quote:'q',party:'s',category:'välfärd',msekBase:1,status:'aktiv',source:{url:'u',domain:'d'}})) });
    const parties: PartyData[] = [{code:'s',name:'S',color:'#E8112d',colorText:'#fff',block:'rödgrön'}];
    expect(() => drawScene(stubCtx().ctx, g, new Map(), parties, 0)).not.toThrow();
  });

  it('renders the bait source domain in the HUD (CC BY 4.0 attribution)', () => {
    const g = createGame({ party: 's', promises: Array.from({length:6},(_,i)=>({id:'p'+i,title:'Löfte '+i,quote:'q',party:'s',category:'välfärd',msekBase:1,status:'aktiv',source:{url:'https://utlovat.se/p/'+i,domain:'utlovat.se'}})) });
    const parties: PartyData[] = [{code:'s',name:'S',color:'#E8112d',colorText:'#fff',block:'rödgrön'}];
    const { ctx, texts } = stubCtx();
    drawScene(ctx, g, new Map(), parties, 0);
    const bait = g.tackle[0]!;
    const hud = texts.find((t) => t.includes(bait.title.slice(0, 18)));
    expect(hud).toBeDefined();
    expect(hud!).toContain('utlovat.se');
    expect(hud!).toContain(`(${bait.durability})`);
  });
});
