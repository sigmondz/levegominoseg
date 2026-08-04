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
          <p className="section-kicker">Napi ritmus</p>
          <InfoTip label="Mi a napi ritmus?" tipId="hourly-tip">
            Nem egyetlen nap idővonala, hanem a napszakok tipikus mintája. Minden
            órához (0–23) összefoglaljuk a kiválasztott időszak összes olyan
            mérését, ami abban az órában készült, és ezek átlagát rajzoljuk.
            Így látszik például, reggel vagy este szokott-e magasabb lenni a
            PM2.5 — akár egy hét, akár egy hónap alapján.
          </InfoTip>
        </div>
        <h2 className="section-title" id="hourly-title">
          Óránkénti profil
        </h2>
        <p className="section-desc">
          A kiválasztott időszak napjainak óránkénti átlaga (0–23). Rövid
          tartománynál is ugyanígy a napi ritmust mutatja.
        </p>
      </div>
      <div className="chart-shell">
        {data.length === 0 ? (
          <p className="chart-empty">Nincs adat a kiválasztott időszakban.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
                interval={2}
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
