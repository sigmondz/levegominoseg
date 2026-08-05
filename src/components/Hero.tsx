import type { ViewMode } from "../lib/types";
import type { Theme } from "../lib/theme";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

function EyeIcon() {
  return (
    <svg
      className="view-mode-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

type Props = {
  theme: Theme;
  onToggleTheme: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function Hero({
  theme,
  onToggleTheme,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <header className="hero">
      <div className="hero-toolbar">
        <div
          className="view-mode-toggle"
          role="group"
          aria-label="Megjelenítési mód"
        >
          <button
            type="button"
            className={`view-mode-button${viewMode === "simple" ? " is-active" : ""}`}
            aria-pressed={viewMode === "simple"}
            aria-label="Egyszerű nézet"
            title="Egyszerű nézet"
            onClick={() => onViewModeChange("simple")}
          >
            <span>Egyszerű</span>
            <EyeIcon />
          </button>
          <button
            type="button"
            className={`view-mode-button${viewMode === "detailed" ? " is-active" : ""}`}
            aria-pressed={viewMode === "detailed"}
            aria-label="Részletes nézet"
            title="Részletes nézet"
            onClick={() => onViewModeChange("detailed")}
          >
            <span>Részletes</span>
            <EyeIcon />
          </button>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <h1 className="hero-brand">
        <BrandMark className="hero-brand-mark" />
        <span>Levegőminőség Nagymaroson</span>
      </h1>
    </header>
  );
}
