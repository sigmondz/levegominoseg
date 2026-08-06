# Levegő

Helyi **PM1 / PM2.5 / PM10** levegőminőség-megjelenítő Nagymarosról (SPS30 szenzor). A mérések Grafana CSV exportból származnak; a böngészőben idősorok, napi/órás aggregátumok és WHO irányérték-összehasonlítás jelenik meg.

Fejlesztői / tech stack részletek: [DEVELOPMENT.md](./DEVELOPMENT.md).

## Mit csinál

- Metrika választás: PM1, PM2.5, PM10
- Időszak szűrés (negyedév / félév, hónap, 1–14 nap, egyéni tartomány)
- Egyszerű és részletes nézet (statisztikák, legrosszabb napok, chartok)
- Megosztható URL (a nézetállapot a query stringben van)
- Világos / sötét téma

## Gyors start

```bash
bun install
bun dev
```

A dev szerver alapból a [http://localhost:3000](http://localhost:3000) címen indul (`PORT` környezeti változóval állítható).

További parancsok:

```bash
bun test          # tesztek
bun run test:react-doctor  # React Doctor (lokális)
bun run build     # statikus build → dist/
bun start         # production Bun szerver
bun run deploy    # build + Cloudflare Pages
```

## Adatok

A nyers és előkészített fájlok a `public/data/` mappában vannak:

| Fájl | Tartalom |
| --- | --- |
| `pm{1,25,10}-sps30-2026.csv` | Grafana CSV export (SPS30) |
| `series-pm{1,25,10}.json` | Idősor a UI-hoz (`[timestampMs, value]`) |
| `series.json` | PM2.5 alias (visszafelé kompatibilitás) |
| `summary.json` | Előaggregált PM2.5 statisztikák |
| `grafana-pm-sensors-dashboard.json` | Eredeti Grafana dashboard export |

Új CSV után a series fájlok újragenerálása:

```bash
python3 scripts/generate_pm25_data.py
```

A hiányos hónapok (jelenleg 2026. augusztus) ki vannak hagyva a generált series-ből, amíg nincs elég adat.

## Stack röviden

Teljes **Bun** toolchain (runtime, package manager, bundler, `Bun.serve` + HMR), **React 19**, **TypeScript**, **Recharts**, plain CSS. Production: Cloudflare Pages (`dist/`).

Részletek, mappa-struktúra, tesztelés és deploy: [DEVELOPMENT.md](./DEVELOPMENT.md).
