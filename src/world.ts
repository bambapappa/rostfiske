import { LOGICAL_W, LOGICAL_H, type Category } from './constants';
import type { FishingSpot, SpotId } from './types';

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
