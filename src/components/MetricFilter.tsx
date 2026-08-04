import { METRIC_OPTIONS } from "../lib/aqi";
import type { MetricId } from "../lib/types";
import { InfoTip } from "./InfoTip";

type Props = {
  metric: MetricId;
  onMetricChange: (metric: MetricId) => void;
};

export function MetricFilter({ metric, onMetricChange }: Props) {
  return (
    <section
      className="section period period--compact"
      id="adatsor"
      aria-labelledby="metric-title"
    >
      <h2 className="section-title" id="metric-title">
        Adatsor
      </h2>
      <div className="period-chips--with-tip">
        <div className="period-chips" role="group" aria-label="Adatsor">
          {METRIC_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`period-chip${metric === item.id ? " is-active" : ""}`}
              aria-pressed={metric === item.id}
              onClick={() => onMetricChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <InfoTip label="Mit jelent a PM?" tipId="metric-pm-tip">
          A PM (Particulate Matter) a levegőben szálló szilárd részecskéket
          jelenti. A szám a részecske átmérőjét mutatja mikrométerben: PM1 ≤ 1
          µm, PM2.5 ≤ 2,5 µm, PM10 ≤ 10 µm. Minél kisebb a részecske, annál
          mélyebbre jut a légutakba.
        </InfoTip>
      </div>
    </section>
  );
}
