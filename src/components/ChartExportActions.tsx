import type { SeriesEntry } from "../lib/types";
import { downloadFilteredCsv } from "../lib/exportCsv";
import { IconActionButton } from "./IconActionButton";
import { ShareView } from "./ShareView";

type Props = {
  exportPoints: SeriesEntry[];
  exportFromMs: number;
  exportToMs: number;
  mean: number;
  canShowMax: boolean;
  maxVisible: boolean;
  onMaxVisibleChange: (visible: boolean) => void;
  ariaControls: string;
  csvTipId?: string;
};

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5v7.5M8 10 5.2 7.2M8 10l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12.5h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChartExportActions({
  exportPoints,
  exportFromMs,
  exportToMs,
  mean,
  canShowMax,
  maxVisible,
  onMaxVisibleChange,
  ariaControls,
  csvTipId = "csv-export-tip",
}: Props) {
  return (
    <div className="chart-export-actions">
      {canShowMax ? (
        <button
          type="button"
          className={`period-chip series-visibility-chip${maxVisible ? " is-active" : ""}`}
          aria-pressed={maxVisible}
          aria-controls={ariaControls}
          onClick={() => onMaxVisibleChange(!maxVisible)}
        >
          Max görbe
        </button>
      ) : null}
      <IconActionButton
        label="CSV letöltés"
        tip="CSV letöltés. A kiválasztott időszak nyers, 3 perces mérési pontjait tölti le."
        tipId={csvTipId}
        disabled={exportPoints.length === 0}
        onClick={() =>
          downloadFilteredCsv(exportPoints, exportFromMs, exportToMs)
        }
      >
        <DownloadIcon />
      </IconActionButton>
      <ShareView fromMs={exportFromMs} toMs={exportToMs} mean={mean} />
    </div>
  );
}
