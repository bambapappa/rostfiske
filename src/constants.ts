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
export const MAX_VOTERS = 32;
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

// Campaign Trends & News Events
export const TREND_1_START_MS = 20_000; // Trigger at 40s remaining in 60s round (elapsed = 20s)
export const TREND_2_START_MS = 40_000; // Trigger at 20s remaining in 60s round (elapsed = 40s)
export const TREND_DURATION_MS = 12_000; // 12-second duration
export const TREND_ATTRACT_BOOST = 2.5; // 2.5x attraction multiplier for matching voters
export const TREND_SPEED_BOOST = 1.3; // 30% faster walking toward trending bait

export const PARTY_COLORS: Record<PartyCode, string> = {
  s: '#e8112d',
  m: '#005ea1',
  sd: '#ddab00',
  c: '#009933',
  v: '#da291c',
  kd: '#005ea8',
  l: '#006ab3',
  mp: '#83cf39',
};

export const DEFAULT_PARTIES = [
  { code: 's' as const, name: 'Socialdemokraterna', color: '#e8112d', colorText: '#fff', block: 'rödgrön' },
  { code: 'm' as const, name: 'Moderaterna', color: '#005ea1', colorText: '#fff', block: 'borgerlig' },
  { code: 'sd' as const, name: 'Sverigedemokraterna', color: '#ddab00', colorText: '#fff', block: 'sd' },
  { code: 'c' as const, name: 'Centerpartiet', color: '#009933', colorText: '#fff', block: 'borgerlig' },
  { code: 'v' as const, name: 'Vänsterpartiet', color: '#da291c', colorText: '#fff', block: 'rödgrön' },
  { code: 'kd' as const, name: 'Kristdemokraterna', color: '#005ea8', colorText: '#fff', block: 'borgerlig' },
  { code: 'l' as const, name: 'Liberalerna', color: '#006ab3', colorText: '#fff', block: 'borgerlig' },
  { code: 'mp' as const, name: 'Miljöpartiet', color: '#83cf39', colorText: '#fff', block: 'rödgrön' },
];

export const TREND_HEADLINES: Record<Category, string> = {
  'utbildning': 'EXTRA: Partiledardebatt om skolan och utbildning!',
  'välfärd': 'EXTRA: Vård och välfärd i fokus i opinionsmätning!',
  'infrastruktur': 'EXTRA: Tågkaos och infrastruktur debatteras!',
  'skatter': 'EXTRA: Skatteförslagen i hetluften!',
  'klimat-miljö': 'EXTRA: Klimatfrågan engagerar väljarna!',
  'rättsväsende': 'EXTRA: Lag och ordning dominerar nyhetsflödet!',
  'migration': 'EXTRA: Ny migrationsrapport väcker uppmärksamhet!',
  'försvar': 'EXTRA: Säkerhetsläget och försvaret diskuteras!',
  'övrigt': 'EXTRA: Aktuella samhällsfrågor dominerar debatten!',
};

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
export const LEADER_W = 16; // politician caricature cell in politicians.png
export const LEADER_H = 24; // feet on the cell's bottom row (y23)
export const LOGICAL_W = 512;
export const LOGICAL_H = 288; // 16 px tiles → integer grid 32×18 (16:9)
export const TOWN_COLS = 32;
export const TOWN_ROWS = 18;

// Voter appearance (3 bodies × 4 palettes)
export const VOTER_VARIANTS = 12;
