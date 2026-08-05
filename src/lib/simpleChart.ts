export function thresholdFillValue(
  mean: number,
  threshold: number | null,
): number {
  return threshold == null ? 0 : Math.max(mean, threshold);
}
