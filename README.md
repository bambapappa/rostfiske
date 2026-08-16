# 🎣 Röstfiske

[![CI](https://github.com/bambapappa/rostfiske/actions/workflows/ci.yml/badge.svg)](https://github.com/bambapappa/rostfiske/actions/workflows/ci.yml)
[![Deploy](https://github.com/bambapappa/rostfiske/actions/workflows/deploy.yml/badge.svg)](https://github.com/bambapappa/rostfiske/actions/workflows/deploy.yml)
[![License: CC0](https://img.shields.io/badge/License-CC0_1.0-blue.svg)](https://creativecommons.org/publicdomain/zero/1.0/)
[![Data: CC BY 4.0](https://img.shields.io/badge/Data-CC_BY_4.0-orange.svg)](https://creativecommons.org/licenses/by/4.0/)

Ett 8-bitars pixel-arkadspel där du fiskar väljarröster under valdagen 2026 med hjälp av **autentiska vallöften** hämtade direkt från [utlovat.se](https://utlovat.se).

🎮 **Spela direkt i webbläsaren:** **[https://rostfiske.utlovat.se](https://rostfiske.utlovat.se)**

---

## 📖 Om spelet

Under 60 intensiva sekunder på valdagen styr du din valda partiledare runt i småstaden. Väljarna vandrar på gator och torg och bär på olika hjärtefrågor. Din uppgift är att kasta ut rätt vallöften vid rätt platser, reagera blixtsnabbt när det nappar, hänga med i valrörelsens heta debatter och samla tillräckligt med röster för att klara 4%-spärren och ta plats i riksdagen!

---

## 🎮 Kontroller & Spelmekanik

| Handling | Mus / Tangentbord | Beskrivning |
|---|---|---|
| **Välj partiledare** | Klick i menyn | Förhandsgranska partiets 5 vallöften och klicka *Starta valrörelsen*. |
| **Byt fiskeplats** | Klicka på hus / `Q, W, E, R, A, S, D` | Gå mellan Torget `[Q]`, Skolan `[W]`, Äldreboendet `[E]`, Stationen `[R]`, Bageriet `[A]`, Biblioteket `[S]` och Apoteket `[D]`. |
| **Kasta vallöfte (bete)** | Klicka på marken | Kasta ut lappen inom räckvidd (max 110 px). |
| **Mothugg vid napp (!)** | **Mellanslag** eller klick | När en väljare nappar (**!**) har du 650 ms på dig att göra mothugg! |
| **Välj vallöfte** | Tangenterna `1–5` eller klick i beteslådan | Välj vilket av partiets 5 löften du vill fiska med. |
| **Ljud av/på** | Klicka på 🔊/🔇 uppe till höger | Växlar 8-bitars ljudeffekter (sparas i webbläsaren). |

### 📍 Platser & Väljardynamik
* **Husen påverkar väljarna:** Väljare som kommer ut från specifika byggnader har ett förstärkt intresse för matchande frågor:
  * 🏫 **Skolan:** Utbildning
  * 🏥 **Äldreboendet:** Vård & välfärd
  * 🚆 **Stationen:** Infrastruktur
  * 🥖 **Bageriet**, 📚 **Biblioteket**, 💊 **Apoteket** & 🏛️ **Torget:** Allmänna väljare med blandade prioriteringar.
* **Omyndiga väljare:** Ungdomar under 18 år rör sig också på gatorna. Om en omyndig väljare nappar släpps personen tillbaka (*"Saknar rösträtt"*).
* **EXTRA-nyheter & Trender:** Två gånger per runda (vid 40s och 20s återstående tid) blossar en nyhetsdebatt upp. Väljare med intresse för den aktuella frågan rör sig 30% snabbare och nappar med **2.5× högre intresse** – byt snabbt till rätt bete (`1–5`)!

---

## 📊 Valvaka & Mandatfördelning

Efter 60 sekunder stänger vallokalerna och Valvakan startar:
* **Riksdagsspärren (4%):** Kräver minst **4 röster**.
  * `0–3 röster:` **0 mandat** (*Under 4%-spärren*)
  * `4–7 röster:` **15–27 mandat** (*Över riksdagsspärren*)
  * `8–14 röster:` **35–65 mandat** (*Starkt valresultat*)
  * `15+ röster:` **75–349 mandat** (*Valsensation*)
* **Sakfråge-analys:** En visuell fördelningsstapel visar vilka sakfrågor du lyckades fånga röster på.
* **8-Ledare Highscore:** En arkadtabell som visar alla 8 partiers personbästa resultat.

---

## ⚖️ Politisk neutralitet & Transparens

*Röstfiske* är skapat som en opartisk och underhållande utbildningsupplevelse:
1. **Symmetriska regler:** Alla 8 partier (S, M, SD, C, V, KD, L, MP) har exakt samma förutsättningar, rörelsehastigheter, kastradier, nappfönster och mandatberäkningar.
2. **Fast presentationsordning:** Partierna presenteras alltid i den fasta parlamentariska standardordningen (`PARTIES`), utan någon vinnar- eller förlorarinramning.
3. **Källtransparens:** Varje enskilt vallöfte är försett med fullständig källhänvisning och länk till originalkällan.

---

## 📜 Källhänvisningar & Licenser

All data och grafik i projektet bygger på öppna standarder och fria licenser:

### 1. Data (Vallöften & Partier)
* **Källa:** [utlovat.se](https://utlovat.se) (API: `https://utlovat.se/api/v1/promises.json` & `parties.json`).
* **Licens:** [Creative Commons Erkännande 4.0 Internationell (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

### 2. Stadsmiljö & Terränggrafik
* **Tileset:** **Kenney "Tiny Town" v1.1** av [Kenney](https://kenney.nl/assets/tiny-town).
* **Licens:** [Creative Commons Zero (CC0 1.0 Universal / Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/).

### 3. Partiledare & Väljargrafik
* **Partiledar-karikatyrer:** Egendesignade 16×24 pixelporträtt föreställande de 8 riksdagspartiernas ledare inför valet 2026 (inklusive MP:s två språkrör Amanda Lind och Daniel Helldén).
* **Väljare:** Egendesignade 16×16 pixel-sprites (12 vuxenvarianter, 4 ungdomsvarianter).
* **Licens:** [Creative Commons Zero (CC0 1.0 Universal / Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/). Se [public/sprites/README.md](public/sprites/README.md) för detaljer.

### 4. Ljudmotor
* **8-bit SFX Engine:** Procedural ljudsyntes via standard Web Audio API (inga externa binära ljudfiler).
* **Licens:** [Creative Commons Zero (CC0 1.0 Universal / Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/).

---

## 🛠️ Lokal utveckling & Tester

Projektet är byggt i modern **TypeScript** med **Vite** och **Vitest**.

### Förutsättningar
* Node.js (v20+)
* `pnpm`

### Kom igång

```bash
# 1. Klona repot och installera beroenden
git clone https://github.com/bambapappa/rostfiske.git
cd rostfiske
pnpm install

# 2. Starta lokal utvecklingsserver
pnpm dev

# 3. Kör alla enhetstester (262 tester)
pnpm test

# 4. Kör TypeScript-typkontroll
pnpm typecheck

# 5. Bygg produktionspaket
pnpm build
```
