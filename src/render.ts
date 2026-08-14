import { LOGICAL_W, LOGICAL_H } from './constants';
import { SPOTS } from './world';
import { activeBait } from './bait';
import type { GameState } from './engine';
import type { SheetMap } from './sprites';
import type { PartyData } from './types';

const CATEGORY_COLORS: Record<string, string> = {
  välfärd: '#e74c3c', utbildning: '#3498db', skatter: '#f1c40f',
  'klimat-miljö': '#27ae60', rättsväsende: '#9b59b6', migration: '#e67e22',
  infrastruktur: '#7f8c8d', försvar: '#34495e', övrigt: '#bdc3c7',
};

function partyColor(parties: PartyData[], code: string): string {
  return parties.find((p) => p.code === code)?.color ?? '#888';
}

export function drawScene(ctx: CanvasRenderingContext2D, state: GameState, sprites: SheetMap, parties: PartyData[], nowMs: number): void {
  ctx.imageSmoothingEnabled = false;
  // background
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  const city = sprites.get('city');
  if (city) ctx.drawImage(city, 0, 0, LOGICAL_W, LOGICAL_H);

  // spots
  for (const s of SPOTS) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(s.x - 10, s.y - 4, 20, 8);
    ctx.fillStyle = state.spotId === s.id ? '#fff' : '#888';
    ctx.font = '6px monospace';
    ctx.fillText(s.name, s.x - 12, s.y - 8);
  }

  // voters
  const voterImg = sprites.get('voters');
  for (const v of state.voters) {
    const col = CATEGORY_COLORS[v.category] ?? '#fff';
    if (voterImg) {
      ctx.drawImage(voterImg, v.age === 'minor' ? 16 : 0, 0, 16, 16, v.x - 8, v.y - 8, 16, 16);
    } else {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(v.x) - 3, Math.round(v.y) - 3, v.age === 'minor' ? 5 : 7, v.age === 'minor' ? 5 : 7);
    }
    if (v.state === 'biting') {
      ctx.fillStyle = '#ffe66d';
      ctx.fillText('!', Math.round(v.x), Math.round(v.y) - 10);
    }
  }

  // politician
  const pcol = partyColor(parties, state.party);
  const pol = sprites.get('politicians');
  if (pol) ctx.drawImage(pol, 0, 0, 16, 16, state.spotX - 8, state.spotY - 16, 16, 16);
  else { ctx.fillStyle = pcol; ctx.fillRect(state.spotX - 3, state.spotY - 12, 6, 12); }

  // HUD
  const bait = activeBait(state.tackle);
  ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`Röster: ${state.votes}`, 4, 10);
  ctx.fillText(`Släppta: ${state.released}`, 4, 20);
  ctx.fillText(`Tid: ${Math.ceil(state.timeLeftMs / 1000)}s`, 4, 30);
  ctx.textAlign = 'right';
  // CC BY 4.0: the source domain always accompanies the bait label.
  ctx.fillText(bait ? `${bait.title.slice(0,18)} (${bait.durability}) · ${bait.sourceDomain}` : 'Inget bete!', LOGICAL_W - 4, 10);
  ctx.textAlign = 'left';
}
