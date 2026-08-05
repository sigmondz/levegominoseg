import type { Summary } from "../lib/types";
import {
  daysAboveWhoTone,
  pmLabel,
  pmTone,
  who24h,
  type PmTone,
} from "../lib/aqi";

type Props = {
  data: Summary;
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string): string {
  const [date] = value.split(" ");
  const parts = date?.split("-") ?? [];
  if (parts.length !== 3) return value;

  return `${parts[0]}. ${Number(parts[1])}. ${Number(parts[2])}.`;
}

function formatPeriod(data: Summary): string {
  const from = formatDate(data.from);
  const to = formatDate(data.to);
  return from === to ? from : `${from} – ${to}`;
}

function explanation(tone: PmTone): string {
  switch (tone) {
    case "good":
      return "A kiválasztott időszakban a levegő minősége kedvező volt.";
    case "moderate":
      return "A kiválasztott időszakban a levegő minősége elfogadható volt, de a terhelés már magasabb a kedvező szintnél.";
    case "poor":
      return "A kiválasztott időszakban a levegőterhelés magas volt.";
    case "bad":
      return "A kiválasztott időszakban a levegőterhelés nagyon magas volt.";
  }
}

export function SimpleOverview({ data }: Props) {
  const hasData = data.valid > 0;
  const tone = hasData ? pmTone(data.mean, data.metric) : null;
  const status = hasData ? capitalize(pmLabel(data.mean, data.metric)) : "Nincs mérési adat";
  const statusClass = tone
    ? `simple-overview--${tone}`
    : "simple-overview--empty";
  const copy = tone
    ? explanation(tone)
    : "Ebben az időszakban nem áll rendelkezésre értékelhető mérés.";
  const who = who24h(data.metric);
  const showDaysAboveWho = hasData && who != null && data.daysTotal > 1;
  const daysTone = showDaysAboveWho
    ? daysAboveWhoTone(data.daysAboveWho, data.daysTotal)
    : null;
  const maxTone = hasData ? pmTone(data.max, data.metric) : null;
  const metricsClass = showDaysAboveWho
    ? "simple-overview-metrics simple-overview-metrics--triple"
    : "simple-overview-metrics simple-overview-metrics--pair";

  return (
    <section
      className={`simple-overview ${statusClass}`}
      aria-labelledby="simple-overview-title"
    >
      <div className="simple-overview-card">
        <div className="simple-overview-top">
          <div className="simple-overview-lead">
            <p className="simple-overview-eyebrow">
              A kiválasztott időszak összképe
            </p>
            <div
              className="simple-overview-status"
              role="status"
              aria-live="polite"
            >
              <span className="simple-overview-status-mark" aria-hidden="true" />
              <h2 id="simple-overview-title">{status}</h2>
            </div>
            <p className="simple-overview-copy">
              {hasData && who != null ? (
                <>
                  A {data.metric} időszakos átlaga{" "}
                  {pmLabel(data.mean, data.metric)} a{" "}
                  <strong className="who-reference">
                    WHO {who} {data.unit} irányértékéhez
                  </strong>{" "}
                  képest.
                </>
              ) : (
                copy
              )}
            </p>
          </div>
          <div className="simple-overview-period">
            <span>Időszak</span>
            <strong>{formatPeriod(data)}</strong>
          </div>
        </div>
        {hasData ? (
          <div className={metricsClass}>
            {showDaysAboveWho ? (
              <div className="simple-overview-metric simple-overview-metric--start">
                <span>WHO érték felett</span>
                <strong className={`tone-${daysTone}`}>
                  {data.daysAboveWho}
                  <span className="simple-overview-metric-total">
                    /{data.daysTotal}
                  </span>{" "}
                  <small>nap</small>
                </strong>
              </div>
            ) : null}
            <div className="simple-overview-metric simple-overview-metric--center">
              <span>Időszakos átlag</span>
              <strong className={`tone-${tone}`}>
                {data.mean.toFixed(1)} <small>{data.unit}</small>
              </strong>
            </div>
            <div className="simple-overview-metric simple-overview-metric--end">
              <span>Maximum</span>
              <strong className={`tone-${maxTone}`}>
                {data.max} <small>{data.unit}</small>
              </strong>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
