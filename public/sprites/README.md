# Sprites

All art is CC0 (public domain). Sources and licenses:

- `city.png` — **Kenney "Tiny Town" v1.1** (kenney.nl), tilemap_packed variant.
  192x176 px, 16x16 tiles, 8-bit colormap.
  Source: https://kenney.nl/assets/tiny-town (downloaded from
  `https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip`,
  file `Tilemap/tilemap_packed.png`).
  License: **Creative Commons Zero (CC0)** — see bundled License.txt in the
  Kenney pack. Crediting Kenney is appreciated but not mandatory.
- `politicians.png` — custom-generated caricatures of the 2026 party
  leaders (CC0). 64x48 px, 8 sprites of 16x24 in a 4x2 grid, one per party
  in `PARTIES` order: row 0: s, m, sd, c; row 1: v, kd, l, mp.
  Leaders (v1.2.1 corrections per the user's party-source links,
  search-verified 2026-08-15):
  | Cell | Parti | Ledare | Kännetecken i spriten |
  |---|---|---|---|
  | 0 | s | Magdalena Andersson | kvinna, blont hår i knut/uppsättning |
  | 1 | m | Ulf Kristersson | man, glasögon, grånat hår, sidbena |
  | 2 | sd | Jimmie Åkesson | man, mörkhårigt välkammat, kostym |
  | 3 | c | Elisabeth Thand Ringqvist | kvinna, ljust/blondt axellångt hår |
  | 4 | v | Nooshi Dadgostar | kvinna, mörkt långt hår, ljusbrun hy |
  | 5 | kd | Ebba Busch | kvinna, blont page |
  | 6 | l | Simona Mohamsson | kvinna, ljusbrun hy, mörkt axellångt hår |
  | 7 | mp | Amanda Lind + Daniel Helldén | partiets två språkrör, båda ritade: hon med rödbrunt hår, han med grått hår och skäggstubb |
  Note: MP has two språkrör (Amanda Lind and Daniel Helldén, mp.se/om/sprakror)
  — the MP cell shows BOTH as two smaller figures side by side. That is a
  factual representation of the party's leadership, not an advantage: same
  dignified style and level of detail as every other cell.
  The caricatures are **paraphrases**, not exact portraits: simplified,
  neutral pixel art where glasses/hair/stubble are recognition descriptors,
  never mockery. Every leader gets the same dignified base body (suit in
  party color from `FALLBACK_PARTIES`, white shirt) and the same level of
  detail. Gender and skin tones are factual representation.
- `voters.png` — custom-generated mixed voters (CC0).
  128x32 px, 16 sprites of 16x16:
  row 0 cells 0-7: adults (trousers and skirt bodies) x 4 palettes;
  row 1 cells 8-11: adults (long coat body) x 4 palettes;
  row 1 cells 12-15: minors (smaller, ~12 px tall) x 4 palettes.
  Palettes are neutral everyday colors (not party colors).

Character sheets use RGBA with transparent backgrounds so they composite
over the city tilemap.

## Regenerating

The character sheets are generated deterministically (idempotent — same
input, same bytes):

    node scripts/gen-leaders.mjs   # -> politicians.png
    node scripts/gen-voters.mjs    # -> voters.png

Both use the shared minimal PNG writer in `scripts/pnglib.mjs`.
`city.png` is a downloaded asset — do not regenerate it from scripts.
