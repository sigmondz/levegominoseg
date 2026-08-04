import type { DailyPoint } from "./types";

export type WorstRankBy = "max" | "mean";

export function rankWorstDays(
  daily: DailyPoint[],
  by: WorstRankBy,
  limit = 3,
): DailyPoint[] {
  if (daily.length === 0) return [];
  return [...daily]
    .sort((a, b) => b[by] - a[by])
    .slice(0, Math.min(limit, daily.length));
}
