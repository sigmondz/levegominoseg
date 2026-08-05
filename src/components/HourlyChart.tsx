import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartColors } from "../hooks/useChartColors";
import { pmTone, who24h } from "../lib/aqi";
import { buildYAxisTicks, chartYDomainMax } from "../lib/chartAxis";
import {
  CHART_ANIMATION_DURATION_MS,
  chartSeriesAnimated,
  withWhoThresholdShades,
} from "../lib/simpleChart";
import { toneChartColor } from "../lib/theme";
import type { HourlyPoint } from "../lib/types";
import { ChartYAxisTick } from "./ChartYAxisTick";
import { InfoTip } from "./InfoTip";
import { WhoGuidelineLabel } from "./WhoGuidelineLabel";

type Props = {
  hourly: HourlyPoint[];
  mean: number;
  metric: string;
  intervalMin: number;
};

export function HourlyChart({ hourly, mean, metric, intervalMin }: Props) {
  const colors = useChartColors();
  const who = who24h(metric);
  const labeled = hourly.map((point) => ({
    ...point,
    label: `${String(point.hour).padStart(2, "0")}:00`,
  }));
  const chartPoints = withWhoThresholdShades(labeled, who);
  const hasThresholdExceedance =
    who != null && labeled.some((point) => point.mean > who);
  const hasThresholdCompliance =
    who != null && labeled.some((point) => point.mean < who);
  const domainMax = chartYDomainMax(
    who ?? 0,
    mean,
    ...labeled.map((point) => point.mean),
  );
  const yTicks = buildYAxisTicks(domainMax, [who, mean]);
  const meanColor = toneChartColor(pmTone(mean, metric), colors);
  const xMax = Math.max(labeled.length - 1, 0);
  const xTicks = labeled.map((_, index) => index);
  const animate = chartSeriesAnimated(labeled.length);

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

  return (
    <section className="section" id="orankent" aria-labelledby="hourly-title">
      <div className="section-head">
        <div className="label-with-tip">
          <h2 className="section-title" id="hourly-title">
            Óránkénti profil
          </h2>
          <InfoTip label="Mi az óránkénti profil?" tipId="hourly-tip">
            A kiválasztott időszak napjainak óránkénti átlaga (0–23). Nem egyetlen
            nap idővonala, hanem a napszakok tipikus mintája: minden órához
            összefoglaljuk az összes olyan mérést, ami abban az órában készült.
            Így látszik, reggel vagy este szokott-e magasabb lenni a terhelés —
            akár egy nap, akár egy hónap alapján.
          </InfoTip>
        </div>
      </div>
      <div className="chart-shell">
        {chartPoints.length === 0 ? (
          <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              key={`${metric}-${labeled.length}-${mean}-${labeled[0]?.label ?? ""}-${labeled.at(-1)?.label ?? ""}`}
              data={chartPoints}
              margin={{ top: 18, right: 12, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="i"
                type="number"
                domain={[0, xMax]}
                ticks={xTicks}
                tickFormatter={(value) => {
                  if (typeof value !== "number" || !Number.isInteger(value)) {
                    return "";
                  }
                  return labeled[value]?.label ?? "";
                }}
                tick={tickStyle}
                axisLine={{ stroke: colors.line }}
                tickLine={false}
                interval="equidistantPreserveStart"
                minTickGap={40}
                tickMargin={6}
              />
              <YAxis
                ticks={yTicks}
                interval={0}
                tick={(props) => (
                  <ChartYAxisTick
                    {...props}
                    who={who}
                    mean={mean}
                    whoColor={colors.good}
                    meanColor={meanColor}
                    muted={colors.textMuted}
                    fontSize={tickStyle.fontSize}
                    fontFamily={tickStyle.fontFamily}
                  />
                )}
                axisLine={false}
                tickLine={false}
                width={52}
                domain={[0, domainMax]}
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
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as { label?: string } | undefined;
                  return row?.label ?? "";
                }}
              />
              {hasThresholdCompliance ? (
                <Area
                  type="monotone"
                  dataKey="shadedBelow"
                  baseValue={who ?? 0}
                  fill={colors.good}
                  fillOpacity={0.14}
                  stroke="none"
                  connectNulls={false}
                  tooltipType="none"
                  legendType="none"
                  isAnimationActive={animate}
                  animationDuration={CHART_ANIMATION_DURATION_MS}
                  animationEasing="ease-in-out"
                />
              ) : null}
              {hasThresholdExceedance ? (
                <Area
                  type="monotone"
                  dataKey="shadedMean"
                  baseValue={who ?? 0}
                  fill={colors.bad}
                  fillOpacity={0.14}
                  stroke="none"
                  connectNulls={false}
                  tooltipType="none"
                  legendType="none"
                  isAnimationActive={animate}
                  animationDuration={CHART_ANIMATION_DURATION_MS}
                  animationEasing="ease-in-out"
                />
              ) : null}
              {who != null ? (
                <ReferenceLine
                  y={who}
                  stroke={colors.good}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={<WhoGuidelineLabel fill={colors.good} />}
                />
              ) : null}
              <ReferenceLine
                y={mean}
                stroke={meanColor}
                strokeDasharray="2 6"
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="mean"
                name="Óránkénti átlag"
                stroke={colors.chartMean}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION_DURATION_MS}
                animationEasing="ease-in-out"
              />
            </ComposedChart>
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
                <strong>Óránkénti átlag</strong>
                <InfoTip
                  label="Mi az óránkénti átlag görbe?"
                  tipId="hourly-series-mean-tip"
                >
                  A kiválasztott időszak összes napján ugyanarra az órára eső
                  mérések átlaga. Így a napszakok tipikus terhelése látszik, nem
                  egyetlen konkrét nap idővonala.
                </InfoTip>
              </div>
            </li>
            {who != null ? (
              <>
                <li>
                  <span
                    className="series-swatch series-swatch--band"
                    style={{ background: colors.good }}
                    aria-hidden
                  />
                  <div className="label-with-tip">
                    <strong>WHO alatti rész</strong>
                    <InfoTip
                      label="Mit jelöl a zöld satírozás?"
                      tipId="hourly-who-below-shade-tip"
                    >
                      A zöld satírozás csak a WHO {who} µg/m³ irányérték vonala
                      és az átlaggörbe közötti részt jelzi, ahol az óránkénti
                      átlag a javasolt szint alatt van.
                    </InfoTip>
                  </div>
                </li>
                <li>
                  <span
                    className="series-swatch series-swatch--band"
                    style={{ background: colors.bad }}
                    aria-hidden
                  />
                  <div className="label-with-tip">
                    <strong>WHO feletti rész</strong>
                    <InfoTip
                      label="Mit jelöl a vörös satírozás?"
                      tipId="hourly-who-shade-tip"
                    >
                      A vörös satírozás csak a WHO {who} µg/m³ irányérték vonala
                      és az átlaggörbe közötti részt jelzi, ahol az óránkénti
                      átlag a javasolt szint felett van.
                    </InfoTip>
                  </div>
                </li>
              </>
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
                    <InfoTip
                      label="Mi a WHO irányérték?"
                      tipId="hourly-who-threshold-tip"
                    >
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
                style={{ borderTopColor: meanColor }}
                aria-hidden
              />
              <div className="threshold-legend-item">
                <div className="label-with-tip">
                  <strong>Kiválasztott időszak átlaga</strong>
                  <InfoTip
                    label="Mi a kiválasztott időszak átlaga?"
                    tipId="hourly-mean-threshold-tip"
                  >
                    A jelenlegi szűrés összes érvényes {intervalMin} perces
                    mérésének számtani átlaga. Referenciaként szolgál: ehhez
                    viszonyíthatod, az óránkénti profil hol van tipikusan a
                    kiválasztott időszakban. A grafikonon a narancssárga
                    szaggatott vonal jelöli.
                  </InfoTip>
                </div>
                <span
                  className={`threshold-legend-value tone-${pmTone(mean, metric)}`}
                >
                  {mean.toFixed(1)} µg/m³
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
