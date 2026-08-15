export type SoundEffect =
  | 'cast'
  | 'bite'
  | 'catch'
  | 'release'
  | 'click'
  | 'trend'
  | 'game_over';

const MUTE_STORAGE_KEY = 'rostfiske_muted';

let audioCtx: AudioContext | null = null;
let muted: boolean = loadMutePreference();

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
      return (globalThis as unknown as { localStorage: Storage }).localStorage;
    }
  } catch {
    // storage not accessible
  }
  return null;
}

function loadMutePreference(): boolean {
  try {
    const storage = getStorage();
    if (storage) {
      return storage.getItem(MUTE_STORAGE_KEY) === 'true';
    }
  } catch {
    // localStorage may throw in restricted iframes or disabled privacy modes
  }
  return false;
}

function saveMutePreference(val: boolean): void {
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(MUTE_STORAGE_KEY, String(val));
    }
  } catch {
    // ignore storage write errors
  }
}

/** Check if audio is currently muted. */
export function isMuted(): boolean {
  return muted;
}

/** Explicitly set mute state and persist to localStorage. */
export function setMuted(val: boolean): void {
  muted = val;
  saveMutePreference(val);
}

/** Toggle mute state, persist to localStorage, and return the new mute state. */
export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

function getAudioContextConstructor(): (new () => AudioContext) | undefined {
  try {
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        AudioContext?: new () => AudioContext;
        webkitAudioContext?: new () => AudioContext;
      };
      if (win.AudioContext) return win.AudioContext;
      if (win.webkitAudioContext) return win.webkitAudioContext;
    }
  } catch {
    // window lookup failed
  }
  try {
    if (typeof globalThis !== 'undefined') {
      const glob = globalThis as unknown as {
        AudioContext?: new () => AudioContext;
        webkitAudioContext?: new () => AudioContext;
      };
      if (glob.AudioContext) return glob.AudioContext;
      if (glob.webkitAudioContext) return glob.webkitAudioContext;
    }
  } catch {
    // global lookup failed
  }
  return undefined;
}

/** Obtain the active AudioContext, initializing it lazily if possible. */
export function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    const AudioCtxClass = getAudioContextConstructor();
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

/** Initialize audio context on user gesture and resume if suspended. */
export function initAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/** Reset audio manager state for testing purposes. */
export function resetAudioForTesting(): void {
  audioCtx = null;
  muted = loadMutePreference();
}

/** Play a procedural 8-bit sound effect without external audio files. */
export function playSound(kind: SoundEffect): void {
  if (muted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const t0 = ctx.currentTime;

    switch (kind) {
      case 'cast': {
        // Soft pitch sweep: 300Hz -> 150Hz over 80ms
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t0);
        osc.frequency.exponentialRampToValueAtTime(150, t0 + 0.08);

        gain.gain.setValueAtTime(0.12, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.08);
        break;
      }

      case 'bite': {
        // Sharp double chirp ('!' signal): 880Hz then 1200Hz
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(880, t0);
        gain1.gain.setValueAtTime(0.15, t0);
        gain1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.035);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t0);
        osc1.stop(t0 + 0.035);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1200, t0 + 0.05);
        gain2.gain.setValueAtTime(0.18, t0 + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.085);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t0 + 0.05);
        osc2.stop(t0 + 0.085);
        break;
      }

      case 'catch': {
        // 3-note ascending arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
        const notes = [523.25, 659.25, 783.99];
        const step = 0.065;
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startT = t0 + idx * step;
          const dur = idx === notes.length - 1 ? 0.09 : step;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startT);
          gain.gain.setValueAtTime(0.16, startT);
          gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startT);
          osc.stop(startT + dur);
        });
        break;
      }

      case 'release': {
        // Gentle descending dual tone: 400Hz -> 200Hz over 140ms
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t0);
        osc.frequency.exponentialRampToValueAtTime(200, t0 + 0.14);

        gain.gain.setValueAtTime(0.14, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t0);
        osc.stop(t0 + 0.14);
        break;
      }

      case 'click': {
        // Crisp 8ms pulse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, t0);
        gain.gain.setValueAtTime(0.12, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.008);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.008);
        break;
      }

      case 'trend': {
        // Dual news alert chime: 587Hz (D5) -> 880Hz (A5)
        const chimeNotes = [587.33, 880.00];
        const step = 0.08;
        chimeNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startT = t0 + idx * step;
          const dur = 0.12;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startT);
          gain.gain.setValueAtTime(0.15, startT);
          gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startT);
          osc.stop(startT + dur);
        });
        break;
      }

      case 'game_over': {
        // 4-note cadence: G4 (392Hz) -> E4 (330Hz) -> C4 (262Hz) -> A3 (220Hz)
        const cadence = [392.00, 329.63, 261.63, 220.00];
        const step = 0.095;
        cadence.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startT = t0 + idx * step;
          const dur = idx === cadence.length - 1 ? 0.18 : step;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startT);
          gain.gain.setValueAtTime(0.16, startT);
          gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startT);
          osc.stop(startT + dur);
        });
        break;
      }
    }
  } catch {
    // Ignore audio rendering errors
  }
}
