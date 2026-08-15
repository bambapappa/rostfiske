# Röstfiske

Pixelarkad-spel: fiska röster med riktiga vallöften från utlovat.se.

## Spela

\`\`\`bash
pnpm install
pnpm dev
\`\`\`
Öppna den URL Vite skriver ut. Välj ett parti i karaktärsvalsskärmen.

### Kontroller

- **Klicka** — kasta lapp (mete) eller mothugg vid napp
- **Mellanslag** — mothugg vid napp
- **Q/W/E/R** — byt plats (torget, skolan, äldreboendet, stationen)
- **1–5** — välj bete (väljarkategori), eller klicka i betespanelen

### Mekanik (v1.2)

- **Kastradie:** lappen kastas max 110 px från politikern — klick utanför radien kastas till cirkelkanten (max 110 px)
- **Krock:** väljare går ej genom hus — de stannar på trottoarer och torg
- **Naturligt vandrande:** varje väljare har egen fart, svänger mjukt och stannar ibland ("tittar i skyltfönster")
- **Betespanel:** de fem betena syns med hållbarhets-pips; pips är medvetet partineutralt vita; byt med 1–5 eller klick
- **Porträtt i karaktärsvälet:** varje valknapp visar partiledarens pixelporträtt (16×24, uppskalat ×3) ovanför partinamnet
- **Ledare 2026:** karikatyrerna föreställer de aktuella partiledarna — hela listan med källor finns i `public/sprites/README.md`. (MP har två språkrör — Amanda Lind och Daniel Helldén — och MP-cellen visar båda.)

### Mekanik (v1.1)

- **Mete:** Klicka för att kasta ett "löftes-papper" (lapp) på marken
- **Väljare reagerar:** Endast väljare med matchande kategori (t.ex. "skatter" för skattbete) kan se lappen
- **Napp:** När en väljare plockar upp lappen visas "NAPP!" — du har 650 ms på dig att klicka för att mothugga
- **Miss:** Klickar du för sent eller inte alls behåller väljaren lappen och betet slits
- **Byggnader:** Väljare går in i byggnader (skolan, äldreboendet, stationen, hus) och kommer ut med nya preferenser

## Data

- Löften: https://utlovat.se/api/v1/promises.json (CC BY 4.0)
- Partier: https://utlovat.se/api/v1/parties.json
Om API:et är nere används en inbäddad neutral fallback-snapshot.

## Neutralitet

Alla 8 partier är spelbara och mekaniskt identiska. Spelet bedömer inte politik.
Källor (CC BY 4.0) visas vid varje fångst.

## Grafik

All grafik är CC0 (public domain) — se public/sprites/README.md.

- **Stad:** Kenney "Tiny Town" tileset (CC0) — 24×13 grid med gräs, vägar, byggnader
- **Partiledare:** Genererade karikatyrer (8 ledare, 16×24 px var) i partifärgerna — 2026 års partiledare med karaktäristiska drag; se tabellen i `public/sprites/README.md`
- **Väljare:** Genererade väljare (12 varianter vuxna, 4 varianter ungdomar) i neutrala vardagsfärger

## Test & build

\`\`\`bash
pnpm test        # enhetstester (Vitest)
pnpm typecheck   # tsc --noEmit
pnpm build       # statisk build (kräver att sprite-sheets finns)
\`\`\`
