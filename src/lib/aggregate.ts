import type {
  DailyPoint,
  DatasetMeta,
  HalfKey,
  HourlyPoint,
  MaxWindow,
  MonthKey,
  MonthSelection,
  ParentPeriodKey,
  PeriodRange,
  QuarterKey,
  SeriesEntry,
  Summary,
  TrendGrain,
  TrendPoint,
  WithinMonthScope,
} from "./types";
import { who24h } from "./aqi";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

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

/** Default max window scaled to the current trend grain. */
export function suggestMaxWindow(
  grain: TrendGrain,
  intervalMin: number,
  options?: { extended?: boolean },
): MaxWindow {
  const available = availableMaxWindows(grain, intervalMin, options);
  if (available.length === 0) return "3m";

  // Prefer a peak window that is coarse enough for the chart density:
  // raw 3m spikes drown daily/weekly views.
  const preferred: MaxWindow[] =
    options?.extended === true && grain === "week"
      ? ["day", "12h", "6h", "2h", "hour"]
      : options?.extended === true && grain === "2d"
        ? ["2h", "6h", "hour", "30m", "15m"]
        : options?.extended === true && (grain === "day" || grain.endsWith("h"))
          ? ["6h", "2h", "hour", "30m", "15m"]
          : grain === "week"
            ? ["day", "12h", "6h", "2h", "hour"]
            : grain === "2d"
              ? ["2h", "hour", "30m", "15m"]
              : grain === "day"
                ? ["hour", "30m", "15m"]
                : grain === "12h" ||
                    grain === "8h" ||
                    grain === "4h" ||
                    grain === "2h"
                  ? ["hour", "30m", "15m"]
                  : grain === "hour"
                    ? ["30m", "15m", "6m"]
                    : grain === "30m"
                      ? ["15m", "6m", "3m"]
                      : grain === "15m"
                        ? ["6m", "3m"]
                        : ["3m"];

  for (const window of preferred) {
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

const MONTH_NAMES_HU = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
] as const;

export function toMonthKey(year: number, month: number): MonthKey {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}` as MonthKey;
}

export function parseMonthKey(
  key: string,
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || !month || month < 1 || month > 12) return null;
  return { year, month };
}

export function toQuarterKey(year: number, quarter: 1 | 2 | 3 | 4): QuarterKey {
  return `${year}-Q${quarter}` as QuarterKey;
}

export function toHalfKey(year: number, half: 1 | 2): HalfKey {
  return `${year}-H${half}` as HalfKey;
}

export function parseParentKey(
  key: string,
):
  | { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 }
  | { kind: "half"; year: number; half: 1 | 2 }
  | null {
  const q = /^(\d{4})-Q([1-4])$/.exec(key);
  if (q) {
    return {
      kind: "quarter",
      year: Number(q[1]),
      quarter: Number(q[2]) as 1 | 2 | 3 | 4,
    };
  }
  const h = /^(\d{4})-H([12])$/.exec(key);
  if (h) {
    return {
      kind: "half",
      year: Number(h[1]),
      half: Number(h[2]) as 1 | 2,
    };
  }
  return null;
}

/** Quarter containing a calendar month (1–12). */
export function quarterOfMonth(month: number): 1 | 2 | 3 | 4 {
  return Math.ceil(month / 3) as 1 | 2 | 3 | 4;
}

function parentCalendarRange(key: ParentPeriodKey): PeriodRange | null {
  const parsed = parseParentKey(key);
  if (!parsed) return null;
  if (parsed.kind === "quarter") {
    const startMonth = (parsed.quarter - 1) * 3; // 0-based
    const from = startOfLocalDay(
      new Date(parsed.year, startMonth, 1).getTime(),
    );
    const to = endOfLocalDay(
      new Date(parsed.year, startMonth + 3, 0).getTime(),
    );
    return { fromMs: from, toMs: to };
  }
  const startMonth = parsed.half === 1 ? 0 : 6;
  const from = startOfLocalDay(new Date(parsed.year, startMonth, 1).getTime());
  const to = endOfLocalDay(new Date(parsed.year, startMonth + 6, 0).getTime());
  return { fromMs: from, toMs: to };
}

function rangesOverlap(a: PeriodRange, b: PeriodRange): boolean {
  return a.fromMs <= b.toMs && a.toMs >= b.fromMs;
}

export function listMonthPresets(
  fromMs: number,
  toMs: number,
): { id: MonthKey; label: string }[] {
  const start = new Date(fromMs);
  const end = new Date(toMs);
  let y = start.getFullYear();
  let m = start.getMonth();
  const endY = end.getFullYear();
  const endM = end.getMonth();
  const items: { id: MonthKey; label: string }[] = [];

  while (y < endY || (y === endY && m <= endM)) {
    const name = MONTH_NAMES_HU[m]!;
    items.push({
      id: toMonthKey(y, m + 1),
      label: `${y} ${name.toLowerCase()}`,
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return items;
}

/**
 * Parent presets overlapping data: per year Q1–Q4, then H1, H2.
 * Labels: "2026 Q1", "2026 H1".
 */
export function listParentPresets(
  fromMs: number,
  toMs: number,
): { id: ParentPeriodKey; label: string }[] {
  const dataRange = { fromMs, toMs };
  const startY = new Date(fromMs).getFullYear();
  const endY = new Date(toMs).getFullYear();
  const items: { id: ParentPeriodKey; label: string }[] = [];

  for (let year = startY; year <= endY; year++) {
    const candidates: ParentPeriodKey[] = [
      toQuarterKey(year, 1),
      toQuarterKey(year, 2),
      toQuarterKey(year, 3),
      toQuarterKey(year, 4),
      toHalfKey(year, 1),
      toHalfKey(year, 2),
    ];
    for (const id of candidates) {
      const cal = parentCalendarRange(id);
      if (cal && rangesOverlap(cal, dataRange)) {
        const label = id.replace("-", " ");
        items.push({ id, label });
      }
    }
  }
  return items;
}

/** Months inside a parent period, clipped to available data. */
export function listMonthsInParent(
  parentKey: ParentPeriodKey,
  dataFromMs: number,
  dataToMs: number,
): { id: MonthKey; label: string }[] {
  const bounds = parentBounds(parentKey, dataFromMs, dataToMs);
  return listMonthPresets(bounds.fromMs, bounds.toMs);
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Calendar month clipped to available data. */
export function monthBounds(
  monthKey: MonthKey,
  dataFromMs: number,
  dataToMs: number,
): PeriodRange {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return { fromMs: dataFromMs, toMs: dataToMs };
  }
  const from = startOfLocalDay(
    new Date(parsed.year, parsed.month - 1, 1).getTime(),
  );
  const to = endOfLocalDay(new Date(parsed.year, parsed.month, 0).getTime());
  return {
    fromMs: Math.max(dataFromMs, from),
    toMs: Math.min(dataToMs, to),
  };
}

/** Parent (quarter / half) clipped to available data. */
export function parentBounds(
  parentKey: ParentPeriodKey,
  dataFromMs: number,
  dataToMs: number,
): PeriodRange {
  const cal = parentCalendarRange(parentKey);
  if (!cal) {
    return { fromMs: dataFromMs, toMs: dataToMs };
  }
  return {
    fromMs: Math.max(dataFromMs, cal.fromMs),
    toMs: Math.min(dataToMs, cal.toMs),
  };
}

/** Effective range from parent + month row selection. */
export function effectivePeriodBounds(
  parentKey: ParentPeriodKey,
  monthSelection: MonthSelection,
  dataFromMs: number,
  dataToMs: number,
): PeriodRange {
  if (monthSelection === "full") {
    return parentBounds(parentKey, dataFromMs, dataToMs);
  }
  return monthBounds(monthSelection, dataFromMs, dataToMs);
}

/**
 * Resolve filter inside an effective period.
 * For 1d / 7d / 14d, pass the chosen window start date (YYYY-MM-DD).
 */
export function resolveWithinPeriod(
  bounds: PeriodRange,
  scope: WithinMonthScope,
  options?: {
    selectedDay?: string;
    windowStart?: string;
    customFrom?: string;
    customTo?: string;
  },
): PeriodRange {
  if (scope === "1d") {
    const day = options?.selectedDay ?? toDateInputValue(bounds.toMs);
    const from = startOfLocalDay(new Date(`${day}T00:00:00`).getTime());
    const to = endOfLocalDay(from);
    return {
      fromMs: Math.max(bounds.fromMs, from),
      toMs: Math.min(bounds.toMs, to),
    };
  }

  if (scope === "7d" || scope === "14d") {
    const days = scope === "7d" ? 7 : 14;
    const windows = listWindowsInPeriod(bounds, days);
    const startKey =
      options?.windowStart ??
      windows.at(-1)?.id ??
      toDateInputValue(bounds.fromMs);
    const from = startOfLocalDay(new Date(`${startKey}T00:00:00`).getTime());
    const idx = windows.findIndex((w) => w.id === startKey);
    const to =
      idx >= 0 && idx === windows.length - 1
        ? bounds.toMs
        : endOfLocalDay(from + (days - 1) * DAY_MS);
    return {
      fromMs: Math.max(bounds.fromMs, from),
      toMs: Math.min(bounds.toMs, to),
    };
  }

  if (scope === "custom" && options?.customFrom && options?.customTo) {
    const from = startOfLocalDay(
      new Date(`${options.customFrom}T00:00:00`).getTime(),
    );
    const to = endOfLocalDay(
      new Date(`${options.customTo}T00:00:00`).getTime(),
    );
    return {
      fromMs: Math.max(bounds.fromMs, Math.min(from, to)),
      toMs: Math.min(bounds.toMs, Math.max(from, to)),
    };
  }

  return bounds;
}

/** Resolve filter inside a selected month (wrapper around resolveWithinPeriod). */
export function resolveWithinMonth(
  monthKey: MonthKey,
  scope: WithinMonthScope,
  dataFromMs: number,
  dataToMs: number,
  options?: {
    selectedDay?: string;
    windowStart?: string;
    customFrom?: string;
    customTo?: string;
  },
): PeriodRange {
  return resolveWithinPeriod(
    monthBounds(monthKey, dataFromMs, dataToMs),
    scope,
    options,
  );
}

/** Calendar days available inside a period (clipped to data). */
export function listDaysInPeriod(
  bounds: PeriodRange,
): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  let cursor = startOfLocalDay(bounds.fromMs);
  const end = startOfLocalDay(bounds.toMs);

  while (cursor <= end) {
    const d = new Date(cursor);
    items.push({
      id: toDateInputValue(cursor),
      label: String(d.getDate()),
    });
    cursor += DAY_MS;
  }
  return items;
}

export function listDaysInMonth(
  monthKey: MonthKey,
  dataFromMs: number,
  dataToMs: number,
): { id: string; label: string }[] {
  return listDaysInPeriod(monthBounds(monthKey, dataFromMs, dataToMs));
}

/**
 * Non-overlapping windows inside a period.
 * Fixed-length windows cover the span; the last window absorbs any remainder
 * (no stub chip for leftover days — e.g. January → 4×7d or 2×14d, not 5/3).
 */
export function listWindowsInPeriod(
  bounds: PeriodRange,
  lengthDays: 7 | 14,
): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  const first = startOfLocalDay(bounds.fromMs);
  const last = startOfLocalDay(bounds.toMs);
  const spanDays = Math.floor((last - first) / DAY_MS) + 1;

  if (spanDays <= 0) return items;

  const fullCount = Math.floor(spanDays / lengthDays);

  // Shorter than one window: single chip for the whole span
  if (fullCount === 0) {
    items.push({
      id: toDateInputValue(first),
      label: `${formatShortDay(first)}–${formatShortDay(last)}`,
    });
    return items;
  }

  for (let i = 0; i < fullCount; i++) {
    const startMs = first + i * lengthDays * DAY_MS;
    const endMs =
      i === fullCount - 1
        ? last
        : startMs + (lengthDays - 1) * DAY_MS;
    items.push({
      id: toDateInputValue(startMs),
      label: `${formatShortDay(startMs)}–${formatShortDay(endMs)}`,
    });
  }

  return items;
}

export function listWindowsInMonth(
  monthKey: MonthKey,
  dataFromMs: number,
  dataToMs: number,
  lengthDays: 7 | 14,
): { id: string; label: string }[] {
  return listWindowsInPeriod(
    monthBounds(monthKey, dataFromMs, dataToMs),
    lengthDays,
  );
}

/** Default parent = quarter containing the preferred default month. */
export function defaultParentKey(
  fromMs: number,
  toMs: number,
): ParentPeriodKey {
  const months = listMonthPresets(fromMs, toMs);
  const january = months.find((m) => m.id.endsWith("-01"));
  const monthKey =
    january?.id ??
    months[0]?.id ??
    toMonthKey(new Date(fromMs).getFullYear(), new Date(fromMs).getMonth() + 1);
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return toQuarterKey(new Date(fromMs).getFullYear(), 1);
  }
  return toQuarterKey(parsed.year, quarterOfMonth(parsed.month));
}

function formatShortDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}.`;
}


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
  options?: { extended?: boolean },
): TrendGrain {
  const span = Math.max(0, toMs - fromMs);
  if (span <= 36 * HOUR_MS) return "15m";
  if (span <= 8 * DAY_MS) return "hour";
  if (span <= 16 * DAY_MS) return "2h";
  // Full Q/H: 2-day is denser than week, still readable on long spans
  if (options?.extended === true) return "2d";
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

  const dailyMap = new Map<string, number[]>();
  const hourlyMap = new Map<number, number[]>();

  for (const [t, v] of filtered) {
    const dk = dayKey(t);
    const dayVals = dailyMap.get(dk);
    if (dayVals) dayVals.push(v);
    else dailyMap.set(dk, [v]);

    const hour = new Date(t).getHours();
    const hourVals = hourlyMap.get(hour);
    if (hourVals) hourVals.push(v);
    else hourlyMap.set(hour, [v]);
  }

  const daily: DailyPoint[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, xs]) => {
      const xsSorted = [...xs].sort((a, b) => a - b);
      return {
        date,
        label: dayLabel(new Date(`${date}T12:00:00`).getTime()),
        n: xs.length,
        mean: Number((xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(2)),
        max: Number(Math.max(...xs).toFixed(2)),
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

  const resolvedMax = resolveMaxWindow(
    trendGrain,
    meta.intervalMin,
    maxWindow,
    { extended: options?.extendedMaxWindows === true },
  );
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
