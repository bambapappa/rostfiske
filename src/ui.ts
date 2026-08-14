import type { GameState } from './engine';

export function formatSummary(state: GameState): string {
  return `Du fångade ${state.votes} röster. ${state.released} väljare saknade rösträtt och släpptes tillbaka.`;
}

export function showPhase(_phase: string, _data?: unknown): void {
  // DOM mutation lives here; intentionally side-effecting, not unit-tested.
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  // Implementation fills overlay per phase. Kept thin; details added in main.ts integration.
}
