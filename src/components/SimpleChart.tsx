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
import { who24h } from "../lib/aqi";
import {
  belowThresholdFillValue,
  thresholdFillValue,
} from "../lib/simpleChart";
import type { DailyPoint } from "../lib/types";

type Props = {
  daily: DailyPoint[];
  metric: string;
  unit: string;
};

type ChartPoint = DailyPoint & {
  shadedMean: number;
  shadedBelow: number;
};

export function SimpleChart({ daily, metric, unit }: Props) {
  const colors = useChartColors();
  const who = who24h(metric);
  const points = daily.filter((point) => point.n > 0);
  const chartPoints: ChartPoint[] = points.map((point) => ({
    ...point,
    shadedMean: thresholdFillValue(point.mean, who),
    shadedBelow: belowThresholdFillValue(point.mean, who),
  }));
  const maxMean = Math.max(
    1,
    who ?? 0,
    ...points.map((point) => point.mean),
  );
  const domainMax = Math.ceil(maxMean * 1.15);
  const hasThresholdExceedance =
    who != null && points.some((point) => point.mean > who);
  const hasThresholdCompliance =
    who != null && points.some((point) => point.mean < who);

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
                data={chartPoints}
                margin={{ top: 18, right: 20, left: 0, bottom: 4 }}
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
                  domain={[0, domainMax]}
                  tick={tickStyle}
                  axisLine={false}
                  tickLine={false}
                  width={46}
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
                  labelFormatter={(label) => String(label)}
                />
                {hasThresholdCompliance ? (
                  <Area
                    type="monotone"
                    dataKey="shadedBelow"
                    baseValue={who ?? 0}
                    fill={colors.good}
                    fillOpacity={0.14}
                    stroke="none"
                    tooltipType="none"
                    legendType="none"
                    isAnimationActive={points.length <= 180}
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
                    tooltipType="none"
                    legendType="none"
                    isAnimationActive={points.length <= 180}
                  />
                ) : null}
                {who != null ? (
                  <ReferenceLine
                    y={who}
                    stroke={colors.good}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "javasolt szint",
                      position: "insideTopRight",
                      fill: colors.good,
                      fontFamily: "IBM Plex Mono",
                      fontSize: 12,
                    }}
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
                  isAnimationActive={points.length <= 180}
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
