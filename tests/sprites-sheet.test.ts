// v1.2 final-review guard: decode public/sprites/politicians.png with the
// dependency-free decoder in tests/lib/png.ts and assert the sheet layout —
// 64×48 8-bit RGBA, a 4×2 grid of 16×24 cells, every cell non-empty and all
// 8 cells pairwise distinct. This guards the neutrality-critical asset against
// a repeat of the v1.1 layout mismatch (wrong dimensions / duplicated cells).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from './lib/png';
import { LEADER_W, LEADER_H, PARTIES } from '../src/constants';

const SHEET_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sprites', 'politicians.png');
const COLS = 4;
const ROWS = 2;

/** Cell pixel bytes (RGBA) for grid cell (col,row), as a plain string key for
 *  pairwise comparison. */
function cellBytes(png: ReturnType<typeof decodePng>, col: number, row: number): string {
  const out: number[] = [];
  for (let y = 0; y < LEADER_H; y++) {
    for (let x = 0; x < LEADER_W; x++) {
      const i = ((row * LEADER_H + y) * png.width + col * LEADER_W + x) * 4;
      out.push(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!, png.data[i + 3]!);
    }
  }
  return String.fromCharCode(...out);
}

/** True when at least one pixel in the cell is non-transparent (alpha > 0). */
function cellNonEmpty(png: ReturnType<typeof decodePng>, col: number, row: number): boolean {
  for (let y = 0; y < LEADER_H; y++) {
    for (let x = 0; x < LEADER_W; x++) {
      const i = ((row * LEADER_H + y) * png.width + col * LEADER_W + x) * 4 + 3;
      if (png.data[i]! !== 0) return true;
    }
  }
  return false;
}

describe('politicians.png sheet layout (v1.2 guard)', () => {
  const png = decodePng(readFileSync(SHEET_PATH));

  it('has exact dimensions 64×48 (4 cols × 2 rows of 16×24 cells)', () => {
    expect(png.width).toBe(LEADER_W * COLS);
    expect(png.height).toBe(LEADER_H * ROWS);
    expect(png.width).toBe(64);
    expect(png.height).toBe(48);
    expect(COLS * ROWS).toBe(PARTIES.length); // one cell per party
  });

  it('all 8 cells are non-empty (contain visible pixels)', () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        expect(cellNonEmpty(png, col, row)).toBe(true);
      }
    }
  });

  it('all 8 cells are pairwise distinct (no duplicated leader sprites)', () => {
    const cells: string[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        cells.push(cellBytes(png, col, row));
      }
    }
    expect(new Set(cells).size).toBe(cells.length);
  });
});
