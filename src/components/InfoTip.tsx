import { useRef, useState, type ReactNode } from "react";

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
  const [below, setBelow] = useState(false);
  const [shift, setShift] = useState(0);

  function clampBubble() {
    const bubble = bubbleRef.current;
    const btn = bubble?.parentElement;
    if (!bubble || !btn) return;

    const btnRect = btn.getBoundingClientRect();
    const bubbleHeight = bubble.offsetHeight;
    const bubbleWidth = bubble.offsetWidth;
    const nextBelow = btnRect.top - EDGE_PAD < bubbleHeight;

    const centerX = btnRect.left + btnRect.width / 2;
    const left = centerX - bubbleWidth / 2;
    const minX = EDGE_PAD;
    const maxX = window.innerWidth - EDGE_PAD;
    let nextShift = 0;
    if (left < minX) {
      nextShift = minX - left;
    } else if (left + bubbleWidth > maxX) {
      nextShift = maxX - (left + bubbleWidth);
    }

    setBelow(nextBelow);
    setShift(nextShift);
    // Apply before React re-renders so the fade-in starts in the right place.
    bubble.classList.toggle("is-below", nextBelow);
    bubble.style.setProperty("--tip-shift", `${nextShift}px`);
  }

  return (
    <button
      type="button"
      className={`info-tip${inCard ? " info-tip--in-card" : ""}`}
      aria-label={label}
      aria-describedby={tipId}
      onPointerEnter={clampBubble}
      onFocus={clampBubble}
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
      <span
        className={`info-tip-bubble${below ? " is-below" : ""}`}
        id={tipId}
        role="tooltip"
        ref={bubbleRef}
        style={{ ["--tip-shift" as string]: `${shift}px` }}
      >
        {children}
      </span>
    </button>
  );
}
