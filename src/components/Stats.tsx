import type { ReactNode } from "react";
import type { Summary } from "../lib/types";
import { above80Tone, daysAboveWhoTone, pmTone, who24h } from "../lib/aqi";
import { InfoTip } from "./InfoTip";

type Props = {
  data: Summary;
};

function Stat({
  label,
  value,
  unit,
  hint,
  tone,
  tip,
  tipId,
  tipLabel,
  featured = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint: string;
  tone?: string;
  tip?: string;
  tipId?: string;
  tipLabel?: string;
  featured?: boolean;
}) {
  return (
    <div className={`stat${featured ? " stat--featured" : ""}`}>
      <div className="stat-label">
        {tip && tipId && tipLabel ? (
          <span className="label-with-tip">
            <span>{label}</span>
            <InfoTip label={tipLabel} tipId={tipId} inCard>
              {tip}
            </InfoTip>
          </span>
        ) : (
          label
        )}
      </div>
      <div className={`stat-value ${tone ? `tone-${tone}` : ""}`}>
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}

function valueVsWho(
  amount: number,
  tone: string,
  who: number | null,
): { value: ReactNode; unit?: string; tone?: string } {
  if (who == null) {
    return { value: amount.toFixed(1), unit: "µg/m³", tone };
  }
  const relation = amount < who ? "<" : amount > who ? ">" : "=";
  return {
    value: (
      <>
        <span className={`tone-${tone}`}>
          {amount.toFixed(1)}
          <small>µg/m³</small>
        </span>
        <span className="stat-value-cmp">
          {" "}
          <span className={`tone-${tone}`}>{relation} </span>
          <span className="stat-who-threshold">
            {who}
            <small> µg/m³</small>
          </span>
        </span>
      </>
    ),
  };
}

export function Stats({ data }: Props) {
  const who = who24h(data.metric);
  const showDaysAboveWho = who != null && data.daysTotal > 1;
  const meanTone = pmTone(data.mean, data.metric);
  const medianTone = pmTone(data.p50, data.metric);
  const meanDisplay = valueVsWho(data.mean, meanTone, who);
  const medianDisplay = valueVsWho(data.p50, medianTone, who);
  const daysTone = daysAboveWhoTone(data.daysAboveWho, data.daysTotal);
  const above80 = above80Tone(data.above80pct);

  return (
    <section className="section" id="osszefoglalo" aria-labelledby="stats-title">
      <div className="section-head">
        <p className="section-kicker">Összefoglaló</p>
        <h2 className="section-title" id="stats-title">
          A kiválasztott időszak számokban
        </h2>
        <p className="section-desc">
          {data.valid.toLocaleString("hu-HU")} érvényes 3 perces mérés
          {data.empty > 0 ? `, kb. ${data.empty} hiányzó pont` : ""}. Időablak:{" "}
          {data.from.slice(0, 16)} → {data.to.slice(0, 16)}.
        </p>
      </div>
      <div className={`stats${showDaysAboveWho ? " stats--with-days" : ""}`}>
        {showDaysAboveWho ? (
          <Stat
            featured
            label="WHO érték felett"
            value={
              <>
                {data.daysAboveWho}
                <span className="stat-value-total">/{data.daysTotal}</span>
              </>
            }
            hint="napok a WHO irányérték felett"
            unit="nap"
            tone={daysTone}
            tipId="days-above-who-tip"
            tipLabel="Mik a WHO feletti napok?"
            tip={`Hány napnak volt a napi átlaga a WHO ${who} µg/m³ irányérték felett, a kiválasztott időszak összes naptári napjához képest.`}
          />
        ) : null}
        <Stat
          label="Maximum"
          value={String(data.max)}
          unit="µg/m³"
          hint="legnagyobb 3 perces mérés"
          tone={pmTone(data.max, data.metric)}
          tipId="max-tip"
          tipLabel="Mi a maximum?"
          tip="A kiválasztott időszak legmagasabb 3 perces mérése. Ha a grafikonon nagyobb max ablakot választasz, a piros görbe ettől eltérhet — ott már simított csúcsot látsz."
        />
        <Stat
          label="≥ 80 µg/m³"
          value={`${data.above80pct}`}
          unit="%"
          hint="erősen szennyezett tartomány felett"
          tone={above80}
          tipId="above80-tip"
          tipLabel="Mi a 80 µg/m³ küszöb?"
          tip="Efelett a levegő erősen szennyezettnek számít. A százalék a mérések aránya, amelyek átlépték ezt."
        />
        <Stat
          label="Átlag"
          value={meanDisplay.value}
          unit={meanDisplay.unit}
          hint={
            who != null
              ? `${data.aboveWhoPct}% a WHO ${who} felett`
              : "nincs hivatalos WHO irányérték"
          }
          tone={meanDisplay.tone}
          tipId="mean-tip"
          tipLabel="Mi az átlag?"
          tip={
            who != null
              ? `A kiválasztott időszak összes érvényes 3 perces mérésének számtani közepe, a WHO ${who} µg/m³ irányértékhez viszonyítva. Alatta az látszik, a mérések hány százaléka volt az irányérték felett.`
              : "A kiválasztott időszak összes érvényes 3 perces mérésének számtani közepe. A PM1-re nincs hivatalos WHO 24 órás irányérték."
          }
        />
        <Stat
          label="Medián"
          value={medianDisplay.value}
          unit={medianDisplay.unit}
          hint={`p95: ${data.p95.toFixed(1)} µg/m³`}
          tone={medianDisplay.tone}
          tipId="median-tip"
          tipLabel="Mi a medián?"
          tip={
            who != null
              ? `A középső érték a WHO ${who} µg/m³ irányértékhez viszonyítva: a mérések fele ez alatt, fele felette van. Kevesebb szélsőség húzza el, mint az átlagot. Alatta a p95 azt jelenti: a mérések 95%-a ez alatt maradt.`
              : "A középső érték: a mérések fele ez alatt, fele felette van. Kevesebb szélsőség húzza el, mint az átlagot. Alatta a p95 azt jelenti: a mérések 95%-a ez alatt maradt."
          }
        />
      </div>
    </section>
  );
}
