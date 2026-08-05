import {
  defaultParentKey,
  effectivePeriodBounds,
  listDaysInPeriod,
  listMonthsInParent,
  listParentPresets,
  listWindowsInPeriod,
  parseMonthKey,
  parseParentKey,
  quarterOfMonth,
  resolveMaxWindow,
  resolveTrendGrain,
  resolveWithinPeriod,
  suggestMaxWindow,
  suggestTrendGrain,
  toDateInputValue,
  toQuarterKey,
} from "./aggregate";
import {
  DEFAULT_METRIC,
  metricSlug,
  parseMetricSlug,
} from "./aqi";
import type {
  DatasetMeta,
  MaxWindow,
  MetricId,
  MonthKey,
  MonthSelection,
  ParentPeriodKey,
  PeriodRange,
  TrendGrain,
  ViewMode,
  WithinMonthScope,
} from "./types";

export type ViewState = {
  metric: MetricId;
  viewMode: ViewMode;
  parentKey: ParentPeriodKey;
  monthSelection: MonthSelection;
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
  "2d",
  "week",
];

const MAX_WINDOW_VALUES: MaxWindow[] = [
  "3m",
  "6m",
  "15m",
  "30m",
  "hour",
  "2h",
  "6h",
  "12h",
  "day",
];

const VIEW_MODE_VALUES: ViewMode[] = ["detailed", "simple"];

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

function isViewMode(value: string | null): value is ViewMode {
  return value != null && (VIEW_MODE_VALUES as string[]).includes(value);
}

function isDate(value: string | null): value is string {
  return value != null && DATE_RE.test(value);
}

export function viewBounds(
  parentKey: ParentPeriodKey,
  monthSelection: MonthSelection,
  dataFromMs: number,
  dataToMs: number,
): PeriodRange {
  return effectivePeriodBounds(
    parentKey,
    monthSelection,
    dataFromMs,
    dataToMs,
  );
}

function defaultDay(bounds: PeriodRange, dataToMs: number): string {
  const days = listDaysInPeriod(bounds);
  return days.at(-1)?.id ?? toDateInputValue(dataToMs);
}

function defaultWindow(
  bounds: PeriodRange,
  dataFromMs: number,
  length: 7 | 14,
): string {
  const windows = listWindowsInPeriod(bounds, length);
  return windows.at(-1)?.id ?? toDateInputValue(dataFromMs);
}

export function parentFromMonthKey(monthKey: MonthKey): ParentPeriodKey {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return toQuarterKey(new Date().getFullYear(), 1);
  }
  return toQuarterKey(parsed.year, quarterOfMonth(parsed.month));
}

/** Sensible defaults used when URL params are missing or invalid. */
export function buildDefaultViewState(meta: DatasetMeta): ViewState {
  const parentKey = defaultParentKey(meta.fromMs, meta.toMs);
  const monthSelection: MonthSelection = "full";
  const bounds = viewBounds(
    parentKey,
    monthSelection,
    meta.fromMs,
    meta.toMs,
  );
  const extended = true;
  const trendGrain = suggestTrendGrain(bounds.fromMs, bounds.toMs, {
    extended,
  });
  const maxWindow = suggestMaxWindow(trendGrain, meta.intervalMin, {
    extended,
  });
  return {
    metric: DEFAULT_METRIC,
    viewMode: "detailed",
    parentKey,
    monthSelection,
    within: "month",
    selectedDay: defaultDay(bounds, meta.toMs),
    windowStart: defaultWindow(bounds, meta.fromMs, 7),
    customFrom: toDateInputValue(bounds.fromMs),
    customTo: toDateInputValue(bounds.toMs),
    trendGrain,
    maxWindow,
  };
}

function monthAvailableInParent(
  parentKey: ParentPeriodKey,
  monthKey: MonthKey,
  fromMs: number,
  toMs: number,
): boolean {
  return listMonthsInParent(parentKey, fromMs, toMs).some(
    (m) => m.id === monthKey,
  );
}

export function parseViewState(
  search: string,
  meta: DatasetMeta,
  defaults: ViewState = buildDefaultViewState(meta),
): ViewState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const parents = listParentPresets(meta.fromMs, meta.toMs);
  const parentIds = new Set(parents.map((p) => p.id));

  const metric = parseMetricSlug(params.get("metric")) ?? defaults.metric;
  const requestedViewMode = params.get("view");
  const viewMode = isViewMode(requestedViewMode)
    ? requestedViewMode
    : defaults.viewMode;

  const h = params.get("h");
  const hm = params.get("hm");

  let parentKey = defaults.parentKey;
  let monthSelection: MonthSelection = defaults.monthSelection;

  if (h && parseParentKey(h) && parentIds.has(h as ParentPeriodKey)) {
    parentKey = h as ParentPeriodKey;
    monthSelection = "full";
    if (
      hm &&
      parseMonthKey(hm) &&
      monthAvailableInParent(parentKey, hm as MonthKey, meta.fromMs, meta.toMs)
    ) {
      monthSelection = hm as MonthKey;
    }
  } else if (h && parseMonthKey(h)) {
    // Legacy: h=YYYY-MM → containing quarter + that month
    const monthKey = h as MonthKey;
    const candidate = parentFromMonthKey(monthKey);
    if (
      parentIds.has(candidate) &&
      monthAvailableInParent(candidate, monthKey, meta.fromMs, meta.toMs)
    ) {
      parentKey = candidate;
      monthSelection = monthKey;
    }
  }

  const wRaw = params.get("w");
  const parsedWithin = isWithin(wRaw) ? wRaw : defaults.within;
  const within =
    viewMode === "simple" &&
    (parsedWithin === "1d" || parsedWithin === "custom")
      ? "month"
      : parsedWithin;

  const bounds = viewBounds(parentKey, monthSelection, meta.fromMs, meta.toMs);
  const days = listDaysInPeriod(bounds);
  const dayIds = new Set(days.map((d) => d.id));
  const weekIds = new Set(listWindowsInPeriod(bounds, 7).map((x) => x.id));
  const twoWeekIds = new Set(listWindowsInPeriod(bounds, 14).map((x) => x.id));
  const boundFrom = toDateInputValue(bounds.fromMs);
  const boundTo = toDateInputValue(bounds.toMs);

  const d = params.get("d");
  let selectedDay = defaultDay(bounds, meta.toMs);
  let windowStart = defaultWindow(bounds, meta.fromMs, 7);

  if (within === "1d") {
    selectedDay = d && dayIds.has(d) ? d : selectedDay;
  } else if (within === "7d") {
    windowStart = d && weekIds.has(d) ? d : windowStart;
  } else if (within === "14d") {
    windowStart =
      d && twoWeekIds.has(d) ? d : defaultWindow(bounds, meta.fromMs, 14);
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

  const range = resolveWithinPeriod(bounds, within, {
    selectedDay,
    windowStart,
    customFrom,
    customTo,
  });

  const g = params.get("g");
  const extended = monthSelection === "full";
  const requestedGrain = isGrain(g)
    ? g
    : suggestTrendGrain(range.fromMs, range.toMs, { extended });
  const trendGrain = resolveTrendGrain(
    range.fromMs,
    range.toMs,
    requestedGrain,
    { extended },
  );

  const m = params.get("m");
  const requestedMax = isMaxWindow(m)
    ? m
    : suggestMaxWindow(trendGrain, meta.intervalMin, { extended });
  const maxWindow = resolveMaxWindow(
    trendGrain,
    meta.intervalMin,
    requestedMax,
    { extended },
  );

  return {
    metric,
    viewMode,
    parentKey,
    monthSelection,
    within,
    selectedDay,
    windowStart,
    customFrom,
    customTo,
    trendGrain,
    maxWindow,
  };
}

/**
 * Encode state into query params.
 * - Parent: h=2026-Q1 / h=2026-H1 when not default
 * - Month under default parent: compact legacy h=YYYY-MM
 * - Month under non-default parent: h=parent&hm=YYYY-MM
 */
export function buildSearchParams(
  state: ViewState,
  defaults: ViewState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.metric !== defaults.metric) {
    params.set("metric", metricSlug(state.metric));
  }
  if (state.viewMode !== defaults.viewMode) {
    params.set("view", state.viewMode);
  }

  const within =
    state.viewMode === "simple" &&
    (state.within === "1d" || state.within === "custom")
      ? "month"
      : state.within;

  if (state.monthSelection === "full") {
    if (state.parentKey !== defaults.parentKey) {
      params.set("h", state.parentKey);
    }
  } else if (state.parentKey === defaults.parentKey) {
    params.set("h", state.monthSelection);
  } else {
    params.set("h", state.parentKey);
    params.set("hm", state.monthSelection);
  }

  if (within !== "month") {
    params.set("w", within);
  }
  if (within === "1d") {
    params.set("d", state.selectedDay);
  } else if (within === "7d" || within === "14d") {
    params.set("d", state.windowStart);
  }
  if (within === "custom") {
    params.set("from", state.customFrom);
    params.set("to", state.customTo);
  }
  if (state.trendGrain !== defaults.trendGrain) {
    params.set("g", state.trendGrain);
  }
  if (state.maxWindow !== defaults.maxWindow) {
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
