import type { PartyCode } from './constants';

export interface ScoreRow { party: PartyCode; votes: number; released: number; at: number; }

const KEY = 'rostfiske.highscore.v1';
const MAX = 10;

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; }

function storage(): StorageLike {
  return typeof localStorage !== 'undefined' ? localStorage : memStore;
}
const memStore: StorageLike = { getItem: () => null, setItem: () => {} };

export function loadStore(): ScoreRow[] {
  try {
    const raw = storage().getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveStore(rows: ScoreRow[]): void {
  try { storage().setItem(KEY, JSON.stringify(rows.slice(0, MAX))); } catch { /* ignore */ }
}

export function bestOf(rows: ScoreRow[]): number {
  return rows.reduce((m, r) => Math.max(m, r.votes), 0);
}

export function addScore(rows: ScoreRow[], row: ScoreRow): ScoreRow[] {
  return [...rows, row].sort((a, b) => b.votes - a.votes).slice(0, MAX);
}
