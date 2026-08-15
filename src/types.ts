import type { PartyCode, Category } from './constants';

export interface PromiseSource { url: string; domain: string; }

export interface PromiseData {
  id: string;
  title: string;
  quote: string;
  party: PartyCode;
  category: Category;
  msekBase: number;
  status: string;
  source: PromiseSource;
}

export interface PartyData {
  code: PartyCode;
  name: string;
  color: string;
  colorText: string;
  block: string;
}

export interface Bait {
  id: string;
  title: string;
  quote: string;
  category: Category;
  party: PartyCode;
  msekBase: number;
  sourceUrl: string;
  sourceDomain: string;
  durability: number;
  maxDurability: number;
}

export type VoterAge = 'adult' | 'minor';
export type VoterState = 'wander' | 'toLapp' | 'biting' | 'inside';

export interface Voter {
  id: number;
  x: number; y: number;
  speed: number; // px/s — individual wander speed, drawn at spawn
  heading?: number; // radians, current facing (wander model; [0, 2π))
  headingTarget?: number; // radians — heading converges here gradually
  nextTurnAt?: number; // ms (game clock) when a new headingTarget is drawn
  idleUntil?: number; // ms (game clock) while paused ("tittar i skyltfönster")
  category: Category;
  age: VoterAge;
  state: VoterState;
  variant: number; // 0..VOTER_VARIANTS-1 appearance index
  attractToX?: number;
  attractToY?: number;
  biteDeadline?: number; // ms (game clock) when hook window closes
  insideUntil?: number; // ms (game clock) when the voter exits the building
  buildingId?: string; // set while inside a building
}

/** A floating note (lapp) on the water, carrying one bait/promise. */
export interface Lapp {
  x: number;
  y: number;
  baitId: string;
}

export interface Building {
  id: string;
  name: string;
  x: number; y: number; // logical px of the building footprint
  doorX: number; doorY: number; // logical px of the door
  bias: Partial<Record<Category, number>>; // category weight boost when exiting
}

/** Axis-aligned rectangle in logical px (x,y = top-left corner). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GameEventKind =
  | 'cast' | 'napp' | 'catch' | 'release' | 'miss' | 'baitWorn' | 'baitSelected';

export interface GameEvent {
  kind: GameEventKind;
  text: string;
}

export type SpotId =
  | 'torget'
  | 'skolan'
  | 'aldreboendet'
  | 'stationen'
  | 'bageriet'
  | 'biblioteket'
  | 'apoteket';

export interface FishingSpot {
  id: SpotId;
  name: string;
  x: number; y: number; // logical px where the politician stands
  bias: Partial<Record<Category, number>>; // weight multiplier per category
}

export type GamePhase =
  | 'menu' | 'character_select' | 'tackle_select'
  | 'playing' | 'game_over';
