# Röstfiske

Pixelarkad-spel: fiska röster med riktiga vallöften från utlovat.se.

## Spela
\`\`\`bash
pnpm install
pnpm dev
\`\`\`
Öppna den URL Vite skriver ut. Klicka en plats för att fiska, mellanslag = mothugg,
1–5 = välj bete.

## Data
- Löften: https://utlovat.se/api/v1/promises.json (CC BY 4.0)
- Partier: https://utlovat.se/api/v1/parties.json
Om API:et är nere används en inbäddad neutral fallback-snapshot.

## Neutralitet
Alla 8 partier är spelbara och mekaniskt identiska. Spelet bedömer inte politik.
Källor (CC BY 4.0) visas vid varje fångst.

## Sprites
All grafik är CC0 — se public/sprites/README.md.

## Test & build
\`\`\`bash
pnpm test        # enhetstester (Vitest)
pnpm typecheck   # tsc --noEmit
pnpm build       # statisk build (kräver att sprite-sheets finns)
\`\`\`
