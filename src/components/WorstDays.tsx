import { useMemo, useState } from "react";
import type { DailyPoint } from "../lib/types";
import { pmTone } from "../lib/aqi";
import { rankWorstDays, type WorstRankBy } from "../lib/worstDays";
import { InfoTip } from "./InfoTip";

type Props = {
  daily: DailyPoint[];
  visible: boolean;
  onSelectDay: (date: string) => void;
};

const RANK_OPTIONS: { id: WorstRankBy; label: string }[] = [
  { id: "max", label: "Max" },
  { id: "mean", label: "Átlag" },
];

const LIMIT_OPTIONS = [3, 5, 10] as const;

export function WorstDays({ daily, visible, onSelectDay }: Props) {
  const [rankBy, setRankBy] = useState<WorstRankBy>("max");
  const [limit, setLimit] = useState<(typeof LIMIT_OPTIONS)[number]>(3);
  const ranked = useMemo(
    () => rankWorstDays(daily, rankBy, limit),
    [daily, rankBy, limit],
  );

  if (!visible || ranked.length === 0) return null;

  return (
    <section
      className="section worst-days"
      aria-labelledby="worst-days-title"
    >
      <div className="section-head">
        <div className="label-with-tip">
          <p className="section-kicker" id="worst-days-title">
            Legrosszabb napok
          </p>
          <InfoTip label="Mik a legrosszabb napok?" tipId="worst-days-tip">
            A listán a kiválasztott időszak legmagasabb napi max vagy átlag
            értékei látszanak. Egy napra kattintva csak azt a napot nézed a
            grafikonon.
          </InfoTip>
        </div>
        <div className="worst-days-controls">
          <div
            className="period-chips worst-days-rank"
            role="group"
            aria-label="Rangsorolás"
          >
            {RANK_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`period-chip${rankBy === opt.id ? " is-active" : ""}`}
                aria-pressed={rankBy === opt.id}
                onClick={() => setRankBy(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="worst-days-limit-row">
            <span className="worst-days-limit-label" id="worst-days-limit-label">
              Hány nap
            </span>
            <div
              className="period-chips worst-days-limit"
              role="group"
              aria-labelledby="worst-days-limit-label"
            >
              {LIMIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`period-chip${limit === n ? " is-active" : ""}`}
                  aria-pressed={limit === n}
                  onClick={() => setLimit(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ul className="worst-days-list">
        {ranked.map((day, index) => {
          const value = day[rankBy];
          const tone = pmTone(value);
          return (
            <li key={day.date}>
              <button
                type="button"
                className="worst-days-item"
                onClick={() => onSelectDay(day.date)}
              >
                <span className="worst-days-rank-num" aria-hidden>
                  {index + 1}
                </span>
                <span className="worst-days-date">{day.label}</span>
                <span className={`worst-days-value tone-${tone}`}>
                  {value.toFixed(1)}{" "}
                  <small>µg/m³</small>
                </span>
                <span className="worst-days-metric">
                  {rankBy === "max" ? "napi max" : "napi átlag"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
