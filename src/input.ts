import { LOGICAL_W, LOGICAL_H } from './constants';
import type { SpotId } from './types';

export interface InputHandlers {
  onSpot: (id: SpotId) => void;
  onHook: () => void;
  /** Cast the lapp to a logical (x, y) in the town. */
  onCast: (x: number, y: number) => void;
  onSelectBait: (slot: number) => void;
  /** True while a voter is on the hook — hook input gets primacy over casting. */
  isBiting: () => boolean;
}

const SPOT_KEYS: Record<string, SpotId> = {
  q: 'torget',
  w: 'skolan',
  e: 'aldreboendet',
  r: 'stationen',
};

export function bindInput(canvas: HTMLCanvasElement, h: InputHandlers): () => void {
  const toLogical = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    const sx = LOGICAL_W / r.width, sy = LOGICAL_H / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };
  const onClick = (e: MouseEvent) => {
    // Hook primacy: while a voter holds the lapp, ANY click is a hook attempt.
    if (h.isBiting()) { h.onHook(); return; }
    const { x, y } = toLogical(e);
    h.onCast(x, y);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space') h.onHook();
    const spot = SPOT_KEYS[e.key.toLowerCase()];
    if (spot) h.onSpot(spot);
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 5) h.onSelectBait(n - 1);
  };
  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  return () => {
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);
  };
}
