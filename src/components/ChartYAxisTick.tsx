import { formatYAxisTick, nearlyEqual } from "../lib/chartAxis";

type Props = {
  x?: string | number;
  y?: string | number;
  payload?: { value?: number };
  who: number | null;
  mean: number | null;
  whoColor: string;
  meanColor: string;
  muted: string;
  fontSize?: number;
  fontFamily?: string;
};

function asNumber(value: string | number | undefined, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/** Colored WHO and period-mean labels on the Y axis (mean follows card tone). */
export function ChartYAxisTick({
  x,
  y,
  payload,
  who,
  mean,
  whoColor,
  meanColor,
  muted,
  fontSize = 13,
  fontFamily = "IBM Plex Mono",
}: Props) {
  const value = payload?.value;
  if (value == null || !Number.isFinite(value)) return null;

  const isWho = who != null && nearlyEqual(value, who);
  const isMean = !isWho && mean != null && nearlyEqual(value, mean);
  const fill = isWho ? whoColor : isMean ? meanColor : muted;

  return (
    <text
      x={asNumber(x)}
      y={asNumber(y)}
      dy={4}
      textAnchor="end"
      fill={fill}
      fontSize={fontSize}
      fontFamily={fontFamily}
      fontWeight={isWho || isMean ? 700 : undefined}
    >
      {formatYAxisTick(value)}
    </text>
  );
}
