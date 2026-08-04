import type { ReactNode } from "react";

type Props = {
  label: string;
  tip: string;
  tipId: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

/** Icon-only action button with hover/focus tooltip bubble. */
export function IconActionButton({
  label,
  tip,
  tipId,
  onClick,
  disabled = false,
  children,
}: Props) {
  return (
    <button
      type="button"
      className="export-btn export-btn--icon"
      aria-label={label}
      aria-describedby={tipId}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <span className="export-btn-tip" id={tipId} role="tooltip">
        {tip}
      </span>
    </button>
  );
}
