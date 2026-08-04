type Props = {
  className?: string;
};

/** Title mark: favicon leaf, slightly refined for the hero. */
export function BrandMark({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="8 3 24 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="brand-leaf"
          x1="12"
          y1="4"
          x2="28"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--accent-hover)" />
          <stop offset="0.55" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--chart-mean)" />
        </linearGradient>
      </defs>
      <path
        d="M20 3.5c8.2 4.6 12.1 11.6 10.4 20.5-4.1 3.2-8 5.5-10.4 7-2.4-1.5-6.3-3.8-10.4-7C7.9 15.1 11.8 8.1 20 3.5Z"
        fill="url(#brand-leaf)"
      />
      <path
        d="M20 9.5v18"
        stroke="var(--accent-contrast)"
        strokeOpacity="0.35"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
