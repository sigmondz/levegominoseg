import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartColors } from "../hooks/useChartColors";
import type { MaxWindow, SeriesEntry, TrendGrain, TrendPoint } from "../lib/types";
import { GRAFANA_THRESHOLD, WHO_24H } from "../lib/aqi";
import { downloadFilteredCsv } from "../lib/exportCsv";
import { InfoTip } from "./InfoTip";

type Props = {
  trend: TrendPoint[];
  mean: number;
  grain: TrendGrain;
  availableGrains: TrendGrain[];
  maxWindow: MaxWindow;
  availableMaxWindows: MaxWindow[];
  intervalMin: number;
  exportPoints: SeriesEntry[];
  exportFromMs: number;
  exportToMs: number;
  onGrainChange: (grain: TrendGrain) => void;
  onMaxWindowChange: (window: MaxWindow) => void;
};

const GRAIN_OPTIONS: { id: TrendGrain; label: string }[] = [
  { id: "raw", label: "3 perc" },
  { id: "6m", label: "6 perc" },
  { id: "15m", label: "15 perc" },
  { id: "30m", label: "30 perc" },
  { id: "hour", label: "1 óra" },
  { id: "2h", label: "2 óra" },
  { id: "4h", label: "4 óra" },
  { id: "8h", label: "8 óra" },
  { id: "12h", label: "12 óra" },
  { id: "day", label: "Nap" },
];

const MAX_WINDOW_OPTIONS: { id: MaxWindow; label: string }[] = [
  { id: "3m", label: "3 perc" },
  { id: "6m", label: "6 perc" },
  { id: "15m", label: "15 perc" },
  { id: "30m", label: "30 perc" },
  { id: "hour", label: "1 óra" },
];

type GrainCopy = {
  title: string;
  kicker: string;
  desc: string;
  seriesTitle: string;
  seriesDesc: string;
  maxDesc?: string;
};

function maxWindowLabel(window: MaxWindow, intervalMin: number): string {
  switch (window) {
    case "3m":
      return `${intervalMin} perces`;
    case "6m":
      return "6 perces";
    case "15m":
      return "15 perces";
    case "30m":
      return "30 perces";
    case "hour":
      return "1 órás";
  }
}

function grainCopy(
  grain: TrendGrain,
  intervalMin: number,
  maxWindow: MaxWindow,
): GrainCopy {
  const maxLabel = maxWindowLabel(maxWindow, intervalMin);
  const maxIsRaw = maxWindow === "3m";

  if (grain === "raw") {
    return {
      title: `${intervalMin} perces mérések`,
      kicker: "Nyers felbontás",
      desc: `A szenzor ${intervalMin} percenkénti mintái aggregálás nélkül. A szaggatott vonalak a referencia-határértékek.`,
      seriesTitle: "Mért érték (görbe)",
      seriesDesc: `Minden pont egy ${intervalMin} perces mérés — a tényleges időbeli változást mutatja, simítás nélkül.`,
    };
  }

  if (grain === "day") {
    return {
      title: "Napi átlag és csúcs",
      kicker: "Napi aggregáció",
      desc: `Minden nap a ${intervalMin} perces mean értékekből számolva. A szaggatott vonalak a referencia-határértékek.`,
      seriesTitle: "Átlag (görbe)",
      seriesDesc: `Az adott nap összes ${intervalMin} perces mintájának számtani átlaga — a napi tipikus PM2.5-szintet mutatja.`,
      maxDesc: maxIsRaw
        ? `Az adott nap legmagasabb ${intervalMin} perces értéke — a napi csúcsterhelést mutatja.`
        : `Az adott nap legmagasabb ${maxLabel} átlaga — a rövid csúcsokat simítva mutatja.`,
    };
  }

  const windowLabel =
    grain === "hour"
      ? "1 órában"
      : grain === "2h"
        ? "2 órában"
        : grain === "4h"
          ? "4 órában"
          : grain === "8h"
            ? "8 órában"
            : grain === "12h"
              ? "12 órában"
              : grain === "6m"
                ? "6 percben"
                : grain === "15m"
                  ? "15 percben"
                  : "30 percben";

  const titlePrefix =
    grain === "hour"
      ? "Óránkénti"
      : grain === "2h"
        ? "2 órás"
        : grain === "4h"
          ? "4 órás"
          : grain === "8h"
            ? "8 órás"
            : grain === "12h"
              ? "12 órás"
              : grain === "6m"
                ? "6 perces"
                : grain === "15m"
                  ? "15 perces"
                  : "30 perces";

  return {
    title: `${titlePrefix} átlag és csúcs`,
    kicker: `${titlePrefix} aggregáció`,
    desc: `A kiválasztott tartomány ${titlePrefix.toLowerCase()} mean és max értékei a ${intervalMin} perces mintákból.`,
    seriesTitle: "Átlag (görbe)",
    seriesDesc: `Az adott ${windowLabel} mért minták számtani átlaga — a tipikus terhelést mutatja.`,
    maxDesc: maxIsRaw
      ? `Az adott ${windowLabel} mért legmagasabb érték — a rövid csúcsokat emeli ki.`
      : `Az adott ${windowLabel} legmagasabb ${maxLabel} átlaga — a rövid csúcsokat simítva mutatja.`,
  };
}

export function DailyChart({
  trend,
  mean,
  grain,
  availableGrains,
  maxWindow,
  availableMaxWindows: maxWindows,
  intervalMin,
  exportPoints,
  exportFromMs,
  exportToMs,
  onGrainChange,
  onMaxWindowChange,
}: Props) {
  const colors = useChartColors();
  const copy = grainCopy(grain, intervalMin, maxWindow);
  const showMax = grain !== "raw";
  const animate = trend.length <= 400;

  const tickInterval =
    trend.length <= 12
      ? 0
      : trend.length <= 31
        ? 2
        : Math.ceil(trend.length / 12);

  const tooltipStyle = {
    background: colors.elevated,
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    color: colors.text,
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 14,
  };

  const tickStyle = {
    fill: colors.textMuted,
    fontSize: 13,
    fontFamily: "IBM Plex Mono",
  };

  const grainOptions = GRAIN_OPTIONS.filter((opt) =>
    availableGrains.includes(opt.id),
  ).map((opt) =>
    opt.id === "raw" ? { ...opt, label: `${intervalMin} perc` } : opt,
  );

  const maxWindowOptions = MAX_WINDOW_OPTIONS.filter((opt) =>
    maxWindows.includes(opt.id),
  ).map((opt) =>
    opt.id === "3m" ? { ...opt, label: `${intervalMin} perc` } : opt,
  );

  return (
    <section className="section" id="napi" aria-labelledby="daily-title">
      <div className="section-head">
        <p className="section-kicker">{copy.kicker}</p>
        <h2 className="section-title" id="daily-title">
          {copy.title}
        </h2>
        <p className="section-desc">{copy.desc}</p>
        <div className="grain-picker" role="group" aria-label="Adatsűrűség">
          <div className="label-with-tip">
            <p className="period-months-label" id="grain-filter-label">
              Adatsűrűség
            </p>
            <InfoTip label="Mi az adatsűrűség?" tipId="grain-tip">
              Azt állítja, milyen hosszú időszakokból rajzolódjon egy-egy pont
              a görbén. Például „Nap” esetén minden naphoz egy átlag (és egy
              csúcs) tartozik. A szenzor továbbra is 3 percenként mér — ez csak
              a megjelenítést sűríti vagy ritkítja.
            </InfoTip>
          </div>
          <div className="period-chips" aria-labelledby="grain-filter-label">
            {grainOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`period-chip${grain === opt.id ? " is-active" : ""}`}
                aria-pressed={grain === opt.id}
                onClick={() => onGrainChange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {showMax && maxWindowOptions.length > 0 ? (
          <div className="max-window-row" role="group" aria-label="Max ablak">
            <div className="max-window-row-main">
              <div className="label-with-tip">
                <p className="period-months-label" id="max-window-filter-label">
                  Max ablak
                </p>
                <InfoTip label="Mi a max ablak?" tipId="max-window-tip">
                  A piros csúcsgörbe számításához: a választott hosszúságú
                  átlagok közül vesszük a legnagyobbat (pl. egy napon belül).
                  3 percnél a legmagasabb nyers mérést kapod; hosszabb ablaknál
                  a rövid kiugrások simábbak lesznek.
                </InfoTip>
              </div>
              <div
                className="period-chips"
                aria-labelledby="max-window-filter-label"
              >
                {maxWindowOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`period-chip${maxWindow === opt.id ? " is-active" : ""}`}
                    aria-pressed={maxWindow === opt.id}
                    onClick={() => onMaxWindowChange(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="export-btn-with-tip">
              <button
                type="button"
                className="export-btn"
                disabled={exportPoints.length === 0}
                onClick={() =>
                  downloadFilteredCsv(exportPoints, exportFromMs, exportToMs)
                }
              >
                CSV letöltés
              </button>
              <InfoTip label="Mi a CSV letöltés?" tipId="csv-export-tip">
                A kiválasztott időszak nyers, 3 perces mérési pontjait tölti le
                (időbélyeg + PM2.5). Excelben is megnyitható.
              </InfoTip>
            </div>
          </div>
        ) : (
          <div className="max-window-row max-window-row--export-only">
            <div className="export-btn-with-tip">
              <button
                type="button"
                className="export-btn"
                disabled={exportPoints.length === 0}
                onClick={() =>
                  downloadFilteredCsv(exportPoints, exportFromMs, exportToMs)
                }
              >
                CSV letöltés
              </button>
              <InfoTip label="Mi a CSV letöltés?" tipId="csv-export-tip">
                A kiválasztott időszak nyers, 3 perces mérési pontjait tölti le
                (időbélyeg + PM2.5). Excelben is megnyitható.
              </InfoTip>
            </div>
          </div>
        )}
      </div>
      <div className="chart-shell">
        <div className="chart-legend" aria-label="Adatsorok">
          <span>
            <i
              className="swatch swatch-solid"
              style={{ background: colors.chartMean }}
            />{" "}
            {showMax ? "Átlag (görbe)" : "Mért érték"}
          </span>
          {showMax ? (
            <span>
              <i
                className="swatch swatch-solid"
                style={{ background: colors.bad }}
              />{" "}
              Max (görbe)
            </span>
          ) : null}
        </div>

        {trend.length === 0 ? (
          <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={trend}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={tickStyle}
                axisLine={{ stroke: colors.line }}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                width={42}
                label={{
                  value: "µg/m³",
                  angle: -90,
                  position: "insideLeft",
                  fill: colors.textMuted,
                  fontSize: 13,
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  `${Number(value).toFixed(1)} µg/m³`,
                  "",
                ]}
                labelFormatter={(label) => String(label)}
              />
              <ReferenceLine
                y={WHO_24H}
                stroke={colors.good}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={mean}
                stroke={colors.poor}
                strokeDasharray="2 6"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={GRAFANA_THRESHOLD}
                stroke={colors.bad}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="mean"
                name={showMax ? "Átlag" : "Mért érték"}
                stroke={colors.chartMean}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={animate}
              />
              {showMax ? (
                <Line
                  type="monotone"
                  dataKey="max"
                  name="Max"
                  stroke={colors.bad}
                  strokeWidth={1.5}
                  strokeOpacity={0.85}
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive={animate}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="chart-legend-block" aria-label="Görbék jelmagyarázata">
          <p className="threshold-legend-title">Görbék</p>
          <ul
            className={`threshold-legend-list${showMax ? " threshold-legend-list--series" : ""}`}
          >
            <li>
              <span
                className="series-swatch"
                style={{ background: colors.chartMean }}
                aria-hidden
              />
              <div>
                <strong>{copy.seriesTitle}</strong>
                <span>{copy.seriesDesc}</span>
              </div>
            </li>
            {showMax && copy.maxDesc ? (
              <li>
                <span
                  className="series-swatch"
                  style={{ background: colors.bad }}
                  aria-hidden
                />
                <div>
                  <strong>Max (görbe)</strong>
                  <span>{copy.maxDesc}</span>
                </div>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="threshold-legend" aria-label="Határértékek jelmagyarázata">
          <p className="threshold-legend-title">Határértékek</p>
          <ul className="threshold-legend-list">
            <li>
              <span
                className="threshold-line threshold-line--who"
                style={{ borderTopColor: colors.good }}
                aria-hidden
              />
              <div>
                <strong>WHO 24 órás irányérték — {WHO_24H} µg/m³</strong>
                <span>
                  Az Egészségügyi Világszervezet ajánlása. Efelett a rövid távú
                  PM2.5-terhelés már egészségügyi kockázatot jelez.
                </span>
              </div>
            </li>
            <li>
              <span
                className="threshold-line threshold-line--mean"
                style={{ borderTopColor: colors.poor }}
                aria-hidden
              />
              <div>
                <strong>
                  Kiválasztott időszak átlaga — {mean.toFixed(1)} µg/m³
                </strong>
                <span>
                  A jelenlegi szűrés összes érvényes mérésének számtani átlaga.
                  Ehhez viszonyíthatod a görbéket.
                </span>
              </div>
            </li>
            <li>
              <span
                className="threshold-line threshold-line--alert"
                style={{ borderTopColor: colors.bad }}
                aria-hidden
              />
              <div>
                <strong>
                  Magas szennyezettségi küszöb — {GRAFANA_THRESHOLD} µg/m³
                </strong>
                <span>
                  A Grafana dashboard piros riasztási szintje. Efelett a
                  koncentráció erősen emelkedettnek számít. Alacsony tartományban
                  a vonal a skálán kívül eshet.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
