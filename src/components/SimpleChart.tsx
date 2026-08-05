import { useState } from "react";
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
import type { DailyPoint, SeriesEntry } from "../lib/types";
import { ChartExportActions } from "./ChartExportActions";
import { ChartYAxisTick } from "./ChartYAxisTick";
import { InfoTip } from "./InfoTip";
import { WhoGuidelineLabel } from "./WhoGuidelineLabel";

type Props = {
  daily: DailyPoint[];
  mean: number;
  metric: string;
  unit: string;
  exportPoints: SeriesEntry[];
  exportFromMs: number;
  exportToMs: number;
};

export function SimpleChart({
  daily,
  mean,
  metric,
  unit,
  exportPoints,
  exportFromMs,
  exportToMs,
}: Props) {
  const colors = useChartColors();
  const [maxVisible, setMaxVisible] = useState(false);
  const who = who24h(metric);
  const points = daily.filter((point) => point.n > 0);
  const chartPoints = withWhoThresholdShades(points, who);
  const periodMean = points.length > 0 ? mean : null;
  const meanColor =
    periodMean != null
      ? toneChartColor(pmTone(periodMean, metric), colors)
      : colors.poor;
  const domainMax = chartYDomainMax(
    who ?? 0,
    periodMean ?? 0,
    ...points.map((point) => point.mean),
    ...(maxVisible ? points.map((point) => point.max) : []),
  );
  const yTicks = buildYAxisTicks(domainMax, [who, periodMean]);
  const hasThresholdExceedance =
    who != null && points.some((point) => point.mean > who);
  const hasThresholdCompliance =
    who != null && points.some((point) => point.mean < who);
  const xMax = Math.max(points.length - 1, 0);
  const xTicks = points.map((_, index) => index);
  const animate = chartSeriesAnimated(points.length, 180);

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
    <section
      className="section simple-chart-section"
      aria-labelledby="simple-chart-title"
    >
      <div className="simple-chart-card">
        <ChartExportActions
          exportPoints={exportPoints}
          exportFromMs={exportFromMs}
          exportToMs={exportToMs}
          mean={mean}
          canShowMax
          maxVisible={maxVisible}
          onMaxVisibleChange={setMaxVisible}
          ariaControls="egyszeru-grafikon"
          csvTipId="simple-csv-export-tip"
        />
        <div className="simple-chart-head">
          <p className="simple-overview-eyebrow">Egyetlen könnyen olvasható görbe</p>
          <div className="label-with-tip">
            <h2 className="section-title" id="simple-chart-title">
              Az átlag alakulása
            </h2>
            <InfoTip
              label="Miről szól ez a grafikon?"
              tipId="simple-chart-tip"
            >
              Naponta egy pont mutatja a mért értékek átlagát.
            </InfoTip>
          </div>
        </div>

        <div className="simple-chart-plot" id="egyszeru-grafikon">
          {points.length === 0 ? (
            <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart
                key={`${metric}-${points.length}-${periodMean ?? "x"}-${maxVisible ? "max" : "mean"}-${points[0]?.label ?? ""}-${points.at(-1)?.label ?? ""}`}
                data={chartPoints}
                margin={{ top: 18, right: 20, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  stroke={colors.grid}
                  vertical={false}
                  syncWithTicks
                  horizontalValues={yTicks}
                />
                <XAxis
                  dataKey="i"
                  type="number"
                  domain={[0, xMax]}
                  ticks={xTicks}
                  tickFormatter={(value) => {
                    if (typeof value !== "number" || !Number.isInteger(value)) {
                      return "";
                    }
                    return points[value]?.label ?? "";
                  }}
                  tick={tickStyle}
                  axisLine={{ stroke: colors.line }}
                  tickLine={false}
                  interval="equidistantPreserveStart"
                  minTickGap={36}
                  tickMargin={6}
                />
                <YAxis
                  domain={[0, domainMax]}
                  ticks={yTicks}
                  interval={0}
                  tick={(props) => (
                    <ChartYAxisTick
                      {...props}
                      who={who}
                      mean={periodMean}
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
                  label={{
                    value: unit,
                    angle: -90,
                    position: "insideLeft",
                    fill: colors.textMuted,
                    fontSize: 13,
                  }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)} ${unit}`,
                    name,
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
                {periodMean != null ? (
                  <ReferenceLine
                    y={periodMean}
                    stroke={meanColor}
                    strokeDasharray="2 6"
                    strokeWidth={1.5}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="mean"
                  name="Napi átlag"
                  stroke={colors.chartMean}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={animate}
                  animationDuration={CHART_ANIMATION_DURATION_MS}
                  animationEasing="ease-in-out"
                />
                {maxVisible ? (
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
                    animationDuration={CHART_ANIMATION_DURATION_MS}
                    animationEasing="ease-in-out"
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          className="simple-chart-key"
          aria-label="Görbék jelmagyarázata"
        >
          <span className="simple-chart-key-item">
            <span
              className="simple-chart-key-line"
              style={{ background: colors.chartMean }}
              aria-hidden="true"
            />
            <span className="label-with-tip">
              <strong>Napi átlag</strong>
              <InfoTip
                label="Mi a napi átlag görbe?"
                tipId="simple-series-mean-tip"
              >
                Az adott nap összes érvényes 3 perces mintájának számtani
                átlaga. A napi tipikus terhelést mutatja: a rövid kiugrások
                kevésbé húzzák el, mint a nyers méréseken. Így napokat
                hasonlíthatsz össze, és látod, általában milyen volt a
                levegőminőség. A grafikonon a kék görbe.
              </InfoTip>
            </span>
          </span>
          <span
            className={`simple-chart-key-item${maxVisible ? "" : " is-muted"}`}
          >
            <span
              className="simple-chart-key-line"
              style={{ background: colors.bad }}
              aria-hidden="true"
            />
            <span className="label-with-tip">
              <strong>Max görbe</strong>
              <InfoTip label="Mi a max görbe?" tipId="simple-series-max-tip">
                Az adott nap csúcsterhelése: a max ablak a kiválasztott időszak
                hosszához igazodik, és simítja a rövid kiugrásokat. A grafikonon
                a piros görbe — a fenti gombbal kapcsolható.
              </InfoTip>
            </span>
          </span>
          {who != null ? (
            <>
              <span className="simple-chart-key-item">
                <span
                  className="simple-chart-key-band"
                  style={{ background: colors.good }}
                  aria-hidden="true"
                />
                <span className="label-with-tip">
                  <strong>WHO irányérték alatti rész</strong>
                  <InfoTip
                    label="Mit jelöl a zöld satírozás?"
                    tipId="simple-who-below-shade-tip"
                  >
                    A zöld satírozás csak a WHO {who} {unit} irányérték vonala és
                    az átlaggörbe közötti részt jelzi, ahol az átlag a javasolt
                    szint alatt van.
                  </InfoTip>
                </span>
              </span>
              <span className="simple-chart-key-item">
                <span
                  className="simple-chart-key-band"
                  style={{ background: colors.bad }}
                  aria-hidden="true"
                />
                <span className="label-with-tip">
                  <strong>WHO irányérték feletti rész</strong>
                  <InfoTip
                    label="Mit jelöl a vörös satírozás?"
                    tipId="simple-who-shade-tip"
                  >
                    A vörös satírozás csak a WHO {who} {unit} irányérték vonala és
                    az átlaggörbe közötti részt jelzi, ahol az átlag a javasolt
                    szint felett van.
                  </InfoTip>
                </span>
              </span>
            </>
          ) : (
            <span className="simple-chart-key-note">
              Ehhez a mérőszámhoz nincs hivatalos WHO-irányérték, ezért nincs
              küszöb-satírozás.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
