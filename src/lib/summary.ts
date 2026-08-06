import type {
  DailyPoint,
  DatasetMeta,
  HourlyPoint,
  MaxWindow,
  SeriesEntry,
  Summary,
  TrendGrain,
  TrendPoint,
} from "./types";
import { who24h } from "./aqi";
import { formatDateTime, startOfLocalDay, toDateInputValue } from "./period";
import { DAY_MS, MINUTE_MS } from "./time";
import {
  GRAIN_MS,
  maxWindowMs,
  resolveMaxWindow,
  suggestTrendGrain,
} from "./trend";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.round((p / 100) * (sorted.length - 1));
  return sorted[i]!;
}

function dayKey(ms: number): string {
  return toDateInputValue(ms);
}

function calendarDayCount(fromMs: number, toMs: number): number {
  if (toMs < fromMs) return 0;
  const start = new Date(`${dayKey(fromMs)}T12:00:00`).getTime();
  const end = new Date(`${dayKey(toMs)}T12:00:00`).getTime();
  return Math.floor((end - start) / DAY_MS) + 1;
}

function dayLabel(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

/** Monday 00:00 local time of the week containing ms. */
function startOfLocalWeek(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d.getTime();
}

/** Local midnight of the 2-day pair containing ms (aligned by day-of-year). */
function startOfLocalTwoDay(ms: number): number {
  const dayStart = startOfLocalDay(ms);
  const d = new Date(dayStart);
  const yearStart = new Date(d.getFullYear(), 0, 1).getTime();
  const dayOfYear = Math.floor((dayStart - yearStart) / DAY_MS);
  d.setDate(d.getDate() - (dayOfYear % 2));
  return d.getTime();
}

function weekLabel(ms: number): string {
  const start = startOfLocalWeek(ms);
  const end = start + 6 * DAY_MS;
  return `${dayLabel(start)}–${dayLabel(end)}`;
}

function twoDayLabel(ms: number): string {
  const start = startOfLocalTwoDay(ms);
  const end = start + DAY_MS;
  return `${dayLabel(start)}–${dayLabel(end)}`;
}

function hourLabel(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:00`;
}

function minuteLabel(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function filterPoints(
  points: SeriesEntry[],
  fromMs: number,
  toMs: number,
): SeriesEntry[] {
  return points.filter(([t]) => t >= fromMs && t <= toMs);
}

function maxOfWindowedMeans(
  samples: SeriesEntry[],
  windowMs: number,
  rawMs: number,
): number {
  if (samples.length === 0) return 0;
  if (windowMs <= rawMs) {
    return Math.max(...samples.map(([, v]) => v));
  }

  const subMap = new Map<number, number[]>();
  for (const [t, v] of samples) {
    const key = Math.floor(t / windowMs) * windowMs;
    const bucket = subMap.get(key);
    if (bucket) bucket.push(v);
    else subMap.set(key, [v]);
  }

  let max = -Infinity;
  for (const values of subMap.values()) {
    const mean = values.reduce((s, x) => s + x, 0) / values.length;
    if (mean > max) max = mean;
  }
  return max === -Infinity ? 0 : max;
}

function buildTrend(
  filtered: SeriesEntry[],
  grain: TrendGrain,
  maxWindow: MaxWindow,
  intervalMin: number,
): TrendPoint[] {
  if (grain === "raw") {
    return filtered.map(([t, v]) => ({
      label: minuteLabel(t),
      mean: Number(v.toFixed(2)),
      max: Number(v.toFixed(2)),
    }));
  }

  const bucketSize = GRAIN_MS[grain];
  const windowMs = maxWindowMs(maxWindow, intervalMin);
  const rawMs = Math.max(1, intervalMin) * MINUTE_MS;
  const trendMap = new Map<string, { ms: number; samples: SeriesEntry[] }>();
  for (const point of filtered) {
    const [t] = point;
    const bucketMs =
      grain === "week"
        ? startOfLocalWeek(t)
        : grain === "2d"
          ? startOfLocalTwoDay(t)
          : bucketSize
            ? Math.floor(t / bucketSize) * bucketSize
            : startOfLocalDay(t);
    const key = String(bucketMs);
    const bucket = trendMap.get(key);
    if (bucket) bucket.samples.push(point);
    else trendMap.set(key, { ms: bucketMs, samples: [point] });
  }

  return [...trendMap.values()]
    .sort((a, b) => a.ms - b.ms)
    .map(({ ms, samples }) => {
      const values = samples.map(([, v]) => v);
      return {
        label:
          grain === "week"
            ? weekLabel(ms)
            : grain === "2d"
              ? twoDayLabel(ms)
              : grain === "day"
                ? dayLabel(ms)
                : grain === "hour" || grain.endsWith("h")
                  ? hourLabel(ms)
                  : minuteLabel(ms),
        mean: Number(
          (values.reduce((s, x) => s + x, 0) / values.length).toFixed(2),
        ),
        max: Number(
          maxOfWindowedMeans(samples, windowMs, rawMs).toFixed(2),
        ),
      };
    });
}

export function buildSummary(
  points: SeriesEntry[],
  meta: DatasetMeta,
  fromMs: number,
  toMs: number,
  trendGrain: TrendGrain = suggestTrendGrain(fromMs, toMs),
  maxWindow: MaxWindow = "3m",
  options?: { extendedMaxWindows?: boolean },
): Summary {
  const filtered = filterPoints(points, fromMs, toMs);
  const vals = filtered.map(([, v]) => v);
  const sorted = [...vals].sort((a, b) => a - b);

  const span = Math.max(0, toMs - fromMs);

  const dailyMap = new Map<string, SeriesEntry[]>();
  const hourlyMap = new Map<number, number[]>();

  for (const point of filtered) {
    const [t, v] = point;
    const dk = dayKey(t);
    const daySamples = dailyMap.get(dk);
    if (daySamples) daySamples.push(point);
    else dailyMap.set(dk, [point]);

    const hour = new Date(t).getHours();
    const hourVals = hourlyMap.get(hour);
    if (hourVals) hourVals.push(v);
    else hourlyMap.set(hour, [v]);
  }

  const resolvedMax = resolveMaxWindow(
    trendGrain,
    meta.intervalMin,
    maxWindow,
    { extended: options?.extendedMaxWindows === true },
  );
  const windowMs = maxWindowMs(resolvedMax, meta.intervalMin);
  const rawMs = Math.max(1, meta.intervalMin) * MINUTE_MS;

  const daily: DailyPoint[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, samples]) => {
      const xs = samples.map(([, v]) => v);
      const xsSorted = [...xs].sort((a, b) => a - b);
      return {
        date,
        label: dayLabel(new Date(`${date}T12:00:00`).getTime()),
        n: samples.length,
        mean: Number((xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(2)),
        max: Number(maxOfWindowedMeans(samples, windowMs, rawMs).toFixed(2)),
        min: Number(Math.min(...xs).toFixed(2)),
        p50: Number(xsSorted[Math.floor(xsSorted.length / 2)]!.toFixed(2)),
      };
    });

  const hourlyMean: HourlyPoint[] = Array.from({ length: 24 }, (_, hour) => {
    const xs = hourlyMap.get(hour) ?? [];
    return {
      hour,
      mean:
        xs.length === 0
          ? 0
          : Number((xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(2)),
    };
  }).filter((h) => (hourlyMap.get(h.hour)?.length ?? 0) > 0);

  const trend = buildTrend(
    filtered,
    trendGrain,
    resolvedMax,
    meta.intervalMin,
  );

  const valid = vals.length;
  const expected =
    meta.intervalMin > 0
      ? Math.floor(span / (meta.intervalMin * 60 * 1000)) + 1
      : valid;
  const empty = Math.max(0, expected - valid);
  const who = who24h(meta.metric);

  return {
    sensor: meta.sensor,
    metric: meta.metric,
    unit: meta.unit,
    chipId: meta.chipId,
    from: formatDateTime(fromMs),
    to: formatDateTime(toMs),
    fromMs,
    toMs,
    intervalMin: meta.intervalMin,
    n: expected,
    valid,
    empty,
    min: valid ? Number(Math.min(...vals).toFixed(2)) : 0,
    max: valid ? Number(Math.max(...vals).toFixed(2)) : 0,
    mean: valid
      ? Number((vals.reduce((s, x) => s + x, 0) / valid).toFixed(2))
      : 0,
    p50: valid ? Number(percentile(sorted, 50).toFixed(2)) : 0,
    p95: valid ? Number(percentile(sorted, 95).toFixed(2)) : 0,
    above15pct: valid
      ? Number(((100 * vals.filter((v) => v >= 15).length) / valid).toFixed(1))
      : 0,
    above25pct: valid
      ? Number(((100 * vals.filter((v) => v >= 25).length) / valid).toFixed(1))
      : 0,
    above80pct: valid
      ? Number(((100 * vals.filter((v) => v >= 80).length) / valid).toFixed(1))
      : 0,
    aboveWhoPct:
      valid && who != null
        ? Number(
            ((100 * vals.filter((v) => v >= who).length) / valid).toFixed(1),
          )
        : 0,
    daysAboveWho:
      who != null ? daily.filter((d) => d.mean >= who).length : 0,
    daysTotal: calendarDayCount(fromMs, toMs),
    daily,
    hourlyMean,
    trend,
    trendGrain,
  };
}
