import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartColors } from "../hooks/useChartColors";
import type { HourlyPoint } from "../lib/types";
import { InfoTip } from "./InfoTip";

type Props = {
  hourly: HourlyPoint[];
};

export function HourlyChart({ hourly }: Props) {
  const colors = useChartColors();
  const data = hourly.map((h) => ({
    ...h,
    label: `${String(h.hour).padStart(2, "0")}:00`,
  }));

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
        {data.length === 0 ? (
          <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.good} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.good} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={tickStyle}
                axisLine={{ stroke: colors.line }}
                tickLine={false}
                interval="equidistantPreserveStart"
                minTickGap={40}
                tickMargin={6}
              />
              <YAxis
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                width={42}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  `${Number(value).toFixed(1)} µg/m³`,
                  "Átlag",
                ]}
              />
              <Area
                type="monotone"
                dataKey="mean"
                stroke={colors.good}
                strokeWidth={2}
                fill="url(#hourlyFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
