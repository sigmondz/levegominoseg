import { useEffect, useMemo, useRef, useState } from "react";
import {
  availableMaxWindows,
  availableTrendGrains,
  buildSummary,
  defaultDay,
  defaultParentKey,
  defaultWindow,
  effectivePeriodBounds,
  listParentPresets,
  resolveMaxWindow,
  resolveTrendGrain,
  resolveWithinPeriod,
  suggestMaxWindow,
  suggestTrendGrain,
  toDateInputValue,
} from "../lib/aggregate";
import {
  DEFAULT_METRIC,
  parseMetricSlug,
  seriesUrl,
} from "../lib/aqi";
import type {
  MaxWindow,
  MetricId,
  MonthSelection,
  ParentPeriodKey,
  PeriodRange,
  SeriesFile,
  Summary,
  TrendGrain,
  ViewMode,
  WithinMonthScope,
} from "../lib/types";
import {
  buildDefaultViewState,
  buildSearchParams,
  parseViewState,
  readSearch,
  writeSearch,
  type ViewState,
} from "../lib/urlState";

function resetWithinFields(
  bounds: PeriodRange,
  dataFromMs: number,
  dataToMs: number,
  setters: {
    setWithin: (v: WithinMonthScope) => void;
    setSelectedDay: (v: string) => void;
    setWindowStart: (v: string) => void;
    setCustomFrom: (v: string) => void;
    setCustomTo: (v: string) => void;
  },
) {
  setters.setWithin("month");
  setters.setSelectedDay(defaultDay(bounds, dataToMs));
  setters.setWindowStart(defaultWindow(bounds, dataFromMs, 7));
  setters.setCustomFrom(toDateInputValue(bounds.fromMs));
  setters.setCustomTo(toDateInputValue(bounds.toMs));
}

function applyViewState(
  view: ViewState,
  setters: {
    setMetric: (v: MetricId) => void;
    setViewMode: (v: ViewMode) => void;
    setParentKey: (v: ParentPeriodKey) => void;
    setMonthSelection: (v: MonthSelection) => void;
    setWithin: (v: WithinMonthScope) => void;
    setSelectedDay: (v: string) => void;
    setWindowStart: (v: string) => void;
    setCustomFrom: (v: string) => void;
    setCustomTo: (v: string) => void;
    setTrendGrain: (v: TrendGrain) => void;
    setMaxWindow: (v: MaxWindow) => void;
  },
) {
  setters.setMetric(view.metric);
  setters.setViewMode(view.viewMode);
  setters.setParentKey(view.parentKey);
  setters.setMonthSelection(view.monthSelection);
  setters.setWithin(view.within);
  setters.setSelectedDay(view.selectedDay);
  setters.setWindowStart(view.windowStart);
  setters.setCustomFrom(view.customFrom);
  setters.setCustomTo(view.customTo);
  setters.setTrendGrain(view.trendGrain);
  setters.setMaxWindow(view.maxWindow);
}

function initialMetricFromUrl(): MetricId {
  try {
    const params = new URLSearchParams(
      readSearch().startsWith("?") ? readSearch().slice(1) : readSearch(),
    );
    return parseMetricSlug(params.get("metric")) ?? DEFAULT_METRIC;
  } catch {
    return DEFAULT_METRIC;
  }
}

export type DashboardReady = {
  status: "ready";
  error: null;
  series: SeriesFile;
  data: Summary;
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
  availableGrains: TrendGrain[];
  availableMaxWindowOptions: MaxWindow[];
  filteredPoints: SeriesFile["points"];
  setMetric: (v: MetricId) => void;
  setSelectedDay: (v: string) => void;
  setWindowStart: (v: string) => void;
  setTrendGrain: (v: TrendGrain) => void;
  setMaxWindow: (v: MaxWindow) => void;
  handleViewModeChange: (next: ViewMode) => void;
  handleParentChange: (parent: ParentPeriodKey) => void;
  handleMonthSelectionChange: (month: MonthSelection) => void;
  handleWithinChange: (next: WithinMonthScope) => void;
  handleCustomFromChange: (value: string) => void;
  handleCustomToChange: (value: string) => void;
  handleWorstDaySelect: (date: string) => void;
};

export type DashboardState =
  | { status: "loading"; error: null }
  | { status: "error"; error: string }
  | DashboardReady;

export function useDashboardState(): DashboardState {
  const [metric, setMetric] = useState<MetricId>(initialMetricFromUrl);
  const [viewMode, setViewMode] = useState<ViewMode>("simple");
  const [series, setSeries] = useState<SeriesFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parentKey, setParentKey] = useState<ParentPeriodKey | null>(null);
  const [monthSelection, setMonthSelection] =
    useState<MonthSelection>("full");
  const [within, setWithin] = useState<WithinMonthScope>("month");
  const [selectedDay, setSelectedDay] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [trendGrain, setTrendGrain] = useState<TrendGrain>("day");
  const [maxWindow, setMaxWindow] = useState<MaxWindow>("3m");
  const seriesCache = useRef(new Map<MetricId, SeriesFile>());
  const appliedInitialView = useRef(false);
  const prevExtendedRef = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let json = seriesCache.current.get(metric);
        if (!json) {
          const res = await fetch(seriesUrl(metric));
          if (!res.ok) {
            throw new Error(`Nem sikerült betölteni az adatot (${res.status})`);
          }
          json = (await res.json()) as SeriesFile;
          seriesCache.current.set(metric, json);
        }
        if (cancelled) return;

        setSeries(json);
        setError(null);

        if (!appliedInitialView.current) {
          appliedInitialView.current = true;
          const defaults = buildDefaultViewState(json.meta);
          const view = parseViewState(readSearch(), json.meta, defaults);
          applyViewState(view, {
            setMetric,
            setViewMode,
            setParentKey,
            setMonthSelection,
            setWithin,
            setSelectedDay,
            setWindowStart,
            setCustomFrom,
            setCustomTo,
            setTrendGrain,
            setMaxWindow,
          });
          return;
        }

        const parents = listParentPresets(json.meta.fromMs, json.meta.toMs);
        const parentIds = new Set(parents.map((p) => p.id));
        setParentKey((current) => {
          if (current && parentIds.has(current)) return current;
          return defaultParentKey(json!.meta.fromMs, json!.meta.toMs);
        });
        setMonthSelection("full");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ismeretlen hiba");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [metric]);

  useEffect(() => {
    if (!series) return;

    function onPopState() {
      const defaults = buildDefaultViewState(series!.meta);
      const view = parseViewState(readSearch(), series!.meta, defaults);
      applyViewState(view, {
        setMetric,
        setViewMode,
        setParentKey,
        setMonthSelection,
        setWithin,
        setSelectedDay,
        setWindowStart,
        setCustomFrom,
        setCustomTo,
        setTrendGrain,
        setMaxWindow,
      });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [series]);

  const range = useMemo(() => {
    if (!series || !parentKey) return null;
    const bounds = effectivePeriodBounds(
      parentKey,
      monthSelection,
      series.meta.fromMs,
      series.meta.toMs,
    );
    return resolveWithinPeriod(bounds, within, {
      selectedDay,
      windowStart,
      customFrom,
      customTo,
    });
  }, [
    series,
    parentKey,
    monthSelection,
    within,
    selectedDay,
    windowStart,
    customFrom,
    customTo,
  ]);

  useEffect(() => {
    if (!range) return;
    const extended = monthSelection === "full";
    const prevExtended = prevExtendedRef.current;
    prevExtendedRef.current = extended;

    // Összes hónap ↔ konkrét hónap: állítsuk vissza az adott nézet alapértékeire
    if (prevExtended !== null && prevExtended !== extended) {
      const grain = suggestTrendGrain(range.fromMs, range.toMs, { extended });
      setTrendGrain(grain);
      if (series) {
        setMaxWindow(
          suggestMaxWindow(grain, series.meta.intervalMin, { extended }),
        );
      }
      return;
    }

    setTrendGrain((current) =>
      resolveTrendGrain(range.fromMs, range.toMs, current, { extended }),
    );
  }, [range?.fromMs, range?.toMs, monthSelection, series]);

  useEffect(() => {
    if (!series) return;
    const extended = monthSelection === "full";
    setMaxWindow((current) =>
      resolveMaxWindow(trendGrain, series.meta.intervalMin, current, {
        extended,
      }),
    );
  }, [trendGrain, series, monthSelection]);

  const urlDefaults = useMemo(
    () => (series ? buildDefaultViewState(series.meta) : null),
    [series],
  );

  useEffect(() => {
    if (!series || !parentKey || !urlDefaults) return;
    const state: ViewState = {
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
    writeSearch(buildSearchParams(state, urlDefaults));
  }, [
    series,
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
    urlDefaults,
  ]);

  const extendedPeriod = monthSelection === "full";

  const availableGrains = useMemo(() => {
    if (!range) return [] as TrendGrain[];
    return availableTrendGrains(range.fromMs, range.toMs, {
      extended: extendedPeriod,
    });
  }, [range, extendedPeriod]);

  const availableMaxWindowOptions = useMemo(() => {
    if (!series) return [] as MaxWindow[];
    return availableMaxWindows(trendGrain, series.meta.intervalMin, {
      extended: extendedPeriod,
    });
  }, [series, trendGrain, extendedPeriod]);

  const effectiveMaxWindow = useMemo(() => {
    if (!series) return maxWindow;
    // Simple view: always scale the max window to the current period length.
    if (viewMode === "simple") {
      return suggestMaxWindow(trendGrain, series.meta.intervalMin, {
        extended: extendedPeriod,
      });
    }
    return maxWindow;
  }, [series, viewMode, trendGrain, maxWindow, extendedPeriod]);

  const data = useMemo(() => {
    if (!series || !range) return null;
    return buildSummary(
      series.points,
      series.meta,
      range.fromMs,
      range.toMs,
      trendGrain,
      effectiveMaxWindow,
      { extendedMaxWindows: extendedPeriod },
    );
  }, [series, range, trendGrain, effectiveMaxWindow, extendedPeriod]);

  const filteredPoints = useMemo(() => {
    if (!series || !range) return [];
    return series.points.filter(
      ([t]) => t >= range.fromMs && t <= range.toMs,
    );
  }, [series, range]);

  if (error) {
    return { status: "error", error };
  }

  if (!series || !data || !parentKey) {
    return { status: "loading", error: null };
  }

  const loadedSeries = series;
  const loadedParentKey = parentKey;

  const currentBounds = effectivePeriodBounds(
    loadedParentKey,
    monthSelection,
    loadedSeries.meta.fromMs,
    loadedSeries.meta.toMs,
  );

  function handleViewModeChange(next: ViewMode) {
    if (next === "simple" && (within === "1d" || within === "custom")) {
      resetWithinFields(
        currentBounds,
        loadedSeries.meta.fromMs,
        loadedSeries.meta.toMs,
        {
          setWithin,
          setSelectedDay,
          setWindowStart,
          setCustomFrom,
          setCustomTo,
        },
      );
    }
    setViewMode(next);
  }

  function handleParentChange(parent: ParentPeriodKey) {
    const bounds = effectivePeriodBounds(
      parent,
      "full",
      loadedSeries.meta.fromMs,
      loadedSeries.meta.toMs,
    );
    setParentKey(parent);
    setMonthSelection("full");
    resetWithinFields(bounds, loadedSeries.meta.fromMs, loadedSeries.meta.toMs, {
      setWithin,
      setSelectedDay,
      setWindowStart,
      setCustomFrom,
      setCustomTo,
    });
  }

  function handleMonthSelectionChange(month: MonthSelection) {
    const bounds = effectivePeriodBounds(
      loadedParentKey,
      month,
      loadedSeries.meta.fromMs,
      loadedSeries.meta.toMs,
    );
    setMonthSelection(month);
    resetWithinFields(bounds, loadedSeries.meta.fromMs, loadedSeries.meta.toMs, {
      setWithin,
      setSelectedDay,
      setWindowStart,
      setCustomFrom,
      setCustomTo,
    });
  }

  function handleWithinChange(next: WithinMonthScope) {
    setWithin(next);
    if (next === "1d") {
      setSelectedDay(defaultDay(currentBounds, loadedSeries.meta.toMs));
    }
    if (next === "7d") {
      setWindowStart(defaultWindow(currentBounds, loadedSeries.meta.fromMs, 7));
    }
    if (next === "14d") {
      setWindowStart(defaultWindow(currentBounds, loadedSeries.meta.fromMs, 14));
    }
  }

  function handleCustomFromChange(value: string) {
    setCustomFrom(value);
    setWithin("custom");
  }

  function handleCustomToChange(value: string) {
    setCustomTo(value);
    setWithin("custom");
  }

  function handleWorstDaySelect(date: string) {
    setWithin("1d");
    setSelectedDay(date);
    requestAnimationFrame(() => {
      document
        .getElementById("napi")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return {
    status: "ready",
    error: null,
    series,
    data,
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
    availableGrains,
    availableMaxWindowOptions,
    filteredPoints,
    setMetric,
    setSelectedDay,
    setWindowStart,
    setTrendGrain,
    setMaxWindow,
    handleViewModeChange,
    handleParentChange,
    handleMonthSelectionChange,
    handleWithinChange,
    handleCustomFromChange,
    handleCustomToChange,
    handleWorstDaySelect,
  };
}
