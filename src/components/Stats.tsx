import type { Summary } from "../lib/types";
import { pmTone } from "../lib/aqi";

type Props = {
  data: Summary;
};

function Stat({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ? `tone-${tone}` : ""}`}>
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}

export function Stats({ data }: Props) {
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
      <div className="stats">
        <Stat
          label="Átlag"
          value={data.mean.toFixed(1)}
          unit="µg/m³"
          hint={`${data.above15pct}% a WHO 15 felett`}
          tone={pmTone(data.mean)}
        />
        <Stat
          label="Medián"
          value={data.p50.toFixed(1)}
          unit="µg/m³"
          hint={`p95: ${data.p95.toFixed(1)} µg/m³`}
          tone={pmTone(data.p50)}
        />
        <Stat
          label="Maximum"
          value={String(data.max)}
          unit="µg/m³"
          hint="legnagyobb 3 perces mérés"
          tone={pmTone(data.max)}
        />
        <Stat
          label="≥ 80 µg/m³"
          value={`${data.above80pct}%`}
          hint="Grafana piros küszöb felett"
          tone="bad"
        />
      </div>
    </section>
  );
}
