# Levegő

React + TypeScript megjelenítő a helyi **PM1 / PM2.5 / PM10** (SPS30) mérésekhez.
Teljes **Bun** stack: runtime, package manager, bundler, dev server (`Bun.serve`).

## Adatok

- `public/data/pm1-sps30-2026.csv` — Grafana CSV export, SPS30 PM1 (2026. január–július)
- `public/data/pm25-sps30-2026.csv` — Grafana CSV export, SPS30 PM2.5 (2026. január–július)
- `public/data/pm10-sps30-2026.csv` — Grafana CSV export, SPS30 PM10 (2026. január–július)
- `public/data/series-pm1.json` / `series-pm25.json` / `series-pm10.json` — nyers idősorszűréshez
- `public/data/series.json` — PM2.5 alias (visszafelé kompatibilitás)
- `public/data/summary.json` — előaggregált statisztikák (PM2.5)
- `public/data/grafana-pm-sensors-dashboard.json` — eredeti Grafana dashboard export

Az augusztusi napok a generált series fájlokból ki vannak hagyva (még kevés adat).

## Futtatás

```bash
bun install
bun dev
```

Production (Bun szerver):

```bash
bun start
```

Statikus build (`dist/`):

```bash
bun run build
```
