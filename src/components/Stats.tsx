import type { ReactNode } from "react";
import type { Summary } from "../lib/types";
import { pmTone } from "../lib/aqi";
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
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint: string;
  tone?: string;
  tip?: string;
  tipId?: string;
  tipLabel?: string;
}) {
  return (
    <div className="stat">
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

export function Stats({ data }: Props) {
  const showDaysAboveWho = data.daysTotal > 1;

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
        <Stat
          label="Átlag"
          value={data.mean.toFixed(1)}
          unit="µg/m³"
          hint={`${data.above15pct}% a WHO 15 felett`}
          tone={pmTone(data.mean)}
          tipId="mean-tip"
          tipLabel="Mi az átlag?"
          tip="A kiválasztott időszak összes érvényes 3 perces mérésének számtani közepe. Alatta az látszik, a mérések hány százaléka volt a WHO 15 µg/m³ irányértéke felett."
        />
        <Stat
          label="Medián"
          value={data.p50.toFixed(1)}
          unit="µg/m³"
          hint={`p95: ${data.p95.toFixed(1)} µg/m³`}
          tone={pmTone(data.p50)}
          tipId="median-tip"
          tipLabel="Mi a medián?"
          tip="A középső érték: a mérések fele ez alatt, fele felette van. Kevesebb szélsőség húzza el, mint az átlagot. Alatta a p95 azt jelenti: a mérések 95%-a ez alatt maradt."
        />
        <Stat
          label="Maximum"
          value={String(data.max)}
          unit="µg/m³"
          hint="legnagyobb 3 perces mérés"
          tone={pmTone(data.max)}
          tipId="max-tip"
          tipLabel="Mi a maximum?"
          tip="A kiválasztott időszak legmagasabb 3 perces mérése. Ha a grafikonon nagyobb max ablakot választasz, a piros görbe ettől eltérhet — ott már simított csúcsot látsz."
        />
        <Stat
          label="≥ 80 µg/m³"
          value={`${data.above80pct}%`}
          hint="erősen szennyezett tartomány felett"
          tone="bad"
          tipId="above80-tip"
          tipLabel="Mi a 80 µg/m³ küszöb?"
          tip="Efelett a levegő erősen szennyezettnek számít. A százalék a mérések aránya, amelyek átlépték ezt."
        />
        {showDaysAboveWho ? (
          <Stat
            label="WHO felett"
            value={
              <>
                <span
                  className={
                    data.daysAboveWho === 0 ? "tone-good" : "tone-bad"
                  }
                >
                  {data.daysAboveWho}
                </span>
                <span className="tone-good">/{data.daysTotal}</span>
              </>
            }
            hint="napok a WHO irányérték felett"
            tipId="days-above-who-tip"
            tipLabel="Mik a WHO feletti napok?"
            tip="Hány napnak volt a napi átlaga a WHO 15 µg/m³ irányérték felett, a kiválasztott időszak összes naptári napjához képest."
          />
        ) : null}
      </div>
    </section>
  );
}
