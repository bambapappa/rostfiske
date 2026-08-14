import { LOGICAL_W, LOGICAL_H } from './constants';
import { SPOTS } from './world';
import type { SpotId } from './types';

export interface InputHandlers {
  onSpot: (id: SpotId) => void;
  onHook: () => void;
  onSelectBait: (slot: number) => void;
}

export function bindInput(canvas: HTMLCanvasElement, h: InputHandlers): () => void {
  const toLogical = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    const sx = LOGICAL_W / r.width, sy = LOGICAL_H / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };
  const onClick = (e: MouseEvent) => {
    const { x, y } = toLogical(e);
    const hit = SPOTS.find((s) => Math.abs(s.x - x) < 14 && Math.abs(s.y - y) < 10);
    if (hit) h.onSpot(hit.id);
    else h.onHook();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space') h.onHook();
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
