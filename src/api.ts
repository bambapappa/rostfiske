import type { PromiseData, PartyData } from './types';
import { CATEGORIES, PARTIES, type PartyCode, type Category } from './constants';
import { FALLBACK_PROMISES, FALLBACK_PARTIES } from './fallback';

const DEFAULT_PROMISES_URL = 'https://utlovat.se/api/v1/promises.json';
const DEFAULT_PARTIES_URL = 'https://utlovat.se/api/v1/parties.json';

const asCategory = (x: unknown): Category =>
  CATEGORIES.includes(x as Category) ? (x as Category) : 'övrigt';
const asParty = (x: unknown): PartyCode =>
  PARTIES.includes(x as PartyCode) ? (x as PartyCode) : 's';

export function validatePromises(raw: any): PromiseData[] {
  const data = Array.isArray(raw?.data) ? raw.data : [];
  return data
    .filter((p: any) => p && typeof p.id === 'string' && p.status === 'aktiv')
    .map((p: any): PromiseData => ({
      id: p.id,
      title: typeof p.title === 'string' ? p.title : '',
      quote: typeof p.quote === 'string' ? p.quote : '',
      party: asParty(Array.isArray(p.parties) ? p.parties[0] : p.parties),
      category: asCategory(p.category),
      msekBase: Number(p?.cost?.msek_base) || 0,
      status: 'aktiv',
      source: {
        url: typeof p?.source?.url === 'string' ? p.source.url : '',
        domain: typeof p?.source?.domain === 'string' ? p.source.domain : '',
      },
    }));
}

export function validateParties(raw: any): PartyData[] {
  const data = Array.isArray(raw?.data) ? raw.data : [];
  return data
    .filter((p: any) => p && PARTIES.includes(p.code))
    .map((p: any): PartyData => ({
      code: p.code,
      name: typeof p.name === 'string' ? p.name : p.code,
      color: typeof p.color === 'string' ? p.color : '#888888',
      colorText: typeof p.color_text === 'string' ? p.color_text : '#111111',
      block: typeof p.block === 'string' ? p.block : 'övrigt',
    }));
}

export function promisesForParty(promises: PromiseData[], party: PartyCode): PromiseData[] {
  return promises.filter((p) => p.party === party);
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchGameInput(src?: { promisesUrl?: string; partiesUrl?: string }) {
  try {
    const [promisesRaw, partiesRaw] = await Promise.all([
      fetchWithTimeout(src?.promisesUrl ?? DEFAULT_PROMISES_URL),
      fetchWithTimeout(src?.partiesUrl ?? DEFAULT_PARTIES_URL),
    ]);
    const promises = validatePromises(promisesRaw);
    const parties = validateParties(partiesRaw);
    if (promises.length === 0 || parties.length === 0) throw new Error('empty payload');
    return { promises, parties };
  } catch {
    return {
      promises: validatePromises({ data: FALLBACK_PROMISES }),
      parties: validateParties({ data: FALLBACK_PARTIES }),
    };
  }
}
