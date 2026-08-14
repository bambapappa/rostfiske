# Sprites

All art is CC0 (public domain). Sources and licenses:

- `city.png` — **Kenney "Tiny Town" v1.1** (kenney.nl), tilemap_packed variant.
  192x176 px, 16x16 tiles, 8-bit colormap.
  Source: https://kenney.nl/assets/tiny-town (downloaded from
  `https://kenney.nl/media/pages/assets/tiny-town/a415fbeb49-1735736916/kenney_tiny-town.zip`,
  file `Tilemap/tilemap_packed.png`).
  License: **Creative Commons Zero (CC0)** — see bundled License.txt in the
  Kenney pack. Crediting Kenney is appreciated but not mandatory.
- `politicians.png` — custom-generated party-leader caricatures (CC0).
  128x32 px, 8 sprites of 16x16, one per party in `PARTIES` order:
  row 0: s, m, sd, c; row 1: v, kd, l, mp.
  Each is a base body (suit in party color, from `FALLBACK_PARTIES`) plus a
  distinguishing feature: S dark quiff, M glasses + sideburns, SD blond neat,
  C mustache + glasses, V long dark hair, KD blond page, L bald + beard,
  MP auburn. Cartoon "liknande" caricatures — simplified, not real portraits.
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
