import { useMemo } from "react";
import type { MonthKey, WithinMonthScope } from "../lib/types";
import {
  listDaysInMonth,
  listMonthPresets,
  listWindowsInMonth,
  monthBounds,
  toDateInputValue,
} from "../lib/aggregate";
import { DatePicker } from "./DatePicker";

const WITHIN_PRESETS: { id: WithinMonthScope; label: string }[] = [
  { id: "month", label: "Teljes hónap" },
  { id: "1d", label: "Nap" },
  { id: "7d", label: "Hét" },
  { id: "14d", label: "2 hét" },
  { id: "custom", label: "Egyéni" },
];

type Props = {
  monthKey: MonthKey;
  within: WithinMonthScope;
  selectedDay: string;
  windowStart: string;
  customFrom: string;
  customTo: string;
  dataFromMs: number;
  dataToMs: number;
  onMonthChange: (month: MonthKey) => void;
  onWithinChange: (within: WithinMonthScope) => void;
  onSelectedDayChange: (day: string) => void;
  onWindowStartChange: (start: string) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
};

export function PeriodFilter({
  monthKey,
  within,
  selectedDay,
  windowStart,
  customFrom,
  customTo,
  dataFromMs,
  dataToMs,
  onMonthChange,
  onWithinChange,
  onSelectedDayChange,
  onWindowStartChange,
  onCustomFromChange,
  onCustomToChange,
}: Props) {
  const monthPresets = useMemo(
    () => listMonthPresets(dataFromMs, dataToMs),
    [dataFromMs, dataToMs],
  );

  const bounds = useMemo(
    () => monthBounds(monthKey, dataFromMs, dataToMs),
    [monthKey, dataFromMs, dataToMs],
  );
  const min = toDateInputValue(bounds.fromMs);
  const max = toDateInputValue(bounds.toMs);

  const days = useMemo(
    () => listDaysInMonth(monthKey, dataFromMs, dataToMs),
    [monthKey, dataFromMs, dataToMs],
  );

  const weekWindows = useMemo(
    () => listWindowsInMonth(monthKey, dataFromMs, dataToMs, 7),
    [monthKey, dataFromMs, dataToMs],
  );

  const twoWeekWindows = useMemo(
    () => listWindowsInMonth(monthKey, dataFromMs, dataToMs, 14),
    [monthKey, dataFromMs, dataToMs],
  );

  return (
    <section className="section period" id="idoszak" aria-labelledby="period-title">
      <div className="section-head">
        <p className="section-kicker">Szűrés</p>
        <h2 className="section-title" id="period-title">
          Időszak
        </h2>
        <p className="section-desc">
          Először válassz hónapot, majd azon belül: teljes hónap, nap, hét, 2
          hét vagy egyéni tartomány. A nap / hét / 2 hét alatt megjelennek a
          választható dátumok.
        </p>
      </div>

      {monthPresets.length > 0 ? (
        <div className="period-months">
          <p className="period-months-label" id="month-filter-label">
            Hónap
          </p>

          <div
            className="period-chips period-chips--months"
            role="group"
            aria-labelledby="month-filter-label"
          >
            {monthPresets.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`period-chip period-chip--month${monthKey === item.id ? " is-active" : ""}`}
                aria-pressed={monthKey === item.id}
                onClick={() => onMonthChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="period-range">
        <p className="period-months-label" id="range-filter-label">
          A hónapon belül
        </p>
        <div
          className="period-chips"
          role="group"
          aria-labelledby="range-filter-label"
        >
          {WITHIN_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`period-chip${within === item.id ? " is-active" : ""}`}
              aria-pressed={within === item.id}
              onClick={() => onWithinChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {within === "1d" ? (
        <div className="period-subchoice">
          <p className="period-months-label" id="day-filter-label">
            Nap
          </p>
          <div
            className="period-chips period-chips--days"
            role="group"
            aria-labelledby="day-filter-label"
          >
            {days.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`period-chip period-chip--day${selectedDay === item.id ? " is-active" : ""}`}
                aria-pressed={selectedDay === item.id}
                onClick={() => onSelectedDayChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {within === "7d" ? (
        <div className="period-subchoice">
          <p className="period-months-label" id="week-filter-label">
            Hét
          </p>
          <div
            className="period-chips"
            role="group"
            aria-labelledby="week-filter-label"
          >
            {weekWindows.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`period-chip${windowStart === item.id ? " is-active" : ""}`}
                aria-pressed={windowStart === item.id}
                onClick={() => onWindowStartChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {within === "14d" ? (
        <div className="period-subchoice">
          <p className="period-months-label" id="twoweek-filter-label">
            2 hét
          </p>
          <div
            className="period-chips"
            role="group"
            aria-labelledby="twoweek-filter-label"
          >
            {twoWeekWindows.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`period-chip${windowStart === item.id ? " is-active" : ""}`}
                aria-pressed={windowStart === item.id}
                onClick={() => onWindowStartChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {within === "custom" ? (
        <div className="period-custom">
          <DatePicker
            label="Ettől"
            value={customFrom}
            min={min}
            max={max}
            onChange={onCustomFromChange}
          />
          <DatePicker
            label="Eddig"
            value={customTo}
            min={min}
            max={max}
            onChange={onCustomToChange}
          />
        </div>
      ) : null}
    </section>
  );
}
