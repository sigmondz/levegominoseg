import type { Summary } from "../lib/types";
import { pmLabel, pmTone, who24h, type PmTone } from "../lib/aqi";

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

  return (
    <section
      className={`simple-overview ${statusClass}`}
      aria-labelledby="simple-overview-title"
    >
      <div className="simple-overview-card">
        <p className="simple-overview-eyebrow">
          A kiválasztott időszak összképe
        </p>
        <div className="simple-overview-status" role="status" aria-live="polite">
          <span className="simple-overview-status-mark" aria-hidden="true" />
          <h2 id="simple-overview-title">{status}</h2>
        </div>
        <p className="simple-overview-copy">
          {hasData && who != null ? (
            <>
              A {data.metric} időszakos átlaga {pmLabel(data.mean, data.metric)} a{" "}
              <strong className="who-reference">
                WHO {who} {data.unit} irányértékéhez
              </strong>{" "}
              képest.
            </>
          ) : (
            copy
          )}
        </p>
        {hasData ? (
          <div className="simple-overview-mean">
            <span>Időszakos átlag</span>
            <strong className={`tone-${tone}`}>
              {data.mean.toFixed(1)} <small>{data.unit}</small>
            </strong>
          </div>
        ) : null}
        <div className="simple-overview-period">
          <span>Időszak</span>
          <strong>{formatPeriod(data)}</strong>
        </div>
      </div>
    </section>
  );
}
