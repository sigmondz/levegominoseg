import { METRIC_OPTIONS } from "../lib/aqi";
import type { MetricId, SiteInfo } from "../lib/types";
import { InfoTip } from "./InfoTip";

type Props = {
  sites: SiteInfo[];
  siteId: string;
  onSiteChange: (siteId: string) => void;
  metric: MetricId;
  availableMetrics: MetricId[];
  onMetricChange: (metric: MetricId) => void;
};

export function MetricFilter({
  sites,
  siteId,
  onSiteChange,
  metric,
  availableMetrics,
  onMetricChange,
}: Props) {
  const visibleMetrics = METRIC_OPTIONS.filter((item) =>
    availableMetrics.includes(item.id),
  );

  return (
    <section
      className="section period period--compact"
      id="adatsor"
      aria-labelledby="metric-title"
    >
      <div className="label-with-tip">
        <h2 className="section-title" id="metric-title">
          Adatsor
        </h2>
        <InfoTip label="Mit jelent a PM?" tipId="metric-pm-tip">
          A PM (Particulate Matter) a levegőben szálló szilárd részecskéket
          jelenti. A szám a részecske átmérőjét mutatja mikrométerben: PM1 ≤ 1
          µm, PM2.5 ≤ 2,5 µm, PM10 ≤ 10 µm. Minél kisebb a részecske, annál
          mélyebbre jut a légutakba.
        </InfoTip>
      </div>
      <label className="site-select-label">
        <span className="site-select-caption">Helyszín</span>
        <select
          className="site-select"
          value={siteId}
          aria-label="Helyszín"
          onChange={(event) => onSiteChange(event.target.value)}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.label}
            </option>
          ))}
        </select>
      </label>
      <div className="period-chips" role="group" aria-label="Mutató">
        {visibleMetrics.map((item) => (
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
