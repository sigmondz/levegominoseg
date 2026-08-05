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
import { buildYAxisTicks, chartYDomainMax, whoReferenceLabel } from "../lib/chartAxis";
import {
  CHART_ANIMATION_DURATION_MS,
  chartSeriesAnimated,
  withWhoThresholdShades,
} from "../lib/simpleChart";
import { toneChartColor } from "../lib/theme";
import type { DailyPoint } from "../lib/types";
import { ChartYAxisTick } from "./ChartYAxisTick";

type Props = {
  daily: DailyPoint[];
  mean: number;
  metric: string;
  unit: string;
};

export function SimpleChart({ daily, mean, metric, unit }: Props) {
  const colors = useChartColors();
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
        <div className="simple-chart-head">
          <div>
            <p className="simple-overview-eyebrow">Egyetlen könnyen olvasható görbe</p>
            <h2 className="section-title" id="simple-chart-title">
              Az átlag alakulása
            </h2>
          </div>
          <p className="simple-chart-desc">
            Naponta egy pont mutatja a mért értékek átlagát.
          </p>
        </div>

        {points.length === 0 ? (
          <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
        ) : (
          <div className="simple-chart-plot">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                key={`${metric}-${points.length}-${periodMean ?? "x"}-${points[0]?.label ?? ""}-${points.at(-1)?.label ?? ""}`}
                data={chartPoints}
                margin={{ top: 18, right: 20, left: 0, bottom: 4 }}
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
                  formatter={(value) => [
                    `${Number(value).toFixed(1)} ${unit}`,
                    "Napi átlag",
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
                    label={whoReferenceLabel(colors.good)}
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
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="simple-chart-key">
          <span className="simple-chart-key-item">
            <span
              className="simple-chart-key-line"
              style={{ background: colors.chartMean }}
              aria-hidden="true"
            />
            Napi átlag
          </span>
          {who != null ? (
            <>
              <span className="simple-chart-key-item">
                <span
                  className="simple-chart-key-band"
                  style={{ background: colors.good }}
                  aria-hidden="true"
                />
                A zöld satírozás a WHO {who} {unit} vonala és az átlaggörbe
                közötti, küszöb alatti részt jelzi.
              </span>
              <span className="simple-chart-key-item">
                <span
                  className="simple-chart-key-band"
                  style={{ background: colors.bad }}
                  aria-hidden="true"
                />
                A vörös satírozás a WHO {who} {unit} vonala és az átlaggörbe
                közötti, küszöb feletti részt jelzi.
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
