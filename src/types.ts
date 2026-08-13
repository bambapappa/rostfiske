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
export type VoterState = 'wander' | 'attracted' | 'biting' | 'caught';

export interface Voter {
  id: number;
  x: number; y: number; vx: number; vy: number;
  category: Category;
  age: VoterAge;
  state: VoterState;
  attractToX?: number;
  attractToY?: number;
  biteDeadline?: number; // ms (game clock) when hook window closes
}

export type SpotId = 'torget' | 'skolan' | 'aldreboendet' | 'stationen';

export interface FishingSpot {
  id: SpotId;
  name: string;
  x: number; y: number; // logical px where the politician stands
  bias: Partial<Record<Category, number>>; // weight multiplier per category
}

export type GamePhase =
  | 'menu' | 'character_select' | 'tackle_select'
  | 'playing' | 'game_over';
