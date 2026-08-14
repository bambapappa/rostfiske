import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bindInput } from '../src/input';
import { SPOTS } from '../src/world';
import { LOGICAL_W, LOGICAL_H } from '../src/constants';
import type { InputHandlers } from '../src/input';
import type { SpotId } from '../src/types';

type Listener = (e: unknown) => void;

class FakeCanvas {
  listeners = new Map<string, Listener>();
  addEventListener = (type: string, fn: Listener) => { this.listeners.set(type, fn); };
  removeEventListener = (type: string) => { this.listeners.delete(type); };
  getBoundingClientRect = () => ({ left: 0, top: 0, width: LOGICAL_W, height: LOGICAL_H, x: 0, y: 0, toJSON: () => ({}) });
}

function handlers(): { h: InputHandlers; calls: { spot: SpotId[]; hook: number[]; bait: number[] } } {
  const calls = { spot: [] as SpotId[], hook: [] as number[], bait: [] as number[] };
  return {
    calls,
    h: {
      onSpot: (id) => { calls.spot.push(id); },
      onHook: () => { calls.hook.push(1); },
      onSelectBait: (slot) => { calls.bait.push(slot); },
      isBiting: () => false,
    },
  };
}

describe('bindInput click routing', () => {
  let windowStub: { addEventListener: (t: string, f: Listener) => void; removeEventListener: (t: string) => void } | undefined;

  beforeEach(() => {
    windowStub = { addEventListener: () => {}, removeEventListener: () => {} };
    (globalThis as Record<string, unknown>).window = windowStub;
  });
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
  });

  const spot = SPOTS[0]!; // torget, politician stands here
  const click = (canvas: FakeCanvas, x: number, y: number) =>
    (canvas.listeners.get('click') as (e: unknown) => void)({ clientX: x, clientY: y });

  it('routes clicks on a spot to onHook (not onSpot) while a voter is biting', () => {
    const canvas = new FakeCanvas();
    const { h, calls } = handlers();
    bindInput(canvas as unknown as HTMLCanvasElement, { ...h, isBiting: () => true });
    click(canvas, spot.x, spot.y); // inside the spot hitbox, biter on the hook
    expect(calls.hook).toHaveLength(1);
    expect(calls.spot).toHaveLength(0);
  });

  it('routes clicks on a spot to onSpot when nobody is biting', () => {
    const canvas = new FakeCanvas();
    const { h, calls } = handlers();
    bindInput(canvas as unknown as HTMLCanvasElement, { ...h, isBiting: () => false });
    click(canvas, spot.x, spot.y);
    expect(calls.spot).toEqual([spot.id]);
    expect(calls.hook).toHaveLength(0);
  });

  it('routes off-spot clicks to onHook regardless of biting', () => {
    const canvas = new FakeCanvas();
    const { h, calls } = handlers();
    bindInput(canvas as unknown as HTMLCanvasElement, { ...h, isBiting: () => false });
    click(canvas, 10, 10); // far from every spot
    expect(calls.hook).toHaveLength(1);
    expect(calls.spot).toHaveLength(0);
  });
});
