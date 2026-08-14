import type { GameState } from './engine';
import { PARTIES, type PartyCode } from './constants';
import type { GameEvent, PartyData } from './types';

export type LastCatch = NonNullable<GameState['lastCatch']>;

export function formatSummary(state: GameState): string {
  return `Du fångade ${state.votes} röster. ${state.released} väljare saknade rösträtt och släpptes tillbaka.`;
}

/** One-line transient for the #overlay div on each catch (CC BY 4.0 attribution).
 *  Single source of truth for catch/release text — the engine imports this. */
export function catchLine(c: LastCatch): string {
  if (c.released) return 'Släppt tillbaka: saknar rösträtt';
  return `Fångst: ${c.title} · kostnad ${c.msekBase} msek · källa ${c.sourceDomain} (${c.sourceUrl})`;
}

/** Overlay text for a game event, per the v1.1 spec splash table. Neutral —
 *  no winner framing anywhere. Catch/release events carry the full attributed
 *  line (built via catchLine) in `e.text`; all other kinds carry their spec
 *  string authored by the engine. */
export function eventText(e: GameEvent): string {
  return e.text;
}

/** Character-select grid: one identically-framed button per party, party-color
 *  border + party name. Click → onPick. The grid is ALWAYS rendered in PARTIES
 *  order regardless of the caller's array order (neutrality contract: identical
 *  treatment, fixed presentation order). */
export function showCharacterSelect(container: HTMLElement, parties: PartyData[], onPick: (p: PartyCode) => void): void {
  container.textContent = '';
  const ordered = [...parties].sort(
    (a, b) => PARTIES.indexOf(a.code) - PARTIES.indexOf(b.code),
  );
  for (const p of ordered) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'party-option';
    btn.textContent = p.name;
    btn.title = p.name;
    btn.style.borderColor = p.color;
    btn.addEventListener('click', () => onPick(p.code));
    container.appendChild(btn);
  }
}
