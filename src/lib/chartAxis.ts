const NICE_STEPS = [
  0.5, 1, 2, 2.5, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000,
];

function niceStep(rough: number): number {
  const target = Math.max(rough, 0.5);
  for (const step of NICE_STEPS) {
    if (step >= target * 0.85) return step;
  }
  return NICE_STEPS[NICE_STEPS.length - 1]!;
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const step = niceStep(value / 6);
  return Math.ceil(value / step) * step;
}

/** Round domain top so Y ticks stay readable and airy. */
export function chartYDomainMax(...values: number[]): number {
  const raw = Math.max(1, ...values.filter((value) => Number.isFinite(value)));
  return niceCeil(raw * 1.08);
}

export function formatYAxisTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value - Math.round(value)) < 0.05) return String(Math.round(value));
  return value.toFixed(1);
}

export function nearlyEqual(a: number, b: number, epsilon = 0.05): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Shared Recharts label for the green WHO guideline line. */
export function whoReferenceLabel(fill: string) {
  return {
    value: "WHO irányérték",
    position: "insideTopRight" as const,
    fill,
    fontFamily: "IBM Plex Mono",
    fontSize: 12,
  };
}

/**
 * Spacious Y ticks from 0…domainMax, always merging WHO / mean markers
 * so those reference levels land on the axis. Markers never remove each other.
 */
export function buildYAxisTicks(
  domainMax: number,
  markers: Array<number | null | undefined>,
  preferredCount = 7,
): number[] {
  const max = Math.max(domainMax, 1);
  const step = niceStep(max / Math.max(preferredCount - 1, 1));
  const ticks = new Set<number>([0]);

  for (let value = step; value < max - step * 0.2; value += step) {
    ticks.add(Math.round(value * 1000) / 1000);
  }
  ticks.add(max);

  const extras = markers.filter(
    (value): value is number =>
      value != null && Number.isFinite(value) && value > 0 && value <= max + 1e-9,
  );

  const markerSet = new Set(extras);
  const minGap = step * 0.35;

  for (const marker of extras) {
    for (const tick of [...ticks]) {
      if (markerSet.has(tick)) continue;
      if (tick !== 0 && nearlyEqual(tick, marker, minGap)) {
        ticks.delete(tick);
      }
    }
    ticks.add(marker);
  }

  return [...ticks].sort((a, b) => a - b);
}
