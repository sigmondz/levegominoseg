import { GRAFANA_THRESHOLD, pmTone, who24h } from "../lib/aqi";
import { InfoTip } from "./InfoTip";
import type { GrainCopy } from "./dailyChartCopy";

type Colors = {
  chartMean: string;
  bad: string;
  good: string;
};

type Props = {
  copy: GrainCopy;
  colors: Colors;
  canShowMax: boolean;
  maxVisible: boolean;
  mean: number;
  metric: string;
  meanColor: string;
  intervalMin: number;
};

export function DailyChartLegend({
  copy,
  colors,
  canShowMax,
  maxVisible,
  mean,
  metric,
  meanColor,
  intervalMin,
}: Props) {
  const who = who24h(metric);

  return (
    <>
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
          {canShowMax && copy.maxDesc ? (
            <li className={maxVisible ? undefined : "is-muted"}>
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
          {who != null ? (
            <>
              <li>
                <span
                  className="series-swatch series-swatch--band"
                  style={{ background: colors.good }}
                  aria-hidden
                />
                <div className="label-with-tip">
                  <strong>WHO irányérték alatti rész</strong>
                  <InfoTip
                    label="Mit jelöl a zöld satírozás?"
                    tipId="who-below-shade-tip"
                  >
                    A zöld satírozás csak a WHO {who} µg/m³ irányérték vonala és
                    az átlaggörbe közötti részt jelzi, ahol az átlag a javasolt
                    szint alatt van.
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
                  <strong>WHO irányérték feletti rész</strong>
                  <InfoTip
                    label="Mit jelöl a vörös satírozás?"
                    tipId="who-shade-tip"
                  >
                    A vörös satírozás csak a WHO {who} µg/m³ irányérték vonala és
                    az átlaggörbe közötti részt jelzi, ahol az átlag a javasolt
                    szint felett van.
                  </InfoTip>
                </div>
              </li>
            </>
          ) : null}
        </ul>
      </div>

      <div
        className="threshold-legend"
        aria-label="Határértékek jelmagyarázata"
      >
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
              style={{ borderTopColor: meanColor }}
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
                  időszakban. A grafikonon a narancssárga szaggatott vonal
                  jelöli.
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
                  Efelett a levegő erősen szennyezettnek számít ezen az oldalon.
                  Nem hivatalos határ, hanem helyi riasztási szint
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
    </>
  );
}
