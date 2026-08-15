import { fetchGameInput } from './api';
import { loadSprites } from './sprites';
import { createGame, step, onHookClick, castLapp, type GameState } from './engine';
import { drawScene } from './render';
import { bindInput } from './input';
import { loadStore, saveStore, addScore, bestOf } from './highscore';
import { eventText, showCharacterSelect, renderTackle, renderBuildingBadges } from './ui';
import { activeBait } from './bait';
import { LOGICAL_W, LOGICAL_H, ROUND_MS, type PartyCode } from './constants';
import { SPOTS, spotById } from './world';
import type { SpotId } from './types';

async function main(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  canvas.width = LOGICAL_W; canvas.height = LOGICAL_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const [{ promises, parties }, sprites] = await Promise.all([fetchGameInput(), loadSprites()]);
  const store = loadStore();
  const overlay = document.getElementById('overlay');
  const tacklePanel = document.getElementById('tackle');
  const badgesContainer = document.getElementById('badges');

  // Start flow: character select → game. All 8 parties presented identically
  // (same frame, same 48×72 pixel portrait, PARTIES order).
  const select = document.getElementById('select');
  if (select) {
    showCharacterSelect(select, parties, sprites.get('politicians'), (party: PartyCode) => {
      select.textContent = '';
      start(party);
    });
  } else {
    // no container in the document: nothing to play from
    console.warn('rostfiske: #select saknas');
    return;
  }

  function start(party: PartyCode): void {
    let g: GameState = createGame({ party, promises });
    let now = performance.now();
    let acc = 0;
    const STEP = 1000 / 60;
    let prevEvent: GameState['lastEvent'] = null;
    // tackle-panel change detection: the engine treats tackle immutably, so
    // array identity only changes when a bait wears, is swapped to front, or
    // the active bait id changes (same trick as lastEvent above)
    let prevTackle: GameState['tackle'] | null = null;
    let prevActiveId: string | null | undefined;

    const setSpot = (id: SpotId): void => {
      const s = spotById(id);
      g = { ...g, spotId: id, spotX: s.x, spotY: s.y };
      if (badgesContainer) {
        renderBuildingBadges(badgesContainer, SPOTS, g.spotId, setSpot);
      }
    };

    if (badgesContainer) {
      renderBuildingBadges(badgesContainer, SPOTS, g.spotId, setSpot);
    }

    // shared bait selection: the 1–5 keys and the panel clicks use this
    const selectBait = (slot: number): void => {
      const b = g.tackle[slot]; if (!b) return;
      g = {
        ...g,
        tackle: [b, ...g.tackle.filter((x) => x !== b)],
        lastEvent: { kind: 'baitSelected', text: `Bete ${slot + 1}: ${b.title}` },
      };
    };

    const unbind = bindInput(canvas, {
      onSpot: setSpot,
      onHook: () => { g = onHookClick(g, ROUND_MS - g.timeLeftMs); },
      onCast: (x, y) => { g = castLapp(g, x, y); },
      onSelectBait: selectBait,
      isBiting: () => g.bitingVoterId !== null,
    });

    function frame(t: number): void {
      const dt = Math.min(250, t - now); now = t; acc += dt;
      while (acc >= STEP) { g = step(g, STEP); acc -= STEP; }
      // event splash: surface each new event (catch/release keep their source line)
      if (g.lastEvent !== null && g.lastEvent !== prevEvent) {
        prevEvent = g.lastEvent;
        if (overlay) overlay.textContent = eventText(g.lastEvent);
      }
      // tackle panel: rebuild only when the tackle array or active bait changed
      const activeId = activeBait(g.tackle)?.id ?? null;
      if (tacklePanel && (g.tackle !== prevTackle || activeId !== prevActiveId)) {
        prevTackle = g.tackle;
        prevActiveId = activeId;
        renderTackle(tacklePanel, g.tackle, activeId, selectBait);
      }
      drawScene(ctx, g, sprites, parties, t);
      if (g.phase === 'game_over') {
        unbind();
        const rows = addScore(store, { party: g.party, votes: g.votes, released: g.released, at: Date.now() });
        saveStore(rows);
        drawGameOver(ctx, g, bestOf(rows));
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, g: GameState, best: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('Valdagen är över', LOGICAL_W / 2, LOGICAL_H / 2 - 10);
  ctx.fillText(`Röster: ${g.votes}   Bäst: ${best}`, LOGICAL_W / 2, LOGICAL_H / 2 + 6);
  ctx.fillText('Ladda om för att spela igen', LOGICAL_W / 2, LOGICAL_H / 2 + 22);
  ctx.textAlign = 'left';
}

main();
