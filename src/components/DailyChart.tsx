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
import type { MaxWindow, SeriesEntry, TrendGrain, TrendPoint } from "../lib/types";
import { GRAFANA_THRESHOLD, pmTone, who24h } from "../lib/aqi";
import { buildYAxisTicks, chartYDomainMax } from "../lib/chartAxis";
import {
  CHART_ANIMATION_DURATION_MS,
  chartSeriesAnimated,
  withWhoThresholdShades,
} from "../lib/simpleChart";
import { toneChartColor } from "../lib/theme";
import { ChartExportActions } from "./ChartExportActions";
import { ChartYAxisTick } from "./ChartYAxisTick";
import { DailyChartControls } from "./DailyChartControls";
import { DailyChartLegend } from "./DailyChartLegend";
import { WhoGuidelineLabel } from "./WhoGuidelineLabel";
import { grainCopy } from "./dailyChartCopy";

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

export function DailyChart({
  trend,
  mean,
  metric,
  grain,
  availableGrains,
  maxWindow,
  availableMaxWindows,
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
  const canShowMax = grain !== "raw";
  const [maxVisible, setMaxVisible] = useState(true);
  const showMax = canShowMax && maxVisible;
  const animate = chartSeriesAnimated(trend.length);
  const chartPoints = withWhoThresholdShades(trend, who);
  const hasThresholdExceedance =
    who != null && trend.some((point) => point.mean > who);
  const hasThresholdCompliance =
    who != null && trend.some((point) => point.mean < who);
  const xMax = Math.max(trend.length - 1, 0);
  const xTicks = trend.map((_, index) => index);
  const domainMax = chartYDomainMax(
    GRAFANA_THRESHOLD,
    who ?? 0,
    mean,
    ...trend.map((point) => point.mean),
    ...(showMax ? trend.map((point) => point.max) : []),
  );
  const yTicks = buildYAxisTicks(domainMax, [who, mean]);
  const meanColor = toneChartColor(pmTone(mean, metric), colors);

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
    <section className="section" id="napi" aria-labelledby="daily-title">
      <DailyChartControls
        copy={copy}
        grain={grain}
        availableGrains={availableGrains}
        maxWindow={maxWindow}
        availableMaxWindows={availableMaxWindows}
        intervalMin={intervalMin}
        canShowMax={canShowMax}
        onGrainChange={onGrainChange}
        onMaxWindowChange={onMaxWindowChange}
      />
      <div className="chart-shell">
        <ChartExportActions
          exportPoints={exportPoints}
          exportFromMs={exportFromMs}
          exportToMs={exportToMs}
          mean={mean}
          canShowMax={canShowMax}
          maxVisible={maxVisible}
          onMaxVisibleChange={setMaxVisible}
          ariaControls="napi"
        />
        {trend.length === 0 ? (
          <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              key={`${metric}-${trend.length}-${mean}-${grain}-${showMax ? "max" : "mean"}-${trend[0]?.label ?? ""}-${trend.at(-1)?.label ?? ""}`}
              data={chartPoints}
              margin={{ top: 18, right: 12, left: 0, bottom: 4 }}
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
                  return trend[value]?.label ?? "";
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
                  const row = payload?.[0]?.payload as
                    | { label?: string }
                    | undefined;
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
                animationDuration={CHART_ANIMATION_DURATION_MS}
                animationEasing="ease-in-out"
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
                  animationDuration={CHART_ANIMATION_DURATION_MS}
                  animationEasing="ease-in-out"
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <DailyChartLegend
          copy={copy}
          colors={colors}
          canShowMax={canShowMax}
          maxVisible={maxVisible}
          mean={mean}
          metric={metric}
          meanColor={meanColor}
          intervalMin={intervalMin}
        />
      </div>
    </section>
  );
}
