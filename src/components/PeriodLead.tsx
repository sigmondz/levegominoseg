import { pmLabel, pmTone, who24h } from "../lib/aqi";
import type { Summary } from "../lib/types";

type Props = {
  data: Summary;
};

export function PeriodLead({ data }: Props) {
  const tone = pmTone(data.mean, data.metric);
  const who = who24h(data.metric);

  return (
    <p className="period-lead">
      A {data.metric} adatok helyi szenzorból származnak. Az időszak átlaga{" "}
      <strong className={`tone-${tone}`}>
        {data.mean.toFixed(1)} <small>{data.unit}</small>
      </strong>
      {who != null ? (
        <>
          {" "}
          — ez {pmLabel(data.mean, data.metric)} a{" "}
          <strong className="who-reference">
            WHO irányértékhez ({who} <small>{data.unit}</small>)
          </strong>{" "}
          képest.
        </>
      ) : (
        <> — a {data.metric}-re nincs hivatalos WHO irányérték.</>
      )}
    </p>
  );
}
