export type SheetMap = Map<string, HTMLImageElement>;
const REQUIRED = ['voters', 'politicians', 'city'] as const;

export function spritesReady(map: SheetMap): boolean {
  return REQUIRED.every((k) => map.has(k));
}

export async function loadSprites(): Promise<SheetMap> {
  const map: SheetMap = new Map();
  const entries: Array<[string, string]> = [
    ['voters', './sprites/voters.png'],
    ['politicians', './sprites/politicians.png'],
    ['city', './sprites/city.png'],
  ];
  await Promise.all(entries.map(([name, url]) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { map.set(name, img); resolve(); };
      img.onerror = () => resolve(); // missing asset → skip, render falls back
      img.src = url;
    }),
  ));
  return map;
}
