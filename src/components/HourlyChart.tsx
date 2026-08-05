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
import { GRAFANA_THRESHOLD, pmTone, who24h } from "../lib/aqi";
import { belowThresholdFillValue, thresholdFillValue } from "../lib/simpleChart";
import type { HourlyPoint } from "../lib/types";
import { InfoTip } from "./InfoTip";

type Props = {
  hourly: HourlyPoint[];
  mean: number;
  metric: string;
  intervalMin: number;
};

type ChartPoint = HourlyPoint & {
  label: string;
  shadedMean: number;
  shadedBelow: number;
};

export function HourlyChart({ hourly, mean, metric, intervalMin }: Props) {
  const colors = useChartColors();
  const who = who24h(metric);
  const chartPoints: ChartPoint[] = hourly.map((point) => ({
    ...point,
    label: `${String(point.hour).padStart(2, "0")}:00`,
    shadedMean: thresholdFillValue(point.mean, who),
    shadedBelow: belowThresholdFillValue(point.mean, who),
  }));
  const hasThresholdExceedance =
    who != null && chartPoints.some((point) => point.mean > who);
  const hasThresholdCompliance =
    who != null && chartPoints.some((point) => point.mean < who);
  const domainMax = Math.max(
    GRAFANA_THRESHOLD,
    who ?? 0,
    mean,
    ...chartPoints.map((point) => point.mean),
    1,
  );

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
              data={chartPoints}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            >
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
                domain={[0, Math.ceil(domainMax * 1.05)]}
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
                />
              ) : null}
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
                name="Óránkénti átlag"
                stroke={colors.chartMean}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 3 }}
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
                style={{ borderTopColor: colors.poor }}
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
                    tipId="hourly-alert-threshold-tip"
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
