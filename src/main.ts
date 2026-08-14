import { fetchGameInput } from './api';
import { loadSprites } from './sprites';
import { createGame, step, onHookClick, type GameState } from './engine';
import { drawScene } from './render';
import { bindInput } from './input';
import { loadStore, saveStore, addScore, bestOf } from './highscore';
import { catchLine } from './ui';
import { LOGICAL_W, LOGICAL_H, PARTIES, ROUND_MS } from './constants';
import { spotById } from './world';

async function main(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  canvas.width = LOGICAL_W; canvas.height = LOGICAL_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const [{ promises, parties }, sprites] = await Promise.all([fetchGameInput(), loadSprites()]);
  const store = loadStore();

  // Simple flow: pick first party by default; full select UI can wrap this later.
  let party = PARTIES[0]!;
  const chosen = (p: typeof party) => {
    party = p;
    start();
  };
  // expose a tiny debug picker
  (window as unknown as { pickParty: (p: typeof party) => void }).pickParty = chosen;

  function start(): void {
    let g: GameState = createGame({ party, promises });
    let now = performance.now();
    let acc = 0;
    const STEP = 1000 / 60;
    const overlay = document.getElementById('overlay');
    let prevCatch: GameState['lastCatch'] = null;

    bindInput(canvas, {
      onSpot: (id) => {
        const s = spotById(id);
        g = { ...g, spotId: id, spotX: s.x, spotY: s.y };
      },
      onHook: () => { g = onHookClick(g, ROUND_MS - g.timeLeftMs); },
      onSelectBait: (slot) => {
        const b = g.tackle[slot]; if (!b) return;
        g = { ...g, tackle: [b, ...g.tackle.filter((x) => x !== b)] };
      },
      isBiting: () => g.bitingVoterId !== null,
    });

    function frame(t: number): void {
      const dt = Math.min(250, t - now); now = t; acc += dt;
      while (acc >= STEP) { g = step(g, STEP); acc -= STEP; }
      // surface each new catch (source attribution, CC BY 4.0) in the overlay
      if (g.lastCatch !== null && g.lastCatch !== prevCatch) {
        prevCatch = g.lastCatch;
        if (overlay) overlay.textContent = catchLine(g.lastCatch);
      }
      drawScene(ctx, g, sprites, parties, t);
      if (g.phase === 'game_over') {
        const rows = addScore(store, { party: g.party, votes: g.votes, released: g.released, at: Date.now() });
        saveStore(rows);
        drawGameOver(ctx, g, bestOf(rows));
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  start(); // begin immediately with default party; select UI can gate this later
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
