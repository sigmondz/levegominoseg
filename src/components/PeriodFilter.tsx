import { useMemo } from "react";
import type {
  MonthSelection,
  ParentPeriodKey,
  WithinMonthScope,
} from "../lib/types";
import {
  effectivePeriodBounds,
  listDaysInPeriod,
  listMonthsInParent,
  listParentPresets,
  listWindowsInPeriod,
  toDateInputValue,
} from "../lib/aggregate";
import { DatePicker } from "./DatePicker";
import { InfoTip } from "./InfoTip";

const WITHIN_PRESETS: { id: WithinMonthScope; label: string }[] = [
  { id: "month", label: "Összes nap" },
  { id: "1d", label: "Nap" },
  { id: "7d", label: "Hét" },
  { id: "14d", label: "2 hét" },
  { id: "custom", label: "Egyéni" },
];

type Props = {
  parentKey: ParentPeriodKey;
  monthSelection: MonthSelection;
  within: WithinMonthScope;
  selectedDay: string;
  windowStart: string;
  customFrom: string;
  customTo: string;
  dataFromMs: number;
  dataToMs: number;
  onParentChange: (parent: ParentPeriodKey) => void;
  onMonthSelectionChange: (month: MonthSelection) => void;
  onWithinChange: (within: WithinMonthScope) => void;
  onSelectedDayChange: (day: string) => void;
  onWindowStartChange: (start: string) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  simple?: boolean;
};

export function PeriodFilter({
  parentKey,
  monthSelection,
  within,
  selectedDay,
  windowStart,
  customFrom,
  customTo,
  dataFromMs,
  dataToMs,
  onParentChange,
  onMonthSelectionChange,
  onWithinChange,
  onSelectedDayChange,
  onWindowStartChange,
  onCustomFromChange,
  onCustomToChange,
  simple = false,
}: Props) {
  const parentPresets = useMemo(
    () => listParentPresets(dataFromMs, dataToMs),
    [dataFromMs, dataToMs],
  );

  const monthPresets = useMemo(
    () => listMonthsInParent(parentKey, dataFromMs, dataToMs),
    [parentKey, dataFromMs, dataToMs],
  );

  const bounds = useMemo(
    () =>
      effectivePeriodBounds(
        parentKey,
        monthSelection,
        dataFromMs,
        dataToMs,
      ),
    [parentKey, monthSelection, dataFromMs, dataToMs],
  );
  const min = toDateInputValue(bounds.fromMs);
  const max = toDateInputValue(bounds.toMs);

  const days = useMemo(() => listDaysInPeriod(bounds), [bounds]);

  const weekWindows = useMemo(
    () => listWindowsInPeriod(bounds, 7),
    [bounds],
  );

  const twoWeekWindows = useMemo(
    () => listWindowsInPeriod(bounds, 14),
    [bounds],
  );

  return (
    <section
      className="section period period--compact"
      id="idoszak"
      aria-labelledby="period-title"
    >
      <div className="label-with-tip">
        <h2 className="section-title" id="period-title">
          Időszak
        </h2>
        <InfoTip label="Hogyan működik az időszakválasztó?" tipId="period-tip">
          Először a nagyobb tartományt választod (negyedév vagy félév), majd
          azon belül egy hónapot vagy az összes hónapot.{" "}
          {simple
            ? "Ezután az összes napos, heti vagy kéthetes előre megadott időablak közül választhatsz."
            : "Alatta tovább szűkítheted: teljes tartomány, egy nap, egy hét, két hét, vagy egyéni dátumtól–ig."}{" "}
          A grafikonok és a számok mindig a kiválasztott időablakra vonatkoznak.
        </InfoTip>
      </div>

      {parentPresets.length > 0 ? (
        <div
          className="period-chips period-chips--months"
          role="group"
          aria-label="Negyedév / félév"
        >
          {parentPresets.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`period-chip period-chip--month${parentKey === item.id ? " is-active" : ""}`}
              aria-pressed={parentKey === item.id}
              onClick={() => onParentChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="period-chips period-chips--months"
        role="group"
        aria-label="Hónap"
      >
        <button
          type="button"
          className={`period-chip period-chip--month${monthSelection === "full" ? " is-active" : ""}`}
          aria-pressed={monthSelection === "full"}
          onClick={() => onMonthSelectionChange("full")}
        >
          Összes hónap
        </button>
        {monthPresets.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`period-chip period-chip--month${monthSelection === item.id ? " is-active" : ""}`}
            aria-pressed={monthSelection === item.id}
            onClick={() => onMonthSelectionChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="period-chips"
        role="group"
        aria-label="Időszak a tartományon belül"
      >
        {WITHIN_PRESETS.filter(
          (item) => !simple || (item.id !== "1d" && item.id !== "custom"),
        ).map((item) => (
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

      {!simple && within === "1d" ? (
        <div className="period-subchoice">
          <div
            className="period-chips period-chips--days"
            role="group"
            aria-label="Nap"
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
          <div className="period-chips" role="group" aria-label="Hét">
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
          <div className="period-chips" role="group" aria-label="2 hét">
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

      {!simple && within === "custom" ? (
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
