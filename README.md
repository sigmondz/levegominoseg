# Levegő

React + TypeScript megjelenítő a helyi **PM2.5** (SPS30) mérésekhez.
Teljes **Bun** stack: runtime, package manager, bundler, dev server (`Bun.serve`).

## Adatok

- `public/data/pm25-sps30-2026.csv` — Grafana CSV export (2026. január–augusztus)
- `public/data/series.json` — nyers idősor a szűréshez
- `public/data/summary.json` — előaggregált statisztikák
- `public/data/grafana-pm-sensors-dashboard.json` — eredeti Grafana dashboard export

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
