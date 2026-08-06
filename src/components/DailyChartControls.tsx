import type { MaxWindow, TrendGrain } from "../lib/types";
import { InfoTip } from "./InfoTip";
import {
  GRAIN_OPTIONS,
  MAX_WINDOW_OPTIONS,
  type GrainCopy,
} from "./dailyChartCopy";

type Props = {
  copy: GrainCopy;
  grain: TrendGrain;
  availableGrains: TrendGrain[];
  maxWindow: MaxWindow;
  availableMaxWindows: MaxWindow[];
  intervalMin: number;
  canShowMax: boolean;
  onGrainChange: (grain: TrendGrain) => void;
  onMaxWindowChange: (window: MaxWindow) => void;
};

export function DailyChartControls({
  copy,
  grain,
  availableGrains,
  maxWindow,
  availableMaxWindows: maxWindows,
  intervalMin,
  canShowMax,
  onGrainChange,
  onMaxWindowChange,
}: Props) {
  const grainSet = new Set(availableGrains);
  const grainOptions = GRAIN_OPTIONS.flatMap((opt) => {
    if (!grainSet.has(opt.id)) return [];
    return [
      opt.id === "raw" ? { ...opt, label: `${intervalMin} perc` } : opt,
    ];
  });

  const maxSet = new Set(maxWindows);
  const maxWindowOptions = MAX_WINDOW_OPTIONS.flatMap((opt) => {
    if (!maxSet.has(opt.id)) return [];
    return [
      opt.id === "3m" ? { ...opt, label: `${intervalMin} perc` } : opt,
    ];
  });

  return (
    <div className="section-head">
      <div className="label-with-tip">
        <h2 className="section-title" id="daily-title">
          {copy.title}
        </h2>
        <InfoTip label="Miről szól ez a grafikon?" tipId="daily-chart-tip">
          {copy.desc}
        </InfoTip>
      </div>
      <div className="grain-picker" role="group" aria-label="Adatsűrűség">
        <div className="label-with-tip">
          <p className="period-months-label" id="grain-filter-label">
            Adatsűrűség
          </p>
          <InfoTip label="Mi az adatsűrűség?" tipId="grain-tip">
            Azt állítja, milyen hosszú időszakokból rajzolódjon egy-egy pont a
            görbén. Például „Nap” esetén minden naphoz egy átlag (és egy csúcs)
            tartozik. A szenzor továbbra is 3 percenként mér — ez csak a
            megjelenítést sűríti vagy ritkítja.
          </InfoTip>
        </div>
        <div className="period-chips" aria-labelledby="grain-filter-label">
          {grainOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`period-chip${grain === opt.id ? " is-active" : ""}`}
              aria-pressed={grain === opt.id}
              onClick={() => onGrainChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {canShowMax && maxWindowOptions.length > 0 ? (
        <div className="max-window-row" role="group" aria-label="Max ablak">
          <div className="max-window-row-main">
            <div className="label-with-tip">
              <p className="period-months-label" id="max-window-filter-label">
                Max ablak
              </p>
              <InfoTip label="Mi a max ablak?" tipId="max-window-tip">
                A piros csúcsgörbe számításához: a választott hosszúságú átlagok
                közül vesszük a legnagyobbat (pl. egy napon belül). 3 percnél a
                legmagasabb nyers mérést kapod; hosszabb ablaknál a rövid
                kiugrások simábbak lesznek.
              </InfoTip>
            </div>
            <div
              className="period-chips"
              aria-labelledby="max-window-filter-label"
            >
              {maxWindowOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`period-chip${maxWindow === opt.id ? " is-active" : ""}`}
                  aria-pressed={maxWindow === opt.id}
                  onClick={() => onMaxWindowChange(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
