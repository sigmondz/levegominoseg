import type { Theme } from "../lib/theme";

type Props = {
  theme: Theme;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: Props) {
  const isLight = theme === "light";
  const next = isLight ? "sötét" : "világos";

  return (
    <button
      type="button"
      className={`theme-switch${isLight ? " is-light" : ""}`}
      role="switch"
      aria-checked={isLight}
      aria-label={`Váltás ${next} módra`}
      title={`Váltás ${next} módra`}
      onClick={onToggle}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-icon theme-switch-icon--moon">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
            <path
              d="M21 14.3A8.5 8.5 0 0 1 9.7 3 7 7 0 1 0 21 14.3Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="theme-switch-icon theme-switch-icon--sun">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
            <circle
              cx="12"
              cy="12"
              r="3.75"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M12 2.75v1.7M12 19.55v1.7M2.75 12h1.7M19.55 12h1.7M5.25 5.25l1.2 1.2M17.55 17.55l1.2 1.2M18.75 5.25l-1.2 1.2M6.45 17.55l-1.2 1.2"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="theme-switch-thumb" />
      </span>
    </button>
  );
}
