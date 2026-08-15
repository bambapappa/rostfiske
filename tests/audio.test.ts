import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initAudio,
  playSound,
  toggleMute,
  isMuted,
  setMuted,
  getAudioContext,
  resetAudioForTesting,
  type SoundEffect,
} from '../src/audio';

describe('audio manager & procedural sfx engine', () => {
  let originalAudioContext: unknown;
  const hasOriginalLocalStorage = 'localStorage' in globalThis;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    originalAudioContext = (globalThis as unknown as { AudioContext: unknown }).AudioContext;
    resetAudioForTesting();
  });

  afterEach(() => {
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
    if (typeof window !== 'undefined') {
      (window as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
    }
    if (hasOriginalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
    resetAudioForTesting();
  });

  describe('mute management', () => {
    it('defaults to unmuted when localStorage has no entry', () => {
      expect(isMuted()).toBe(false);
    });

    it('toggles mute state and returns new state', () => {
      expect(toggleMute()).toBe(true);
      expect(isMuted()).toBe(true);
      expect(toggleMute()).toBe(false);
      expect(isMuted()).toBe(false);
    });

    it('allows setting mute state explicitly with setMuted', () => {
      setMuted(true);
      expect(isMuted()).toBe(true);
      setMuted(false);
      expect(isMuted()).toBe(false);
    });

    it('persists mute state to localStorage under rostfiske_muted', () => {
      const store: Record<string, string> = {};
      const fakeStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => {},
        key: () => null,
        length: 0,
      } as Storage;

      globalThis.localStorage = fakeStorage;
      resetAudioForTesting();

      toggleMute();
      expect(fakeStorage.getItem('rostfiske_muted')).toBe('true');

      toggleMute();
      expect(fakeStorage.getItem('rostfiske_muted')).toBe('false');
    });

    it('reads initial mute state from localStorage', () => {
      const store: Record<string, string> = { rostfiske_muted: 'true' };
      const fakeStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => {},
        key: () => null,
        length: 0,
      } as Storage;

      globalThis.localStorage = fakeStorage;
      resetAudioForTesting();

      expect(isMuted()).toBe(true);
    });

    it('handles localStorage throwing errors gracefully without crashing', () => {
      const throwingStorage = {
        getItem: () => { throw new Error('Storage disabled'); },
        setItem: () => { throw new Error('Storage quota exceeded'); },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      } as Storage;

      globalThis.localStorage = throwingStorage;
      resetAudioForTesting();

      expect(isMuted()).toBe(false);
      expect(() => toggleMute()).not.toThrow();
      expect(isMuted()).toBe(true);
    });
  });

  describe('safety in headless / non-audio environments', () => {
    beforeEach(() => {
      (globalThis as unknown as { AudioContext: unknown }).AudioContext = undefined;
      (globalThis as unknown as { webkitAudioContext: unknown }).webkitAudioContext = undefined;
    });

    it('initAudio does not throw when AudioContext is missing', () => {
      expect(() => initAudio()).not.toThrow();
      expect(getAudioContext()).toBeNull();
    });

    it('playSound handles all sound kinds safely without throwing when AudioContext is missing', () => {
      const kinds: SoundEffect[] = ['cast', 'bite', 'catch', 'release', 'click', 'trend', 'game_over'];
      for (const kind of kinds) {
        expect(() => playSound(kind)).not.toThrow();
      }
    });
  });

  describe('procedural synthesis with mocked AudioContext', () => {
    interface MockNode {
      connect: (target: unknown) => MockNode;
      disconnect?: () => void;
    }

    interface MockGainNode extends MockNode {
      gain: {
        value: number;
        setValueAtTime: (val: number, time: number) => void;
        linearRampToValueAtTime: (val: number, time: number) => void;
        exponentialRampToValueAtTime: (val: number, time: number) => void;
      };
    }

    interface MockOscillatorNode extends MockNode {
      type: OscillatorType;
      frequency: {
        value: number;
        setValueAtTime: (val: number, time: number) => void;
        linearRampToValueAtTime: (val: number, time: number) => void;
        exponentialRampToValueAtTime: (val: number, time: number) => void;
      };
      start: (time?: number) => void;
      stop: (time?: number) => void;
    }

    let createdOscillators: MockOscillatorNode[];
    let createdGains: MockGainNode[];
    let resumeCalled: boolean;

    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = 'suspended';
      destination = { connect: () => {} };

      createGain(): MockGainNode {
        const gainNode: MockGainNode = {
          gain: {
            value: 1,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn().mockReturnThis(),
          disconnect: vi.fn(),
        };
        createdGains.push(gainNode);
        return gainNode;
      }

      createOscillator(): MockOscillatorNode {
        const oscNode: MockOscillatorNode = {
          type: 'sine',
          frequency: {
            value: 440,
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          start: vi.fn(),
          stop: vi.fn(),
          connect: vi.fn().mockReturnThis(),
          disconnect: vi.fn(),
        };
        createdOscillators.push(oscNode);
        return oscNode;
      }

      async resume(): Promise<void> {
        resumeCalled = true;
        this.state = 'running';
      }
    }

    beforeEach(() => {
      createdOscillators = [];
      createdGains = [];
      resumeCalled = false;
      (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
      if (typeof window !== 'undefined') {
        (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
      }
      resetAudioForTesting();
    });

    it('resumes suspended context when initAudio is called', () => {
      initAudio();
      expect(resumeCalled).toBe(true);
      expect(getAudioContext()).not.toBeNull();
    });

    it('does not play sounds or create nodes when muted', () => {
      setMuted(true);
      playSound('catch');
      expect(createdOscillators.length).toBe(0);
      expect(createdGains.length).toBe(0);
    });

    it('synthesizes cast sound effect', () => {
      playSound('cast');
      expect(createdOscillators.length).toBeGreaterThanOrEqual(1);
      expect(createdGains.length).toBeGreaterThanOrEqual(1);
      expect(createdOscillators[0]!.start).toHaveBeenCalled();
      expect(createdOscillators[0]!.stop).toHaveBeenCalled();
    });

    it('synthesizes bite sound effect with double chirp', () => {
      playSound('bite');
      expect(createdOscillators.length).toBe(2);
      expect(createdGains.length).toBe(2);
      expect(createdOscillators[0]!.start).toHaveBeenCalled();
      expect(createdOscillators[1]!.start).toHaveBeenCalled();
    });

    it('synthesizes catch arpeggio with 3 ascending notes', () => {
      playSound('catch');
      expect(createdOscillators.length).toBe(3);
      expect(createdGains.length).toBe(3);
    });

    it('synthesizes release descending dual tone', () => {
      playSound('release');
      expect(createdOscillators.length).toBeGreaterThanOrEqual(1);
      expect(createdGains.length).toBeGreaterThanOrEqual(1);
    });

    it('synthesizes click pulse', () => {
      playSound('click');
      expect(createdOscillators.length).toBe(1);
      expect(createdGains.length).toBe(1);
    });

    it('synthesizes trend dual alert chime', () => {
      playSound('trend');
      expect(createdOscillators.length).toBe(2);
      expect(createdGains.length).toBe(2);
    });

    it('synthesizes game_over 4-note cadence', () => {
      playSound('game_over');
      expect(createdOscillators.length).toBe(4);
      expect(createdGains.length).toBe(4);
    });
  });
});
