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
  daily: DailyPoint[];
  hourlyMean: HourlyPoint[];
  trend: TrendPoint[];
  trendGrain: TrendGrain;
};

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
  | "day";

export type PeriodRange = {
  fromMs: number;
  toMs: number;
};

/** Selected calendar month as YYYY-MM */
export type MonthKey = `${number}-${string}`;

/** Filter scope inside the selected month */
export type WithinMonthScope = "month" | "1d" | "7d" | "14d" | "custom";

