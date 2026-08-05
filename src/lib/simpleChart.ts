export type ThresholdShadeFields = {
  shadedMean: number;
  shadedBelow: number;
};

/**
 * Top of the red fill (WHO → mean). Clamped to WHO when below so the Area
 * path stays continuous and Recharts can animate it with the mean Line.
 */
export function thresholdFillValue(
  mean: number,
  threshold: number | null,
): number {
  return threshold == null ? 0 : Math.max(mean, threshold);
}

/**
 * Top of the green fill (mean → WHO). Clamped to WHO when above so the Area
 * path stays continuous for animation.
 */
export function belowThresholdFillValue(
  mean: number,
  threshold: number | null,
): number {
  return threshold == null ? 0 : Math.min(mean, threshold);
}

export function thresholdShadeValues(
  mean: number,
  threshold: number | null,
): ThresholdShadeFields {
  return {
    shadedMean: thresholdFillValue(mean, threshold),
    shadedBelow: belowThresholdFillValue(mean, threshold),
  };
}

type WithMean = { mean: number; max?: number };

/**
 * Build chart rows with numeric X (`i`) and WHO crossing points so red/green
 * fills meet the mean curve cleanly and stay animatable (no null breaks).
 */
export function withWhoThresholdShades<T extends WithMean>(
  points: T[],
  threshold: number | null,
): Array<T & ThresholdShadeFields & { i: number }> {
  if (threshold == null) {
    return points.map((point, i) => ({
      ...point,
      i,
      shadedMean: 0,
      shadedBelow: 0,
    }));
  }

  const out: Array<T & ThresholdShadeFields & { i: number }> = [];

  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;

    if (index > 0) {
      const prev = points[index - 1]!;
      const prevDelta = prev.mean - threshold;
      const nextDelta = point.mean - threshold;
      if (
        prevDelta !== 0 &&
        nextDelta !== 0 &&
        Math.sign(prevDelta) !== Math.sign(nextDelta)
      ) {
        const t = (threshold - prev.mean) / (point.mean - prev.mean);
        const crossed = {
          ...prev,
          mean: threshold,
          i: index - 1 + t,
          shadedMean: threshold,
          shadedBelow: threshold,
        } as T & ThresholdShadeFields & { i: number };

        if (typeof prev.max === "number" && typeof point.max === "number") {
          crossed.max = prev.max + t * (point.max - prev.max);
        }

        out.push(crossed);
      }
    }

    out.push({
      ...point,
      i: index,
      ...thresholdShadeValues(point.mean, threshold),
    });
  }

  return out;
}

/** Shared Recharts series animation — same duration on Line and Area. */
export const CHART_ANIMATION_DURATION_MS = 900;

export function chartSeriesAnimated(pointCount: number, limit = 400): boolean {
  return pointCount > 0 && pointCount <= limit;
}
