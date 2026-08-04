import { useRef, type ReactNode } from "react";

type Props = {
  label: string;
  tipId: string;
  children: ReactNode;
  /** Keep the bubble inside a clipped card (e.g. stats grid). */
  inCard?: boolean;
};

const EDGE_PAD = 12;

export function InfoTip({ label, tipId, children, inCard = false }: Props) {
  const bubbleRef = useRef<HTMLSpanElement>(null);

  function clampBubble() {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    bubble.style.setProperty("--tip-shift", "0px");
    const rect = bubble.getBoundingClientRect();
    const minX = EDGE_PAD;
    const maxX = window.innerWidth - EDGE_PAD;
    let shift = 0;

    if (rect.left < minX) {
      shift = minX - rect.left;
    } else if (rect.right > maxX) {
      shift = maxX - rect.right;
    }

    bubble.style.setProperty("--tip-shift", `${shift}px`);
  }

  function resetBubble() {
    bubbleRef.current?.style.setProperty("--tip-shift", "0px");
  }

  return (
    <button
      type="button"
      className={`info-tip${inCard ? " info-tip--in-card" : ""}`}
      aria-label={label}
      aria-describedby={tipId}
      onPointerEnter={clampBubble}
      onFocus={clampBubble}
      onPointerLeave={resetBubble}
      onBlur={resetBubble}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
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
      <span className="info-tip-bubble" id={tipId} role="tooltip" ref={bubbleRef}>
        {children}
      </span>
    </button>
  );
}
