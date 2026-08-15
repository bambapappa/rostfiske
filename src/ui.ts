import type { GameState } from './engine';
import { PARTIES, LEADER_W, LEADER_H, LOGICAL_W, LOGICAL_H, type Category, type PartyCode } from './constants';
import type { GameEvent, PartyData, Bait } from './types';
import { calculateMandates, calculateIssueBreakdown } from './highscore';

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

/** Neutral gray used whenever a color lookup misses — the tackle-panel chips
 *  (here) and the canvas voter/party fallback fills (render.ts) share it. */
export const FALLBACK_COLOR = '#888';

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

/** Draw a party's leader caricature cell from the politicians sheet onto a
 *  48×72 canvas (16×24 cell scaled ×3) — pixelated, no smoothing. The cell is
 *  the party's own position in the sheet (PARTIES order, 4 columns × 2 rows).
 *  Portrait = identity, never an advantage: every party gets the same size,
 *  scale and dignified base sprite (see public/sprites/README.md). */
export function drawLeaderPortrait(canvas: HTMLCanvasElement, img: HTMLImageElement, party: PartyCode): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const idx = PARTIES.indexOf(party);
  const sx = (idx % 4) * LEADER_W;
  const sy = Math.floor(idx / 4) * LEADER_H;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, LEADER_W, LEADER_H, 0, 0, LEADER_W * 3, LEADER_H * 3);
}

/** Character-select grid: one identically-framed button per party — party-color
 *  border, the party's pixel portrait (48×72 canvas via drawLeaderPortrait) and
 *  the party name. Click → onPick. The grid is ALWAYS rendered in PARTIES order
 *  regardless of the caller's array order (neutrality contract: identical
 *  treatment, fixed presentation order).
 *
 *  Signature: (container, parties, sheet, onPick) where sheet is the loaded
 *  politicians sheet (loadSprites().get('politicians')). It may be undefined
 *  when the asset failed to load — every button still gets its (blank) canvas
 *  so the 8 options stay identical in structure. */
export function showCharacterSelect(container: HTMLElement, parties: PartyData[], sheet: HTMLImageElement | undefined, onPick: (p: PartyCode) => void): void {
  container.textContent = '';
  const ordered = [...parties].sort(
    (a, b) => PARTIES.indexOf(a.code) - PARTIES.indexOf(b.code),
  );
  for (const p of ordered) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'party-option';
    btn.title = p.name;
    btn.style.borderColor = p.color;

    const canvas = document.createElement('canvas');
    canvas.width = LEADER_W * 3;
    canvas.height = LEADER_H * 3;
    if (sheet) drawLeaderPortrait(canvas, sheet, p.code);

    const name = document.createElement('span');
    name.textContent = p.name;

    btn.appendChild(canvas);
    btn.appendChild(name);
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
    chip.style.background = CATEGORY_COLORS[b.category] ?? FALLBACK_COLOR;

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

/** Render crisp DOM badge overlays for all fishing spots over the game canvas.
 *  Positions are calculated as percentages of the logical canvas dimensions (LOGICAL_W × LOGICAL_H)
 *  so they scale perfectly and sharply at any viewport and DPI. */
export function renderBuildingBadges(
  container: HTMLElement,
  spots: import('./types').FishingSpot[],
  activeSpotId: import('./types').SpotId,
  onSelect: (id: import('./types').SpotId) => void,
): void {
  container.replaceChildren();
  for (const s of spots) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'building-badge' + (s.id === activeSpotId ? ' active' : '');
    btn.textContent = s.name;
    const leftPct = (s.x / LOGICAL_W) * 100;
    const topPct = (s.id === 'torget' ? (s.y - 18) / LOGICAL_H : (s.y + 4) / LOGICAL_H) * 100;
    btn.style.left = `${leftPct}%`;
    btn.style.top = `${topPct}%`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(s.id);
    });
    container.appendChild(btn);
  }
}

/** Render a rich, neutral Valvaka results overlay modal over the game stage. */
export function showGameOverModal(
  container: HTMLElement,
  state: GameState,
  partyScoresOrBest: number | Record<PartyCode, number>,
  onRestart: () => void,
  parties?: PartyData[],
  sheet?: HTMLImageElement,
): void {
  container.replaceChildren();
  const modal = document.createElement('div');
  modal.className = 'game-over-modal';

  const title = document.createElement('h2');
  title.className = 'valvaka-title';
  title.textContent = 'Valdagen är över';
  modal.appendChild(title);

  const mandateRes = calculateMandates(state.votes);
  const partyScores: Record<PartyCode, number> = typeof partyScoresOrBest === 'number'
    ? { s: 0, m: 0, sd: 0, c: 0, v: 0, kd: 0, l: 0, mp: 0, [state.party]: partyScoresOrBest }
    : partyScoresOrBest;

  const defaultParties: PartyData[] = [
    { code: 's', name: 'Socialdemokraterna', color: '#e8112d', colorText: '#fff', block: 'rödgrön' },
    { code: 'm', name: 'Moderaterna', color: '#005ea1', colorText: '#fff', block: 'borgerlig' },
    { code: 'sd', name: 'Sverigedemokraterna', color: '#ddab00', colorText: '#fff', block: 'sd' },
    { code: 'c', name: 'Centerpartiet', color: '#009933', colorText: '#fff', block: 'borgerlig' },
    { code: 'v', name: 'Vänsterpartiet', color: '#da291c', colorText: '#fff', block: 'rödgrön' },
    { code: 'kd', name: 'Kristdemokraterna', color: '#005ea8', colorText: '#fff', block: 'borgerlig' },
    { code: 'l', name: 'Liberalerna', color: '#006ab3', colorText: '#fff', block: 'borgerlig' },
    { code: 'mp', name: 'Miljöpartiet', color: '#83cf39', colorText: '#fff', block: 'rödgrön' },
  ];
  const partyList = parties && parties.length > 0 ? parties : defaultParties;
  const currentParty = partyList.find((p) => p.code === state.party) ?? {
    code: state.party,
    name: state.party.toUpperCase(),
    color: '#888',
    colorText: '#fff',
    block: '',
  };

  // Section 1: Mandates & Status
  const mandatesSec = document.createElement('div');
  mandatesSec.className = 'valvaka-mandates';

  const headline = document.createElement('div');
  headline.className = 'mandate-headline';

  const partyNameSpan = document.createElement('span');
  partyNameSpan.className = 'mandate-party';
  partyNameSpan.style.color = currentParty.color;
  partyNameSpan.textContent = `${currentParty.name}: `;
  headline.appendChild(partyNameSpan);

  const mandateNumSpan = document.createElement('span');
  mandateNumSpan.className = 'mandate-num';
  const strongMandate = document.createElement('strong');
  strongMandate.textContent = `${mandateRes.mandates}`;
  mandateNumSpan.appendChild(strongMandate);
  const mandateUnit = document.createElement('span');
  mandateUnit.textContent = ' mandat';
  mandateNumSpan.appendChild(mandateUnit);
  headline.appendChild(mandateNumSpan);

  const thresholdBadge = document.createElement('span');
  thresholdBadge.className = `threshold-badge ${mandateRes.passedThreshold ? 'over-sparr' : 'under-sparr'}`;
  thresholdBadge.textContent = mandateRes.passedThreshold ? 'Över 4%-spärren' : 'Under 4%-spärren';
  headline.appendChild(thresholdBadge);

  mandatesSec.appendChild(headline);

  const statusDiv = document.createElement('div');
  statusDiv.className = 'mandate-status';
  statusDiv.textContent = mandateRes.statusText;
  mandatesSec.appendChild(statusDiv);

  const statsRow = document.createElement('div');
  statsRow.className = 'stats-row';

  const votesSpan = document.createElement('span');
  const votesLabel = document.createElement('span');
  votesLabel.textContent = 'Röster: ';
  const votesStrong = document.createElement('strong');
  votesStrong.textContent = `${state.votes}`;
  votesSpan.appendChild(votesLabel);
  votesSpan.appendChild(votesStrong);
  statsRow.appendChild(votesSpan);

  const releasedSpan = document.createElement('span');
  const releasedLabel = document.createElement('span');
  releasedLabel.textContent = 'Släppta: ';
  const releasedStrong = document.createElement('strong');
  releasedStrong.textContent = `${state.released}`;
  releasedSpan.appendChild(releasedLabel);
  releasedSpan.appendChild(releasedStrong);
  statsRow.appendChild(releasedSpan);

  const bestSpan = document.createElement('span');
  const bestLabel = document.createElement('span');
  bestLabel.textContent = 'Bäst: ';
  const bestStrong = document.createElement('strong');
  bestStrong.textContent = `${partyScores[state.party] ?? state.votes}`;
  bestSpan.appendChild(bestLabel);
  bestSpan.appendChild(bestStrong);
  statsRow.appendChild(bestSpan);

  mandatesSec.appendChild(statsRow);
  modal.appendChild(mandatesSec);

  // Section 2: Issue breakdown
  const breakdown = calculateIssueBreakdown(state.caughtVotesHistory ?? []);
  const breakdownSec = document.createElement('div');
  breakdownSec.className = 'issue-breakdown-section';

  const breakdownTitle = document.createElement('div');
  breakdownTitle.className = 'section-title';
  breakdownTitle.textContent = 'Sakfrågor i valrörelsen';
  breakdownSec.appendChild(breakdownTitle);

  if (breakdown.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-breakdown';
    emptyDiv.textContent = 'Inga röster fångade';
    breakdownSec.appendChild(emptyDiv);
  } else {
    const bar = document.createElement('div');
    bar.className = 'issue-bar';

    for (const item of breakdown) {
      const seg = document.createElement('div');
      seg.className = 'issue-segment';
      seg.style.width = `${item.percentage}%`;
      seg.style.backgroundColor = CATEGORY_COLORS[item.category] ?? FALLBACK_COLOR;
      seg.title = `${item.category}: ${item.count} st (${item.percentage}%)`;
      bar.appendChild(seg);
    }
    breakdownSec.appendChild(bar);

    const legend = document.createElement('div');
    legend.className = 'issue-legend';
    for (const item of breakdown) {
      const legItem = document.createElement('div');
      legItem.className = 'issue-legend-item';

      const chip = document.createElement('span');
      chip.className = 'legend-chip';
      chip.style.backgroundColor = CATEGORY_COLORS[item.category] ?? FALLBACK_COLOR;
      legItem.appendChild(chip);

      const lbl = document.createElement('span');
      lbl.className = 'legend-label';
      lbl.textContent = `${item.category}:`;
      legItem.appendChild(lbl);

      const val = document.createElement('span');
      val.className = 'legend-val';
      val.textContent = `${item.count} (${item.percentage}%)`;
      legItem.appendChild(val);

      legend.appendChild(legItem);
    }
    breakdownSec.appendChild(legend);
  }
  modal.appendChild(breakdownSec);

  // Section 3: 8-Leader Arcade Highscore Grid
  const highscoreSec = document.createElement('div');
  highscoreSec.className = 'leader-grid-section';

  const highscoreTitle = document.createElement('div');
  highscoreTitle.className = 'section-title';
  highscoreTitle.textContent = 'Resultat per parti';
  highscoreSec.appendChild(highscoreTitle);

  const grid = document.createElement('div');
  grid.className = 'leader-highscore-grid';

  const orderedParties = PARTIES.map((code) => partyList.find((p) => p.code === code) ?? {
    code,
    name: code.toUpperCase(),
    color: '#888',
    colorText: '#fff',
    block: '',
  });

  for (const p of orderedParties) {
    const isCurrent = p.code === state.party;
    const score = partyScores[p.code] ?? 0;

    const card = document.createElement('div');
    card.className = 'party-score-card' + (isCurrent ? ' active-party' : '');
    card.style.borderColor = p.color;

    const canvas = document.createElement('canvas');
    canvas.width = LEADER_W * 3;
    canvas.height = LEADER_H * 3;
    canvas.className = 'leader-portrait';
    if (sheet) {
      drawLeaderPortrait(canvas, sheet, p.code);
    }
    card.appendChild(canvas);

    const info = document.createElement('div');
    info.className = 'card-info';

    const name = document.createElement('span');
    name.className = 'party-card-name';
    name.textContent = p.name;
    info.appendChild(name);

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'party-card-score';
    const scoreLabel = document.createElement('span');
    scoreLabel.textContent = 'Rekord: ';
    const scoreStrong = document.createElement('strong');
    scoreStrong.textContent = `${score}`;
    scoreSpan.appendChild(scoreLabel);
    scoreSpan.appendChild(scoreStrong);
    info.appendChild(scoreSpan);

    card.appendChild(info);
    grid.appendChild(card);
  }
  highscoreSec.appendChild(grid);
  modal.appendChild(highscoreSec);

  // Section 4: Restart button
  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'restart-btn';
  restartBtn.textContent = 'Spela igen';
  restartBtn.addEventListener('click', onRestart);
  modal.appendChild(restartBtn);

  container.appendChild(modal);
}
