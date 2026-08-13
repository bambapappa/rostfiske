export const PARTIES = ['s','m','sd','c','v','kd','l','mp'] as const;
export type PartyCode = typeof PARTIES[number];

export const CATEGORIES = [
  'välfärd','utbildning','skatter','klimat-miljö',
  'rättsväsende','migration','infrastruktur','försvar','övrigt',
] as const;
export type Category = typeof CATEGORIES[number];

// Balance
export const ROUND_MS = 180_000;
export const HOOK_WINDOW_MS = 650;
export const BAIT_DURABILITY = 6;
export const TACKLE_SIZE = 5;
export const MINOR_PROBABILITY = 0.15;
export const MAX_VOTERS = 24;
export const VOTER_SPEED = 18;
export const ATTRACT_SPEED = 34;
export const MIN_PROMISES_PER_PARTY = 5;

// Rendering
export const TILE = 16;
export const LOGICAL_W = 384;
export const LOGICAL_H = 216;
