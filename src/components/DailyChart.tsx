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
import { GRAFANA_THRESHOLD, pmTone, who24h } from "../lib/aqi";
import { downloadFilteredCsv } from "../lib/exportCsv";
import { IconActionButton } from "./IconActionButton";
import { InfoTip } from "./InfoTip";
import { ShareView } from "./ShareView";

type Props = {
  trend: TrendPoint[];
  mean: number;
  metric: string;
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

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5v7.5M8 10 5.2 7.2M8 10l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12.5h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartExportActions({
  exportPoints,
  exportFromMs,
  exportToMs,
  mean,
}: {
  exportPoints: SeriesEntry[];
  exportFromMs: number;
  exportToMs: number;
  mean: number;
}) {
  return (
    <div className="chart-export-actions">
      <IconActionButton
        label="CSV letöltés"
        tip="CSV letöltés. A kiválasztott időszak nyers, 3 perces mérési pontjait tölti le."
        tipId="csv-export-tip"
        disabled={exportPoints.length === 0}
        onClick={() =>
          downloadFilteredCsv(exportPoints, exportFromMs, exportToMs)
        }
      >
        <DownloadIcon />
      </IconActionButton>
      <ShareView fromMs={exportFromMs} toMs={exportToMs} mean={mean} />
    </div>
  );
}

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
  { id: "2d", label: "2 nap" },
  { id: "week", label: "Hét" },
];

const MAX_WINDOW_OPTIONS: { id: MaxWindow; label: string }[] = [
  { id: "3m", label: "3 perc" },
  { id: "6m", label: "6 perc" },
  { id: "15m", label: "15 perc" },
  { id: "30m", label: "30 perc" },
  { id: "hour", label: "1 óra" },
  { id: "2h", label: "2 óra" },
  { id: "6h", label: "6 óra" },
  { id: "12h", label: "12 óra" },
  { id: "day", label: "Nap" },
];

type GrainCopy = {
  title: string;
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
    case "2h":
      return "2 órás";
    case "6h":
      return "6 órás";
    case "12h":
      return "12 órás";
    case "day":
      return "napi";
  }
}

type BucketCopy = {
  title: string;
  desc: (intervalMin: number) => string;
  seriesDesc: (intervalMin: number) => string;
  /** e.g. "nap" / "két nap" / "hét" — used in max tip */
  bucket: string;
  /** e.g. "napon belüli" / "két napon belüli" / "héten belüli" */
  bucketInside: string;
};

const BUCKET_COPY: Partial<Record<TrendGrain, BucketCopy>> = {
  day: {
    title: "Napi átlag és csúcs",
    bucket: "nap",
    bucketInside: "napon belüli",
    desc: (intervalMin) =>
      `Minden nap a ${intervalMin} perces átlagértékekből számolva. A szaggatott vonalak a referencia-határértékek.`,
    seriesDesc: (intervalMin) =>
      `Az adott nap összes érvényes ${intervalMin} perces mintájának számtani átlaga. A napi tipikus PM2.5-szintet mutatja: a rövid kiugrások kevésbé húzzák el, mint a nyers görbén. Így napokat hasonlíthatsz össze, és látod, általában milyen volt a terhelés. A grafikonon a folyamatos (nem szaggatott) görbe.`,
  },
  "2d": {
    title: "Kétnapos átlag és csúcs",
    bucket: "két nap",
    bucketInside: "két napon belüli",
    desc: (intervalMin) =>
      `Minden kétnapos blokk a ${intervalMin} perces átlagértékekből számolva. A szaggatott vonalak a referencia-határértékek.`,
    seriesDesc: (intervalMin) =>
      `Az adott két nap összes érvényes ${intervalMin} perces mintájának számtani átlaga. Sűrűbb, mint a heti nézet, de simább, mint a napi — negyedéves és féléves tartományokban jól követhető. A grafikonon a folyamatos (nem szaggatott) görbe.`,
  },
  week: {
    title: "Heti átlag és csúcs",
    bucket: "hét",
    bucketInside: "héten belüli",
    desc: (intervalMin) =>
      `Minden hét (hétfőtől vasárnapig) a ${intervalMin} perces átlagértékekből számolva. A szaggatott vonalak a referencia-határértékek.`,
    seriesDesc: (intervalMin) =>
      `Az adott hét összes érvényes ${intervalMin} perces mintájának számtani átlaga. A heti tipikus PM2.5-szintet mutatja: a rövid kiugrások és a napi zaj kevésbé húzzák el. Negyedéves vagy féléves nézetben így jól összehasonlíthatók a hetek. A grafikonon a folyamatos (nem szaggatott) görbe.`,
  },
};

const SHORT_GRAIN_UI: Partial<
  Record<TrendGrain, { titlePrefix: string; windowLabel: string }>
> = {
  hour: { titlePrefix: "Óránkénti", windowLabel: "1 órában" },
  "2h": { titlePrefix: "2 órás", windowLabel: "2 órában" },
  "4h": { titlePrefix: "4 órás", windowLabel: "4 órában" },
  "8h": { titlePrefix: "8 órás", windowLabel: "8 órában" },
  "12h": { titlePrefix: "12 órás", windowLabel: "12 órában" },
  "6m": { titlePrefix: "6 perces", windowLabel: "6 percben" },
  "15m": { titlePrefix: "15 perces", windowLabel: "15 percben" },
  "30m": { titlePrefix: "30 perces", windowLabel: "30 percben" },
};

function maxDescForBucket(
  intervalMin: number,
  maxLabel: string,
  maxIsRaw: boolean,
  bucket: string,
  bucketInside: string,
): string {
  if (maxIsRaw) {
    return `Az adott ${bucket} legmagasabb ${intervalMin} perces mérése — a csúcsterhelést emeli ki. A max ablak „${intervalMin} perc” beállításánál ez a nyers csúcs. A grafikonon a piros görbe.`;
  }
  return `Az adott ${bucketInside}, ${maxLabel} ablakokra számolt átlagok közül a legmagasabb. A rövid kiugrásokat simítja, a tartósabb csúcsokat megőrzi. A max ablakot fent állíthatod. A grafikonon a piros görbe.`;
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
      desc: `A szenzor ${intervalMin} percenkénti mintái aggregálás nélkül. A szaggatott vonalak a referencia-határértékek.`,
      seriesTitle: "Mért érték (görbe)",
      seriesDesc: `Minden pont egyetlen ${intervalMin} perces szenzorolvasás, aggregálás és simítás nélkül. Így látszik a tényleges időbeli változás: a rövid kiugrások és a csendesebb szakaszok is. Hasznos, ha a pillanatnyi terhelést akarod követni, nem a hosszabb időszaki tipikus szintet. A grafikonon a folyamatos (nem szaggatott) görbe.`,
    };
  }

  const bucket = BUCKET_COPY[grain];
  if (bucket) {
    return {
      title: bucket.title,
      desc: bucket.desc(intervalMin),
      seriesTitle: "Átlag görbe",
      seriesDesc: bucket.seriesDesc(intervalMin),
      maxDesc: maxDescForBucket(
        intervalMin,
        maxLabel,
        maxIsRaw,
        bucket.bucket,
        bucket.bucketInside,
      ),
    };
  }

  const short = SHORT_GRAIN_UI[grain] ?? {
    titlePrefix: "30 perces",
    windowLabel: "30 percben",
  };
  const { titlePrefix, windowLabel } = short;

  return {
    title: `${titlePrefix} átlag és csúcs`,
    desc: `A kiválasztott tartomány ${titlePrefix.toLowerCase()} átlag- és maximumértékei a ${intervalMin} perces mintákból.`,
    seriesTitle: "Átlag görbe",
    seriesDesc: `Az adott ${windowLabel} mért, érvényes ${intervalMin} perces minták számtani átlaga. A tipikus terhelést mutatja ebben az időablakban: a rövid zaj kevésbé látszik, mint a nyers görbén. Így követheted, hogyan alakult a PM2.5 a választott adatsűrűség szerint. A grafikonon a folyamatos (nem szaggatott) görbe.`,
    maxDesc: maxIsRaw
      ? `Az adott ${windowLabel} mért legmagasabb ${intervalMin} perces érték — a rövid csúcsokat emeli ki. Ha egy erős, rövid szennyezési hullám volt, itt jelenik meg, még ha az átlagot alig emelte is. A max ablak „${intervalMin} perc” beállításánál ez a nyers csúcs. A grafikonon a piros görbe.`
      : `Az adott ${windowLabel} belüli, ${maxLabel} ablakokra számolt átlagok közül a legmagasabb. A rövid, egyedi kiugrásokat simítja, de a tartósabb csúcsokat megőrzi — ezért kevésbé „zajérzékeny”, mint a nyers max. A max ablakot fent állíthatod. A grafikonon a piros görbe.`,
  };
}

export function DailyChart({
  trend,
  mean,
  metric,
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
  const who = who24h(metric);
  const showMax = grain !== "raw";
  const animate = trend.length <= 400;

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
        <div className="label-with-tip">
          <h2 className="section-title" id="daily-title">
            {copy.title}
          </h2>
          <InfoTip label="Miről szól ez a grafikon?" tipId="daily-chart-tip">
            {copy.desc}
          </InfoTip>
        </div>
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
            <ChartExportActions
              exportPoints={exportPoints}
              exportFromMs={exportFromMs}
              exportToMs={exportToMs}
              mean={mean}
            />
          </div>
        ) : (
          <div className="max-window-row max-window-row--export-only">
            <ChartExportActions
              exportPoints={exportPoints}
              exportFromMs={exportFromMs}
              exportToMs={exportToMs}
              mean={mean}
            />
          </div>
        )}
      </div>
      <div className="chart-shell">
        {trend.length === 0 ? (
          <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={trend}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={tickStyle}
                axisLine={{ stroke: colors.line }}
                tickLine={false}
                interval="equidistantPreserveStart"
                minTickGap={36}
                tickMargin={6}
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
              {who != null ? (
                <ReferenceLine
                  y={who}
                  stroke={colors.good}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              ) : null}
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
          <ul className="threshold-legend-list">
            <li>
              <span
                className="series-swatch"
                style={{ background: colors.chartMean }}
                aria-hidden
              />
              <div className="label-with-tip">
                <strong>{copy.seriesTitle}</strong>
                <InfoTip
                  label={
                    copy.seriesTitle.startsWith("Á")
                      ? "Mi az átlag görbe?"
                      : "Mi a mért érték görbe?"
                  }
                  tipId="series-mean-tip"
                >
                  {copy.seriesDesc}
                </InfoTip>
              </div>
            </li>
            {showMax && copy.maxDesc ? (
              <li>
                <span
                  className="series-swatch"
                  style={{ background: colors.bad }}
                  aria-hidden
                />
                <div className="label-with-tip">
                  <strong>Max görbe</strong>
                  <InfoTip label="Mi a max görbe?" tipId="series-max-tip">
                    {copy.maxDesc}
                  </InfoTip>
                </div>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="threshold-legend" aria-label="Határértékek jelmagyarázata">
          <p className="threshold-legend-title">Határértékek</p>
          <ul className="threshold-legend-list">
            {who != null ? (
              <li>
                <span
                  className="threshold-line threshold-line--who"
                  style={{ borderTopColor: colors.good }}
                  aria-hidden
                />
                <div className="threshold-legend-item">
                  <div className="label-with-tip">
                    <strong>WHO 24 órás irányérték</strong>
                    <InfoTip label="Mi a WHO irányérték?" tipId="who-threshold-tip">
                      A WHO 2021-es {metric} irányelve: a 24 órás átlag ne lépje
                      túl a {who} µg/m³-t. Nem jogszabályi határ, hanem
                      egészségügyi ajánlás; efelett a rövid távú terhelés már
                      növeli a légzőszervi és szív-érrendszeri kockázatot. A
                      grafikonon a zöld szaggatott vonal jelöli.
                    </InfoTip>
                  </div>
                  <span className="threshold-legend-value tone-good">
                    {who} µg/m³
                  </span>
                </div>
              </li>
            ) : null}
            <li>
              <span
                className="threshold-line threshold-line--mean"
                style={{ borderTopColor: colors.poor }}
                aria-hidden
              />
              <div className="threshold-legend-item">
                <div className="label-with-tip">
                  <strong>Kiválasztott időszak átlaga</strong>
                  <InfoTip
                    label="Mi a kiválasztott időszak átlaga?"
                    tipId="mean-threshold-tip"
                  >
                    A jelenlegi szűrés összes érvényes {intervalMin} perces
                    mérésének számtani átlaga — függetlenül attól, milyen
                    adatsűrűséget választasz a görbéhez. Referenciaként szolgál:
                    ehhez viszonyíthatod, a görbe hol van tipikusan a kiválasztott
                    időszakban. A grafikonon a narancssárga szaggatott vonal jelöli.
                  </InfoTip>
                </div>
                <span
                  className={`threshold-legend-value tone-${pmTone(mean, metric)}`}
                >
                  {mean.toFixed(1)} µg/m³
                </span>
              </div>
            </li>
            <li>
              <span
                className="threshold-line threshold-line--alert"
                style={{ borderTopColor: colors.bad }}
                aria-hidden
              />
              <div className="threshold-legend-item">
                <div className="label-with-tip">
                  <strong>Magas szennyezettségi küszöb</strong>
                  <InfoTip
                    label="Mi a magas szennyezettségi küszöb?"
                    tipId="alert-threshold-tip"
                  >
                    Efelett a levegő erősen szennyezettnek számít ezen az
                    oldalon. Nem hivatalos határ, hanem helyi riasztási szint
                    {who != null
                      ? " — többszöröse a WHO irányértéknek"
                      : ""}
                    . A grafikonon a piros szaggatott vonal jelöli.
                  </InfoTip>
                </div>
                <span className="threshold-legend-value tone-bad">
                  {GRAFANA_THRESHOLD} µg/m³
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
