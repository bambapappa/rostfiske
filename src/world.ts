import { LOGICAL_W, LOGICAL_H, type Category } from './constants';
import type { FishingSpot, SpotId, Building } from './types';

export const SPOTS: FishingSpot[] = [
  { id: 'torget',       name: 'Torget',        x: LOGICAL_W * 0.5, y: LOGICAL_H * 0.62, bias: {} },
  { id: 'skolan',       name: 'Skolan',        x: LOGICAL_W * 0.22, y: LOGICAL_H * 0.40, bias: { utbildning: 6 } },
  { id: 'aldreboendet', name: 'Äldreboendet',  x: LOGICAL_W * 0.78, y: LOGICAL_H * 0.38, bias: { välfärd: 6 } },
  { id: 'stationen',    name: 'Stationen',     x: LOGICAL_W * 0.5,  y: LOGICAL_H * 0.18, bias: { infrastruktur: 6 } },
];

export function spotById(id: SpotId): FishingSpot {
  const s = SPOTS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown spot ${id}`);
  return s;
}

export const BUILDINGS: Building[] = [
  { id: 'skolan',       name: 'Skolan',       x: 56,  y: 40,  doorX: 56,  doorY: 56,  bias: { utbildning: 6 } },
  { id: 'aldreboendet', name: 'Äldreboendet', x: 320, y: 40,  doorX: 320, doorY: 56,  bias: { välfärd: 6 } },
  { id: 'stationen',    name: 'Stationen',    x: 192, y: 24,  doorX: 192, doorY: 40,  bias: { infrastruktur: 6 } },
  { id: 'hus1',         name: 'Hus 1',        x: 120, y: 150, doorX: 120, doorY: 164, bias: {} },
  { id: 'hus2',         name: 'Hus 2',        x: 264, y: 150, doorX: 264, doorY: 164, bias: {} },
  { id: 'hus3',         name: 'Hus 3',        x: 32,  y: 150, doorX: 32,  doorY: 164, bias: {} },
];

export function buildingById(id: string): Building {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown building ${id}`);
  return b;
}
