import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bindInput } from '../src/input';
import { LOGICAL_W, LOGICAL_H } from '../src/constants';
import type { InputHandlers } from '../src/input';
import type { SpotId } from '../src/types';

type Listener = (e: unknown) => void;

class FakeCanvas {
  listeners = new Map<string, Listener>();
  rect = { left: 0, top: 0, width: LOGICAL_W, height: LOGICAL_H };
  addEventListener = (type: string, fn: Listener) => { this.listeners.set(type, fn); };
  removeEventListener = (type: string) => { this.listeners.delete(type); };
  getBoundingClientRect = () => ({ ...this.rect, x: 0, y: 0, toJSON: () => ({}) });
}

interface Calls {
  spot: SpotId[];
  hook: number[];
  cast: Array<{ x: number; y: number }>;
  bait: number[];
}

function handlers(): { h: InputHandlers; calls: Calls } {
  const calls: Calls = { spot: [], hook: [], cast: [], bait: [] };
  return {
    calls,
    h: {
      onSpot: (id) => { calls.spot.push(id); },
      onHook: () => { calls.hook.push(1); },
      onCast: (x, y) => { calls.cast.push({ x, y }); },
      onSelectBait: (slot) => { calls.bait.push(slot); },
      isBiting: () => false,
    },
  };
}

describe('bindInput', () => {
  let windowStub: { addEventListener: (t: string, f: Listener) => void; removeEventListener: (t: string) => void } | undefined;

  beforeEach(() => {
    windowStub = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as Record<string, unknown>).window = windowStub;
  });
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
  });

  const click = (canvas: FakeCanvas, x: number, y: number) =>
    (canvas.listeners.get('click') as (e: unknown) => void)({ clientX: x, clientY: y });

  it('routes a click to onHook while a voter is biting (hook primacy)', () => {
    const canvas = new FakeCanvas();
    const { h, calls } = handlers();
    bindInput(canvas as unknown as HTMLCanvasElement, { ...h, isBiting: () => true });
    click(canvas, 100, 60);
    expect(calls.hook).toHaveLength(1);
    expect(calls.cast).toHaveLength(0);
  });

  it('routes a click without a bite to onCast with logical coordinates', () => {
    const canvas = new FakeCanvas();
    const { h, calls } = handlers();
    bindInput(canvas as unknown as HTMLCanvasElement, h);
    click(canvas, 123, 45);
    expect(calls.cast).toEqual([{ x: 123, y: 45 }]);
    expect(calls.hook).toHaveLength(0);
  });

  it('scales CSS coordinates to logical coordinates before casting', () => {
    const canvas = new FakeCanvas();
    canvas.rect = { left: 0, top: 0, width: LOGICAL_W * 2, height: LOGICAL_H * 2 };
    const { h, calls } = handlers();
    bindInput(canvas as unknown as HTMLCanvasElement, h);
    click(canvas, 200, 100);
    expect(calls.cast).toEqual([{ x: 100, y: 50 }]);
  });

  describe('keys', () => {
    interface WinStub {
      addEventListener: (t: string, f: Listener) => void;
      removeEventListener: (t: string) => void;
      listeners: Record<string, Listener>;
    }
    beforeEach(() => {
      const stub: WinStub = { listeners: {}, addEventListener: () => {}, removeEventListener: () => {} };
      stub.addEventListener = (t, f) => { stub.listeners[t] = f; };
      (globalThis as Record<string, unknown>).window = stub;
    });
    const press = (canvas: FakeCanvas, key: string, code = key) => {
      const win = ((globalThis as Record<string, unknown>).window as WinStub);
      (win.listeners['keydown'] as (e: unknown) => void)({ key, code });
    };

    it('q/w/e/r select the four spots', () => {
      const canvas = new FakeCanvas();
      const { h, calls } = handlers();
      bindInput(canvas as unknown as HTMLCanvasElement, h);
      for (const k of ['q', 'w', 'e', 'r']) press(canvas, k);
      expect(calls.spot).toEqual(['torget', 'skolan', 'aldreboendet', 'stationen']);
    });

    it('1–5 select bait slots 0–4', () => {
      const canvas = new FakeCanvas();
      const { h, calls } = handlers();
      bindInput(canvas as unknown as HTMLCanvasElement, h);
      for (const k of ['1', '2', '3', '4', '5']) press(canvas, k);
      expect(calls.bait).toEqual([0, 1, 2, 3, 4]);
    });

    it('Space hooks', () => {
      const canvas = new FakeCanvas();
      const { h, calls } = handlers();
      bindInput(canvas as unknown as HTMLCanvasElement, h);
      press(canvas, ' ', 'Space');
      expect(calls.hook).toHaveLength(1);
    });

    it('other keys do nothing', () => {
      const canvas = new FakeCanvas();
      const { h, calls } = handlers();
      bindInput(canvas as unknown as HTMLCanvasElement, h);
      press(canvas, 'z', 'KeyZ');
      press(canvas, '6', 'Digit6');
      expect(calls.spot).toHaveLength(0);
      expect(calls.bait).toHaveLength(0);
      expect(calls.hook).toHaveLength(0);
    });
  });
});
