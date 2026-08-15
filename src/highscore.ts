import { PARTIES, type PartyCode, type Category } from './constants';

export interface ScoreRow {
  party: PartyCode;
  votes: number;
  released: number;
  at: number;
}

export interface MandateResult {
  mandates: number;
  statusText: string;
  passedThreshold: boolean;
}

export interface CategoryBreakdown {
  category: Category;
  count: number;
  percentage: number;
}

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

export function bestByParty(rows: ScoreRow[]): Record<PartyCode, number> {
  const result: Record<PartyCode, number> = {
    s: 0,
    m: 0,
    sd: 0,
    c: 0,
    v: 0,
    kd: 0,
    l: 0,
    mp: 0,
  };
  for (const r of rows) {
    if (r.party in result) {
      result[r.party] = Math.max(result[r.party], r.votes);
    }
  }
  return result;
}

export function calculateMandates(votes: number): MandateResult {
  if (votes <= 3) {
    return {
      mandates: 0,
      statusText: 'Under 4%-spärren',
      passedThreshold: false,
    };
  }
  if (votes <= 7) {
    return {
      mandates: Math.round(15 + (votes - 4) * 4),
      statusText: 'Över riksdagsspärren',
      passedThreshold: true,
    };
  }
  if (votes <= 14) {
    return {
      mandates: Math.round(35 + (votes - 8) * 5),
      statusText: 'Starkt valresultat',
      passedThreshold: true,
    };
  }
  return {
    mandates: Math.min(349, Math.round(75 + (votes - 15) * 6)),
    statusText: 'Valsensation',
    passedThreshold: true,
  };
}

export function calculateIssueBreakdown(
  history: Array<{ category: Category }>
): CategoryBreakdown[] {
  if (!history || history.length === 0) return [];
  const total = history.length;
  const counts = new Map<Category, number>();
  for (const item of history) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  const result: CategoryBreakdown[] = [];
  for (const [category, count] of counts.entries()) {
    result.push({
      category,
      count,
      percentage: Math.round((count / total) * 100),
    });
  }
  return result.sort((a, b) => b.count - a.count);
}

