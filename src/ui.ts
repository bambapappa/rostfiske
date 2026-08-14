import type { GameState } from './engine';

export type LastCatch = NonNullable<GameState['lastCatch']>;

export function formatSummary(state: GameState): string {
  return `Du fångade ${state.votes} röster. ${state.released} väljare saknade rösträtt och släpptes tillbaka.`;
}

/** One-line transient for the #overlay div on each catch (CC BY 4.0 attribution). */
export function catchLine(c: LastCatch): string {
  if (c.released) return 'Släppt tillbaka: saknar rösträtt';
  return `Fångst: ${c.title} · kostnad ${c.msekBase} msek · källa ${c.sourceDomain} (${c.sourceUrl})`;
}

export function showPhase(_phase: string, _data?: unknown): void {
  // DOM mutation lives here; intentionally side-effecting, not unit-tested.
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  // Implementation fills overlay per phase. Kept thin; details added in main.ts integration.
}
