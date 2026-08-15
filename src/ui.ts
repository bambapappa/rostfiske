import type { GameState } from './engine';
import { PARTIES, type Category, type PartyCode } from './constants';
import type { GameEvent, PartyData, Bait } from './types';

/** Category → chip color (pixel-palette hex). Single source of truth: the
 *  tackle-panel chips (ui.ts) and the canvas voter-fallback fill (render.ts)
 *  both import this map. */
export const CATEGORY_COLORS: Record<Category, string> = {
  'välfärd': '#e74c3c',
  'utbildning': '#f39c12',
  'skatter': '#f1c40f',
  'klimat-miljö': '#2ecc71',
  'rättsväsende': '#1abc9c',
  'migration': '#3498db',
  'infrastruktur': '#9b59b6',
  'försvar': '#34495e',
  'övrigt': '#95a5a6',
};

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

/** Tackle panel (#tackle): one slot per bait in the tackle (TACKLE_SIZE = 5).
 *
 *  Each slot div carries classes "slot" (+ "active" for the bait whose id
 *  matches activeBaitId, + "worn" when durability <= 0) and contains:
 *    - span.hint    — keyboard hint 1–5 (slot index + 1)
 *    - span.chip    — category color chip (style.background = CATEGORY_COLORS)
 *    - div.slot-main
 *        - div.title  — title truncated to 18 chars (slice(0,17) + '…')
 *        - div.pips   — '▮' × durability + '▯' × (maxDurability − durability)
 *        - div.source — sourceDomain subtext, ONLY on the active slot
 *                      (CC BY 4.0 attribution; the catch splash keeps the
 *                      full per-catch source line)
 *
 *  Signature: (container, tackle, activeBaitId, onSelect) where
 *  onSelect: (i: number) => void receives the clicked slot's tackle index —
 *  main.ts passes the exact same handler the 1–5 keys use. Worn slots get no
 *  click listener.
 *
 *  The container is rebuilt from scratch on every call via replaceChildren()
 *  (5 slots — cheaper than patching). Neutral by construction: slots are
 *  identical in structure for every bait/party; no party comparison. */
export function renderTackle(container: HTMLElement, tackle: Bait[], activeBaitId: string | null, onSelect: (i: number) => void): void {
  container.replaceChildren();
  for (let i = 0; i < tackle.length; i++) {
    const b = tackle[i]!;
    const worn = b.durability <= 0;
    const active = b.id === activeBaitId;
    const slot = document.createElement('div');
    slot.className = 'slot' + (active ? ' active' : '') + (worn ? ' worn' : '');
    slot.title = b.title;

    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = String(i + 1);

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = CATEGORY_COLORS[b.category] ?? '#888';

    const main = document.createElement('div');
    main.className = 'slot-main';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = b.title.length > 18 ? b.title.slice(0, 17) + '…' : b.title;

    const pips = document.createElement('div');
    pips.className = 'pips';
    pips.textContent = '▮'.repeat(b.durability) + '▯'.repeat(Math.max(0, b.maxDurability - b.durability));

    main.appendChild(title);
    main.appendChild(pips);
    if (active) {
      const src = document.createElement('div');
      src.className = 'source';
      src.textContent = b.sourceDomain;
      main.appendChild(src);
    }

    slot.appendChild(hint);
    slot.appendChild(chip);
    slot.appendChild(main);
    if (!worn) slot.addEventListener('click', () => onSelect(i));
    container.appendChild(slot);
  }
}
