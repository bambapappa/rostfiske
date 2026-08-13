import { describe, it, expect } from 'vitest';
import { spritesReady } from '../src/sprites';

describe('spritesReady', () => {
  it('is false for an empty map', () => {
    expect(spritesReady(new Map())).toBe(false);
  });
  it('is true when all required sheets are present', () => {
    const m = new Map([['voters', {} as any], ['politicians', {} as any], ['city', {} as any]]);
    expect(spritesReady(m)).toBe(true);
  });
});
