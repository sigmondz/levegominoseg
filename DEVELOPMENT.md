# Development

Fejlesztői dokumentáció a **Levegő** (levegőminőség-megjelenítő) projekthez. A felhasználói áttekintést lásd: [README.md](./README.md).

## Tech stack

| Réteg | Technológia | Megjegyzés |
| --- | --- | --- |
| Runtime / PM / bundler / dev server | **Bun** (≥1.3) | `bun install`, `Bun.serve`, `bun build`, `bun test` |
| UI | **React 19** + **TypeScript** (strict) | `react-jsx`, path alias `@/*` → `src/*` |
| Chartok | **Recharts 3** | Lazy-loaded részletes chartok |
| Styling | Plain CSS + CSS változók | Nincs Tailwind / CSS-in-JS |
| Lint | **oxlint** | React + TypeScript + oxc pluginok |
| React audit | **react-doctor** | Lokális quality gate (`bun run test:react-doctor`) |
| Teszt | **bun:test** + Testing Library + happy-dom | `bunfig.toml` preload |
| Adatgenerálás | **Python 3** | Grafana CSV → JSON |
| Hosting | **Cloudflare Pages** | `wrangler pages deploy` |
| PWA | Web App Manifest + service worker | `public/manifest.webmanifest`, `public/sw.js`, ikonok |

Nincs Next.js, Vite, Node.js szerver, adatbázis vagy backend API — a frontend statikus JSON fájlokat olvas a `public/data/` alól.

## Előfeltételek

- [Bun](https://bun.sh) (a repo `bun.lock` alapján: ~1.3.x)
- Python 3 — csak ha új Grafana CSV-ből kell regenerálni a series fájlokat

```bash
bun install
```

## Parancsok

| Script | Mit csinál |
| --- | --- |
| `bun dev` | Dev szerver HMR-rel (`bun --hot src/index.ts`), alapport **3000** (`PORT` env) |
| `bun start` | Production Bun szerver (`NODE_ENV=production`) |
| `bun run build` | Typecheck + böngésző bundle `dist/`-be + `public/` másolás |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | oxlint |
| `bun test` | Tesztek (`--concurrency=1`) |
| `bun test:watch` | Watch mód |
| `bun run test:react-doctor` | React Doctor audit (error szintnél bukik) |
| `bun run deploy` | Build + Cloudflare Pages deploy (`levegominoseg`) |
| `bun run import-site` | Grafana CSV → helyszín JSON + `catalog.json` |

Környezeti változók:

- `PORT` — szerver port (default `3000`; foglalt portnál a dev szerver +1…+20-ig próbálkozik)
- `NODE_ENV` — `production` kikapcsolja a HMR-t
- `BUN_PUBLIC_*` — build idején a böngésző bundle-be kerül (`bunfig.toml` + build `--env`)

## Architektúra

```
src/index.ts          Bun.serve — SPA + /data/:file + dev POST /api/sites
src/index.html        HTML shell, theme FOUC-gátló script, fontok, PWA meta
src/frontend.tsx      React mount (#root) + SW regisztráció (prod); /feltoltes csak dev
src/App.tsx           Nézetállapot, adatbetöltés, filterek, chart orchestration
src/hooks/            useDashboardState, useTheme, useChartColors
src/lib/              Domain logika (catalog, importSite, aggregate, aqi, urlState, …)
src/styles/           CSS modulok (tokens → layout → szekciók)
src/test/             Teszt setup + fixture-ök
public/               Statikus assetek (data, ikonok, manifest, SW, _headers)
scripts/              haz01 Python generátor + import-site CLI
```

### Szerver (`src/index.ts`)

- `Bun.serve` route-ok:
  - `/manifest.webmanifest`, `/sw.js`, `/icons/:file`, favicon — `public/` PWA / statikus fájlok
  - `/data/:file` — fájl a `public/data/`-ból (path traversal védelem)
  - `POST /api/sites` — csak `bun dev` (helyszín import); productionben 404
  - `/*` — SPA (`index.html` HTML bundler entry)
- Dev: HMR + console; prod: statikus szerver ugyanazzal a kóddal, vagy Cloudflare Pages a `dist/`-ről
- PWA: production buildben a `registerServiceWorker` regisztrálja a `/sw.js`-t; a SW app shellt cache-el, a `/data/` hálózat-először stratégiát használ

### Frontend adatfolyam

1. `App` betölti a `/data/catalog.json` helyszínlistát, majd a kiválasztott helyszín `files[metrika]` JSON-ját (`fetch`).
2. `lib/aggregate.ts` kliensoldalon számol summary-t (napi / órás / trend, WHO arányok).
3. A nézetállapot (helyszín `s`, metrika, időszak, grain, simple/detailed, …) az URL search paramokban él (`lib/urlState.ts`) — megosztható linkek.
4. Részletes chartok (`DailyChart`, `HourlyChart`) `React.lazy` + `Suspense`.

### Domain fogalmak (`src/lib/types.ts`)

- **MetricId**: `PM1` | `PM2.5` | `PM10`
- **SiteInfo**: nagymarosi helyszín (`nagymaros-haz01`, …), `files` map a series URL-ekre
- **SeriesEntry**: `[timestampMs, value]`
- **TrendGrain** / **MaxWindow**: aggregálási felbontás a trend charton
- **ParentPeriodKey**: negyedév / félév; **WithinMonthScope**: hónap / 1d / 7d / 14d / custom
- WHO 24h irányérték: PM2.5 = 15 µg/m³, PM10 = 45 µg/m³; PM1-re nincs hivatalos (`lib/aqi.ts`)

## Styling

- Belépő: `src/index.css` → `@import` a `src/styles/*.css` fájlokra
- Design tokenek: `styles/tokens.css` (`data-theme="dark"|"light"`)
- Tipográfia (Google Fonts): Barlow Condensed, IBM Plex Sans, IBM Plex Mono
- Nincs CSS Modules / Tailwind — osztálynevek globálisak, fájlonként szekciózva

## Tesztelés

- Setup: `src/test/setup.ts` (happy-dom Window, Testing Library cleanup, Recharts layout mock)
- Preload: `bunfig.toml` → `[test] preload`
- Tesztek a forrás mellett: `*.test.ts` / `*.test.tsx`
- Fixture-ök: `src/test/fixtures.ts`

```bash
bun test
bun test src/lib/aggregate.test.ts
bun run test:react-doctor
```

React komponens / hook / state–effect változtatás után futtasd a React Doctor-t. Konfig: `doctor.config.json`. Csak lokális — nincs CI workflow.

## Lint & TypeScript

- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `moduleResolution: bundler`, `verbatimModuleSyntax`
- oxlint: React hooks error, `only-export-components` warn (`.oxlintrc.json`)

## Adatgenerálás

Grafana CSV exportok a `public/data/`-ban → JSON series.

**Ház 01** (beépített `series-pm*.json`):

```bash
python3 scripts/generate_pm25_data.py
```

A script:

- Beolvassa: `pm1-sps30-2026.csv`, `pm25-sps30-2026.csv`, `pm10-sps30-2026.csv`
- Kiírja: `series-pm1.json`, `series-pm25.json`, `series-pm10.json`
- Alias: `series.json` ← PM2.5
- Előaggregált: `summary.json` (PM2.5 teljes időszakra)
- Kizárja a hiányos hónapokat (`EXCLUDE_MONTH_PREFIXES`, jelenleg `2026-08`)
- Meta: szenzor SPS30, chip `esp8266-2702201`, mintavétel ~3 perc

A `public/data/catalog.json` a `nagymaros-haz01` sort ezekre a fájlokra mutatja.

**További helyszín** (TypeScript parser, nincs hónapszűrés):

```bash
bun run import-site -- --id nagymaros-iskola01 --label "Iskola 01" pm25.csv pm10.csv
```

Lapos kimenet: `public/data/nagymaros-iskola01-pm25.json` + katalógus-frissítés. Ugyanarra a slugra futtatva felülír. Helyi űrlap: `bun dev` → `/feltoltes` (productionben nincs). Ellenőrizd `bun dev`-vel, commitold a `public/data/`-t, majd `bun run deploy`.

Új ház-CSV után futtasd a Python scriptet, majd ellenőrizd a UI-t `bun dev`-vel.

## Build & deploy

```bash
bun run build
# dist/ — minified böngésző bundle + public/ tartalom

bun run deploy
# wrangler pages deploy dist --project-name=levegominoseg
```

A production Pages deploy **statikus**: a Bun szerver csak lokális / saját hostoláshoz kell.

## Fontos fájlok gyorsindex

| Fájl | Szerep |
| --- | --- |
| `package.json` | Script-ek és függőségek |
| `bunfig.toml` | Static env prefix, test preload |
| `tsconfig.json` | TS / path alias |
| `.oxlintrc.json` | Lint szabályok |
| `src/lib/aggregate.ts` | Aggregálás, időszakok, grain javaslat |
| `src/lib/urlState.ts` | URL ↔ nézetállapot |
| `src/lib/catalog.ts` | Helyszínkatalógus |
| `src/lib/aqi.ts` | WHO, tone, metrika slug / URL |
| `scripts/generate_pm25_data.py` | CSV → JSON pipeline |
