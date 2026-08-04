import {
  listDaysInMonth,
  listMonthPresets,
  listWindowsInMonth,
  monthBounds,
  parseMonthKey,
  resolveMaxWindow,
  resolveTrendGrain,
  resolveWithinMonth,
  toDateInputValue,
  toMonthKey,
} from "./aggregate";
import type {
  DatasetMeta,
  MaxWindow,
  MonthKey,
  TrendGrain,
  WithinMonthScope,
} from "./types";

export type ViewState = {
  monthKey: MonthKey;
  within: WithinMonthScope;
  selectedDay: string;
  windowStart: string;
  customFrom: string;
  customTo: string;
  trendGrain: TrendGrain;
  maxWindow: MaxWindow;
};

const WITHIN_VALUES: WithinMonthScope[] = [
  "month",
  "1d",
  "7d",
  "14d",
  "custom",
];

const GRAIN_VALUES: TrendGrain[] = [
  "raw",
  "6m",
  "15m",
  "30m",
  "hour",
  "2h",
  "4h",
  "8h",
  "12h",
  "day",
];

const MAX_WINDOW_VALUES: MaxWindow[] = ["3m", "6m", "15m", "30m", "hour"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isWithin(value: string | null): value is WithinMonthScope {
  return value != null && (WITHIN_VALUES as string[]).includes(value);
}

function isGrain(value: string | null): value is TrendGrain {
  return value != null && (GRAIN_VALUES as string[]).includes(value);
}

function isMaxWindow(value: string | null): value is MaxWindow {
  return value != null && (MAX_WINDOW_VALUES as string[]).includes(value);
}

function isDate(value: string | null): value is string {
  return value != null && DATE_RE.test(value);
}

function defaultMonthKey(fromMs: number, toMs: number): MonthKey {
  const months = listMonthPresets(fromMs, toMs);
  const january = months.find((m) => m.id.endsWith("-01"));
  return (
    january?.id ??
    months[0]?.id ??
    toMonthKey(new Date(fromMs).getFullYear(), new Date(fromMs).getMonth() + 1)
  );
}

function defaultDay(
  month: MonthKey,
  dataFromMs: number,
  dataToMs: number,
): string {
  const days = listDaysInMonth(month, dataFromMs, dataToMs);
  return days.at(-1)?.id ?? toDateInputValue(dataToMs);
}

function defaultWindow(
  month: MonthKey,
  dataFromMs: number,
  dataToMs: number,
  length: 7 | 14,
): string {
  const windows = listWindowsInMonth(month, dataFromMs, dataToMs, length);
  return windows.at(-1)?.id ?? toDateInputValue(dataFromMs);
}

/** Sensible defaults used when URL params are missing or invalid. */
export function buildDefaultViewState(meta: DatasetMeta): ViewState {
  const monthKey = defaultMonthKey(meta.fromMs, meta.toMs);
  const bounds = monthBounds(monthKey, meta.fromMs, meta.toMs);
  return {
    monthKey,
    within: "month",
    selectedDay: defaultDay(monthKey, meta.fromMs, meta.toMs),
    windowStart: defaultWindow(monthKey, meta.fromMs, meta.toMs, 7),
    customFrom: toDateInputValue(bounds.fromMs),
    customTo: toDateInputValue(bounds.toMs),
    trendGrain: "day",
    maxWindow: "3m",
  };
}

export function parseViewState(
  search: string,
  meta: DatasetMeta,
  defaults: ViewState = buildDefaultViewState(meta),
): ViewState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const months = listMonthPresets(meta.fromMs, meta.toMs);
  const monthIds = new Set(months.map((m) => m.id));

  const h = params.get("h");
  const monthKey =
    h && monthIds.has(h as MonthKey) && parseMonthKey(h as MonthKey)
      ? (h as MonthKey)
      : defaults.monthKey;

  const wRaw = params.get("w");
  const within = isWithin(wRaw) ? wRaw : defaults.within;

  const days = listDaysInMonth(monthKey, meta.fromMs, meta.toMs);
  const dayIds = new Set(days.map((d) => d.id));
  const weekIds = new Set(
    listWindowsInMonth(monthKey, meta.fromMs, meta.toMs, 7).map((x) => x.id),
  );
  const twoWeekIds = new Set(
    listWindowsInMonth(monthKey, meta.fromMs, meta.toMs, 14).map((x) => x.id),
  );
  const bounds = monthBounds(monthKey, meta.fromMs, meta.toMs);
  const boundFrom = toDateInputValue(bounds.fromMs);
  const boundTo = toDateInputValue(bounds.toMs);

  const d = params.get("d");
  let selectedDay = defaultDay(monthKey, meta.fromMs, meta.toMs);
  let windowStart = defaultWindow(monthKey, meta.fromMs, meta.toMs, 7);

  if (within === "1d") {
    selectedDay = d && dayIds.has(d) ? d : selectedDay;
  } else if (within === "7d") {
    windowStart = d && weekIds.has(d) ? d : windowStart;
  } else if (within === "14d") {
    windowStart =
      d && twoWeekIds.has(d)
        ? d
        : defaultWindow(monthKey, meta.fromMs, meta.toMs, 14);
  }

  const fromParam = params.get("from");
  const toParam = params.get("to");
  let customFrom =
    isDate(fromParam) && fromParam >= boundFrom && fromParam <= boundTo
      ? fromParam
      : boundFrom;
  let customTo =
    isDate(toParam) && toParam >= boundFrom && toParam <= boundTo
      ? toParam
      : boundTo;
  if (customFrom > customTo) {
    const swap = customFrom;
    customFrom = customTo;
    customTo = swap;
  }

  const range = resolveWithinMonth(
    monthKey,
    within,
    meta.fromMs,
    meta.toMs,
    {
      selectedDay,
      windowStart,
      customFrom,
      customTo,
    },
  );

  const g = params.get("g");
  const requestedGrain = isGrain(g) ? g : defaults.trendGrain;
  const trendGrain = resolveTrendGrain(
    range.fromMs,
    range.toMs,
    requestedGrain,
  );

  const m = params.get("m");
  const requestedMax = isMaxWindow(m) ? m : defaults.maxWindow;
  const maxWindow = resolveMaxWindow(
    trendGrain,
    meta.intervalMin,
    requestedMax,
  );

  return {
    monthKey,
    within,
    selectedDay,
    windowStart,
    customFrom,
    customTo,
    trendGrain,
    maxWindow,
  };
}

/** Build query params, omitting values that match defaults. */
export function buildSearchParams(
  state: ViewState,
  defaults: ViewState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.monthKey !== defaults.monthKey) {
    params.set("h", state.monthKey);
  }
  if (state.within !== "month") {
    params.set("w", state.within);
  }
  if (state.within === "1d") {
    params.set("d", state.selectedDay);
  } else if (state.within === "7d" || state.within === "14d") {
    params.set("d", state.windowStart);
  }
  if (state.within === "custom") {
    params.set("from", state.customFrom);
    params.set("to", state.customTo);
  }
  if (state.trendGrain !== "day") {
    params.set("g", state.trendGrain);
  }
  if (state.maxWindow !== "3m") {
    params.set("m", state.maxWindow);
  }

  return params;
}

export function readSearch(): string {
  return window.location.search;
}

export function writeSearch(params: URLSearchParams): void {
  const next = params.toString();
  const current = window.location.search.replace(/^\?/, "");
  if (current === next) return;

  const url = next
    ? `${window.location.pathname}?${next}${window.location.hash}`
    : `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState(null, "", url);
}
