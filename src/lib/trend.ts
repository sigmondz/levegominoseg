import type { MaxWindow, TrendGrain } from "./types";
import { DAY_MS, HOUR_MS, MINUTE_MS } from "./time";

const GRAIN_MS: Partial<Record<TrendGrain, number>> = {
  "6m": 6 * MINUTE_MS,
  "15m": 15 * MINUTE_MS,
  "30m": 30 * MINUTE_MS,
  hour: HOUR_MS,
  "2h": 2 * HOUR_MS,
  "4h": 4 * HOUR_MS,
  "8h": 8 * HOUR_MS,
  "12h": 12 * HOUR_MS,
  "2d": 2 * DAY_MS,
  week: 7 * DAY_MS,
};

const MAX_WINDOW_BASE: MaxWindow[] = ["3m", "6m", "15m", "30m", "hour"];
const MAX_WINDOW_EXTENDED: MaxWindow[] = ["2h", "6h", "12h", "day"];

function grainBucketMs(grain: TrendGrain): number | null {
  if (grain === "raw") return null;
  return GRAIN_MS[grain] ?? DAY_MS;
}

export function maxWindowMs(
  window: MaxWindow,
  intervalMin: number,
): number {
  switch (window) {
    case "3m":
      return Math.max(1, intervalMin) * MINUTE_MS;
    case "6m":
      return 6 * MINUTE_MS;
    case "15m":
      return 15 * MINUTE_MS;
    case "30m":
      return 30 * MINUTE_MS;
    case "hour":
      return HOUR_MS;
    case "2h":
      return 2 * HOUR_MS;
    case "6h":
      return 6 * HOUR_MS;
    case "12h":
      return 12 * HOUR_MS;
    case "day":
      return DAY_MS;
  }
}

/** Max-window options strictly smaller than the current trend grain bucket. */
export function availableMaxWindows(
  grain: TrendGrain,
  intervalMin: number,
  options?: { extended?: boolean },
): MaxWindow[] {
  const bucket = grainBucketMs(grain);
  if (bucket == null) return [];
  const catalog = options?.extended
    ? [...MAX_WINDOW_BASE, ...MAX_WINDOW_EXTENDED]
    : MAX_WINDOW_BASE;
  return catalog.filter((w) => maxWindowMs(w, intervalMin) < bucket);
}

/** Preferred max-window order per grain (first available wins). */
const MAX_WINDOW_PREFERENCE: Record<TrendGrain, MaxWindow[]> = {
  raw: ["3m"],
  "6m": ["3m"],
  "15m": ["6m", "3m"],
  "30m": ["15m", "6m", "3m"],
  hour: ["30m", "15m", "6m"],
  "2h": ["hour", "30m", "15m"],
  "4h": ["hour", "30m", "15m"],
  "8h": ["hour", "30m", "15m"],
  "12h": ["hour", "30m", "15m"],
  day: ["hour", "30m", "15m"],
  "2d": ["2h", "hour", "30m", "15m"],
  week: ["day", "12h", "6h", "2h", "hour"],
};

const MAX_WINDOW_PREFERENCE_EXTENDED: Partial<Record<TrendGrain, MaxWindow[]>> =
  {
    day: ["hour", "6h", "2h", "30m", "15m"],
    "2d": ["2h", "6h", "hour", "30m", "15m"],
    week: ["day", "12h", "6h", "2h", "hour"],
    hour: ["6h", "2h", "hour", "30m", "15m"],
    "2h": ["6h", "2h", "hour", "30m", "15m"],
    "4h": ["6h", "2h", "hour", "30m", "15m"],
    "8h": ["6h", "2h", "hour", "30m", "15m"],
    "12h": ["6h", "2h", "hour", "30m", "15m"],
  };

function preferredMaxWindows(
  grain: TrendGrain,
  extended: boolean,
): MaxWindow[] {
  if (extended) {
    return (
      MAX_WINDOW_PREFERENCE_EXTENDED[grain] ?? MAX_WINDOW_PREFERENCE[grain]
    );
  }
  return MAX_WINDOW_PREFERENCE[grain];
}

/** Default max window scaled to the current trend grain. */
export function suggestMaxWindow(
  grain: TrendGrain,
  intervalMin: number,
  options?: { extended?: boolean },
): MaxWindow {
  const available = availableMaxWindows(grain, intervalMin, options);
  if (available.length === 0) return "3m";

  for (const window of preferredMaxWindows(
    grain,
    options?.extended === true,
  )) {
    if (available.includes(window)) return window;
  }
  return available[0]!;
}

/** Keep current max window if still allowed, otherwise fall back to the default. */
export function resolveMaxWindow(
  grain: TrendGrain,
  intervalMin: number,
  current: MaxWindow,
  options?: { extended?: boolean },
): MaxWindow {
  const available = availableMaxWindows(grain, intervalMin, options);
  if (available.length === 0) return "3m";
  return available.includes(current)
    ? current
    : suggestMaxWindow(grain, intervalMin, options);
}

/** Trend densities that stay readable for a given span length. */
export function availableTrendGrains(
  fromMs: number,
  toMs: number,
  options?: { extended?: boolean },
): TrendGrain[] {
  const span = Math.max(0, toMs - fromMs);
  if (span <= 36 * HOUR_MS) {
    return ["raw", "6m", "15m", "30m", "hour", "2h"];
  }
  if (span <= 8 * DAY_MS) {
    return ["15m", "30m", "hour", "2h", "4h", "8h", "12h", "day"];
  }
  if (span <= 16 * DAY_MS) {
    return ["30m", "hour", "2h", "4h", "8h", "12h", "day"];
  }
  // 2-day / weekly buckets only for full Q/H periods
  if (options?.extended === true) {
    return ["hour", "2h", "4h", "8h", "12h", "day", "2d", "week"];
  }
  return ["hour", "2h", "4h", "8h", "12h", "day"];
}

/** Default chart density for a selected span. */
export function suggestTrendGrain(
  fromMs: number,
  toMs: number,
  _options?: { extended?: boolean },
): TrendGrain {
  const span = Math.max(0, toMs - fromMs);
  if (span <= 36 * HOUR_MS) return "15m";
  if (span <= 8 * DAY_MS) return "hour";
  if (span <= 16 * DAY_MS) return "2h";
  // Full Q/H and longer spans: daily points match the simple overview grain
  return "day";
}

/** Keep the current grain if still allowed, otherwise fall back to the default. */
export function resolveTrendGrain(
  fromMs: number,
  toMs: number,
  current: TrendGrain,
  options?: { extended?: boolean },
): TrendGrain {
  const available = availableTrendGrains(fromMs, toMs, options);
  return available.includes(current)
    ? current
    : suggestTrendGrain(fromMs, toMs, options);
}

export { GRAIN_MS };
