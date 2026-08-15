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
// v1.2 natural wandering: per-voter speed drawn at spawn in [MIN, MAX]
export const VOTER_SPEED_MIN = 10;
export const VOTER_SPEED_MAX = 16;
export const TURN_INTERVAL_MIN_MS = 1000; // new headingTarget drawn this often
export const TURN_INTERVAL_MAX_MS = 3000;
export const TURN_RATE_MAX = 2.5; // rad/s: gradual turn, never an instant reversal
export const IDLE_PROB_PER_SEC = 0.08; // "tittar i skyltfönster" pause chance
export const IDLE_MIN_MS = 500;
export const IDLE_MAX_MS = 1500;
export const ATTRACT_SPEED = 34;
export const MIN_PROMISES_PER_PARTY = 5;

// Angling (lapp)
export const CAST_RADIUS = 110; // px: max cast distance from politician
export const NOTICE_RADIUS = 80; // px: a wandering voter this close may notice the lapp
export const NOTICE_PROB_PER_SEC = 0.4;
export const PICKUP_DIST = 4; // px: voter picks up the lapp when within this distance

// Buildings
export const INSIDE_MIN_MS = 3000;
export const INSIDE_MAX_MS = 10000;
export const ENTER_PROB_PER_SEC = 0.15;

// Rendering
export const TILE = 16;
export const LOGICAL_W = 384;
export const LOGICAL_H = 208; // 16 px tiles → integer grid 24×13
export const TOWN_COLS = 24;
export const TOWN_ROWS = 13;

// Voter appearance (3 bodies × 4 palettes)
export const VOTER_VARIANTS = 12;
