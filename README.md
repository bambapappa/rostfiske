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
- **Q/W/E/R** — byt plats (torget, skolan, äldreboendet, stationen)
- **1–5** — välj bete (väljarkategori)

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
- **Partiledare:** Genererade karikatyrer (8 ledare, 16×16 px var) i partifärgerna med karaktäristiska drag (S mörk hårsnibb, M glasögon, SD blont, C mustasch, V långt hår, KD blont page, L skallig, MP rödbrunt)
- **Väljare:** Genererade väljare (12 varianter vuxna, 4 varianter ungdomar) i neutrala vardagsfärger

## Test & build

\`\`\`bash
pnpm test        # enhetstester (Vitest)
pnpm typecheck   # tsc --noEmit
pnpm build       # statisk build (kräver att sprite-sheets finns)
\`\`\`
