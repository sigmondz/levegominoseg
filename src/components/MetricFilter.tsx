import { METRIC_OPTIONS } from "../lib/aqi";
import type { MetricId } from "../lib/types";

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
    </section>
  );
}
