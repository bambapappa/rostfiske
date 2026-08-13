import { PARTIES, CATEGORIES } from './constants';

// Minimal guaranteed-neutral snapshot: every party gets one promise per
// category (9 each > MIN_PROMISES_PER_PARTY), all aktiv, all with sourced
// fields. This is a LAST-RESORT offline dataset; live play fetches utlovat.se.
export const FALLBACK_PROMISES = PARTIES.flatMap((party) =>
  CATEGORIES.map((cat, i) => ({
    id: `fb-${party}-${cat}`,
    title: `${party.toUpperCase()} löfte om ${cat}`,
    quote: `Reservlöfte (${cat}).`,
    parties: [party],
    category: cat,
    status: 'aktiv',
    cost: { msek_base: 100 * (i + 1) },
    source: { url: `https://utlovat.se`, domain: `utlovat.se` },
  })),
);

// Approximate party colors/blocks (display only; overridden by live data).
export const FALLBACK_PARTIES = [
  { code: 's',  name: 'Socialdemokraterna', color: '#E8112d', color_text: '#ffffff', block: 'rödgrön' },
  { code: 'm',  name: 'Moderaterna',         color: '#1B7FC1', color_text: '#ffffff', block: 'borgerlig' },
  { code: 'sd', name: 'Sverigedemokraterna', color: '#4E9E2C', color_text: '#ffffff', block: 'sd' },
  { code: 'c',  name: 'Centerpartiet',       color: '#00965E', color_text: '#ffffff', block: 'borgerlig' },
  { code: 'v',  name: 'Vänsterpartiet',      color: '#DA291C', color_text: '#ffffff', block: 'rödgrön' },
  { code: 'kd', name: 'Kristdemokraterna',   color: '#231977', color_text: '#ffffff', block: 'borgerlig' },
  { code: 'l',  name: 'Liberalerna',         color: '#006AB3', color_text: '#ffffff', block: 'borgerlig' },
  { code: 'mp', name: 'Miljöpartiet',        color: '#83CF39', color_text: '#111111', block: 'rödgrön' },
];
