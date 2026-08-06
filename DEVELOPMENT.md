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

Környezeti változók:

- `PORT` — szerver port (default `3000`; foglalt portnál a dev szerver +1…+20-ig próbálkozik)
- `NODE_ENV` — `production` kikapcsolja a HMR-t
- `BUN_PUBLIC_*` — build idején a böngésző bundle-be kerül (`bunfig.toml` + build `--env`)

## Architektúra

```
src/index.ts          Bun.serve — SPA + /data/:file
src/index.html        HTML shell, theme FOUC-gátló script, fontok
src/frontend.tsx      React mount (#root)
src/App.tsx           Nézetállapot, adatbetöltés, filterek, chart orchestration
src/components/       UI (Hero, filterek, Stats, chartok, …)
src/hooks/            useTheme, useChartColors
src/lib/              Domain logika (aggregate, aqi, urlState, types, …)
src/styles/           CSS modulok (tokens → layout → szekciók)
src/test/             Teszt setup + fixture-ök
public/data/          Statikus CSV / JSON adat
scripts/              Offline adatgenerálás (Python)
```

### Szerver (`src/index.ts`)

- `Bun.serve` route-ok:
  - `/data/:file` — fájl a `public/data/`-ból (path traversal védelem)
  - `/*` — SPA (`index.html` HTML bundler entry)
- Dev: HMR + console; prod: statikus szerver ugyanazzal a kóddal, vagy Cloudflare Pages a `dist/`-ről

### Frontend adatfolyam

1. `App` betölti a kiválasztott metrika `series-pm*.json` fájlját (`fetch`).
2. `lib/aggregate.ts` kliensoldalon számol summary-t (napi / órás / trend, WHO arányok).
3. A nézetállapot (metrika, időszak, grain, simple/detailed, …) az URL search paramokban él (`lib/urlState.ts`) — megosztható linkek.
4. Részletes chartok (`DailyChart`, `HourlyChart`) `React.lazy` + `Suspense`.

### Domain fogalmak (`src/lib/types.ts`)

- **MetricId**: `PM1` | `PM2.5` | `PM10`
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

Grafana CSV exportok a `public/data/`-ban → JSON series:

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

Új CSV után futtasd a scriptet, majd ellenőrizd a UI-t `bun dev`-vel.

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
| `src/lib/aqi.ts` | WHO, tone, metrika slug / URL |
| `scripts/generate_pm25_data.py` | CSV → JSON pipeline |
