export type DailyPoint = {
  date: string;
  label: string;
  n: number;
  mean: number;
  max: number;
  min: number;
  p50: number;
};

export type HourlyPoint = {
  hour: number;
  mean: number;
};

export type TrendPoint = {
  label: string;
  mean: number;
  max: number;
};

/** Selectable pollutant series */
export type MetricId = "PM1" | "PM2.5" | "PM10";

export type DatasetMeta = {
  sensor: string;
  metric: string;
  unit: string;
  chipId: string;
  intervalMin: number;
  fromMs: number;
  toMs: number;
};

/** Compact series entry: [timestampMs, value] */
export type SeriesEntry = [number, number];

export type SeriesFile = {
  meta: DatasetMeta;
  points: SeriesEntry[];
};

export type Summary = {
  sensor: string;
  metric: string;
  unit: string;
  chipId: string;
  from: string;
  to: string;
  fromMs: number;
  toMs: number;
  intervalMin: number;
  n: number;
  valid: number;
  empty: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  above15pct: number;
  above25pct: number;
  above80pct: number;
  /** Share of readings ≥ WHO 24h guideline; 0 if metric has no WHO value. */
  aboveWhoPct: number;
  /** Days with daily mean ≥ WHO 24h guideline; 0 if metric has no WHO value. */
  daysAboveWho: number;
  /** Calendar days in the selected range (inclusive). */
  daysTotal: number;
  daily: DailyPoint[];
  hourlyMean: HourlyPoint[];
  trend: TrendPoint[];
  trendGrain: TrendGrain;
};

export type ViewMode = "detailed" | "simple";

/** Chart aggregation density for the trend series */
export type TrendGrain =
  | "raw"
  | "6m"
  | "15m"
  | "30m"
  | "hour"
  | "2h"
  | "4h"
  | "8h"
  | "12h"
  | "day"
  | "2d"
  | "week";

/** Window used to compute the MAX series inside each trend bucket */
export type MaxWindow =
  | "3m"
  | "6m"
  | "15m"
  | "30m"
  | "hour"
  | "2h"
  | "6h"
  | "12h"
  | "day";

export type PeriodRange = {
  fromMs: number;
  toMs: number;
};

/** Selected calendar month as YYYY-MM */
export type MonthKey = `${number}-${string}`;

/** Calendar quarter as YYYY-Qn */
export type QuarterKey = `${number}-Q${1 | 2 | 3 | 4}`;

/** Calendar half-year as YYYY-Hn */
export type HalfKey = `${number}-H${1 | 2}`;

/** Parent period above months (quarter or half-year) */
export type ParentPeriodKey = QuarterKey | HalfKey;

/**
 * Month row selection inside a parent:
 * - "full" = entire parent period
 * - MonthKey = one calendar month inside the parent
 */
export type MonthSelection = "full" | MonthKey;

/** Filter scope inside the selected effective period */
export type WithinMonthScope = "month" | "1d" | "7d" | "14d" | "custom";

