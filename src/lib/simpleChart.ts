/** Top of the red fill between WHO and the mean when mean ≥ WHO. */
export function thresholdFillValue(
  mean: number,
  threshold: number | null,
): number {
  return threshold == null ? 0 : Math.max(mean, threshold);
}

/** Bottom of the green fill between the mean and WHO when mean ≤ WHO. */
export function belowThresholdFillValue(
  mean: number,
  threshold: number | null,
): number {
  return threshold == null ? 0 : Math.min(mean, threshold);
}
