import { describe, it, expect } from 'vitest';
import { validatePromises, promisesForParty } from '../src/api';
import { PARTIES, MIN_PROMISES_PER_PARTY } from '../src/constants';
import sample from './fixtures/promises.sample.json';

// Mirrors the live utlovat.se payload shape (data: [{ id, title, quote,
// parties, category, status, cost: { msek_base }, source: { url, domain } }]).
// Guards the same neutrality properties as the fallback parity test, but
// against a realistic sample of live-shaped data instead of only the
// hand-written fallback snapshot.
const raw = sample as unknown as Parameters<typeof validatePromises>[0];

describe('live-shaped sample parity', () => {
  const ps = validatePromises(raw);

  it('drops the non-aktiv and unknown-party entries', () => {
    expect(raw.data).toHaveLength(42);
    expect(ps).toHaveLength(40);
    expect(ps.map((p) => p.id)).not.toContain('fb-s-avslutad');
    expect(ps.map((p) => p.id)).not.toContain('fb-xx-1');
    expect(ps.every((p) => (PARTIES as readonly string[]).includes(p.party))).toBe(true);
  });

  it('gives every party at least MIN_PROMISES_PER_PARTY aktiv promises', () => {
    for (const p of PARTIES) {
      expect(promisesForParty(ps, p).length).toBeGreaterThanOrEqual(MIN_PROMISES_PER_PARTY);
    }
  });

  it('preserves source attribution for every kept promise', () => {
    for (const p of ps) {
      expect(p.source.domain).toBeTruthy();
      expect(p.source.url).toBeTruthy();
    }
  });
});
