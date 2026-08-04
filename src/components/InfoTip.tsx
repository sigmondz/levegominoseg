import type { ReactNode } from "react";

type Props = {
  label: string;
  tipId: string;
  children: ReactNode;
  /** Keep the bubble inside a clipped card (e.g. stats grid). */
  inCard?: boolean;
};

export function InfoTip({ label, tipId, children, inCard = false }: Props) {
  return (
    <button
      type="button"
      className={`info-tip${inCard ? " info-tip--in-card" : ""}`}
      aria-label={label}
      aria-describedby={tipId}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle
          cx="8"
          cy="8"
          r="6.25"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M8 7.2V11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="5.2" r="0.9" fill="currentColor" />
      </svg>
      <span className="info-tip-bubble" id={tipId} role="tooltip">
        {children}
      </span>
    </button>
  );
}
