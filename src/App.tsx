import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { MetricFilter } from "./components/MetricFilter";
import { PeriodFilter } from "./components/PeriodFilter";
import { PeriodLead } from "./components/PeriodLead";
import { SimpleChart } from "./components/SimpleChart";
import { SimpleOverview } from "./components/SimpleOverview";
import { Stats } from "./components/Stats";
import { WorstDays } from "./components/WorstDays";
import { useTheme } from "./hooks/useTheme";
import {
  availableMaxWindows,
  availableTrendGrains,
  buildSummary,
  defaultParentKey,
  effectivePeriodBounds,
  listDaysInPeriod,
  listParentPresets,
  listWindowsInPeriod,
  resolveMaxWindow,
  resolveTrendGrain,
  resolveWithinPeriod,
  suggestMaxWindow,
  suggestTrendGrain,
  formatDateTime,
  toDateInputValue,
} from "./lib/aggregate";
import {
  csvPath,
  DEFAULT_METRIC,
  parseMetricSlug,
  seriesUrl,
} from "./lib/aqi";
import type {
  MaxWindow,
  MetricId,
  MonthSelection,
  ParentPeriodKey,
  PeriodRange,
  SeriesFile,
  TrendGrain,
  ViewMode,
  WithinMonthScope,
} from "./lib/types";
import {
  buildDefaultViewState,
  buildSearchParams,
  parseViewState,
  readSearch,
  writeSearch,
  type ViewState,
} from "./lib/urlState";

const DailyChart = lazy(async () => {
  const mod = await import("./components/DailyChart");
  return { default: mod.DailyChart };
});

const HourlyChart = lazy(async () => {
  const mod = await import("./components/HourlyChart");
  return { default: mod.HourlyChart };
});

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

export default function App() {
  const { theme, toggleTheme } = useTheme();
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

  const data = useMemo(() => {
    if (!series || !range) return null;
    return buildSummary(
      series.points,
      series.meta,
      range.fromMs,
      range.toMs,
      trendGrain,
      maxWindow,
      { extendedMaxWindows: extendedPeriod },
    );
  }, [series, range, trendGrain, maxWindow, extendedPeriod]);

  const filteredPoints = useMemo(() => {
    if (!series || !range) return [];
    return series.points.filter(
      ([t]) => t >= range.fromMs && t <= range.toMs,
    );
  }, [series, range]);

  if (error) {
    return (
      <div className="error" role="alert">
        {error}
      </div>
    );
  }

  if (!series || !data || !parentKey) {
    return <div className="loading">Adatok betöltése…</div>;
  }

  const dataFrom = toDateInputValue(series.meta.fromMs);
  const lastMeasurement = formatDateTime(series.meta.toMs).slice(0, 16);

  const currentBounds = effectivePeriodBounds(
    parentKey,
    monthSelection,
    series.meta.fromMs,
    series.meta.toMs,
  );
  const loadedSeries = series;

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

  const filterControls = (
    <>
      <PeriodFilter
        parentKey={parentKey}
        monthSelection={monthSelection}
        within={within}
        selectedDay={selectedDay}
        windowStart={windowStart}
        customFrom={customFrom}
        customTo={customTo}
        dataFromMs={series.meta.fromMs}
        dataToMs={series.meta.toMs}
        simple={viewMode === "simple"}
        onParentChange={(parent) => {
          const bounds = effectivePeriodBounds(
            parent,
            "full",
            series.meta.fromMs,
            series.meta.toMs,
          );
          setParentKey(parent);
          setMonthSelection("full");
          resetWithinFields(bounds, series.meta.fromMs, series.meta.toMs, {
            setWithin,
            setSelectedDay,
            setWindowStart,
            setCustomFrom,
            setCustomTo,
          });
        }}
        onMonthSelectionChange={(month) => {
          const bounds = effectivePeriodBounds(
            parentKey,
            month,
            series.meta.fromMs,
            series.meta.toMs,
          );
          setMonthSelection(month);
          resetWithinFields(bounds, series.meta.fromMs, series.meta.toMs, {
            setWithin,
            setSelectedDay,
            setWindowStart,
            setCustomFrom,
            setCustomTo,
          });
        }}
        onWithinChange={(next) => {
          setWithin(next);
          if (next === "1d") {
            setSelectedDay(defaultDay(currentBounds, series.meta.toMs));
          }
          if (next === "7d") {
            setWindowStart(
              defaultWindow(currentBounds, series.meta.fromMs, 7),
            );
          }
          if (next === "14d") {
            setWindowStart(
              defaultWindow(currentBounds, series.meta.fromMs, 14),
            );
          }
        }}
        onSelectedDayChange={setSelectedDay}
        onWindowStartChange={setWindowStart}
        onCustomFromChange={(value) => {
          setCustomFrom(value);
          setWithin("custom");
        }}
        onCustomToChange={(value) => {
          setCustomTo(value);
          setWithin("custom");
        }}
      />
      <MetricFilter metric={metric} onMetricChange={setMetric} />
      {viewMode === "detailed" ? <PeriodLead data={data} /> : null}
    </>
  );

  return (
    <div className="app">
      <Hero
        theme={theme}
        onToggleTheme={toggleTheme}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <div className="filter-bar">{filterControls}</div>
      {viewMode === "simple" ? (
        <>
          <SimpleOverview data={data} />
          <SimpleChart
            daily={data.daily}
            mean={data.mean}
            metric={data.metric}
            unit={data.unit}
          />
        </>
      ) : null}
      {viewMode === "detailed" ? (
        <>
          <Stats data={data} />
          <Suspense fallback={<div className="loading">Grafikonok…</div>}>
            <DailyChart
              trend={data.trend}
              mean={data.mean}
              metric={data.metric}
              grain={trendGrain}
              availableGrains={availableGrains}
              maxWindow={maxWindow}
              availableMaxWindows={availableMaxWindowOptions}
              intervalMin={series.meta.intervalMin}
              exportPoints={filteredPoints}
              exportFromMs={data.fromMs}
              exportToMs={data.toMs}
              onGrainChange={setTrendGrain}
              onMaxWindowChange={setMaxWindow}
            />
            <WorstDays
              daily={data.daily}
              metric={data.metric}
              visible={within !== "1d" && data.daily.length >= 2}
              onSelectDay={(date) => {
                setWithin("1d");
                setSelectedDay(date);
                requestAnimationFrame(() => {
                  document
                    .getElementById("napi")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
            />
            <HourlyChart
              hourly={data.hourlyMean}
              mean={data.mean}
              metric={data.metric}
              intervalMin={series.meta.intervalMin}
            />
          </Suspense>
        </>
      ) : null}
      <footer className="footer">
        {viewMode === "simple" ? (
          <span className="footer-freshness">
            Utolsó mérés: {lastMeasurement} · Nem élő adat
          </span>
        ) : (
          <>
            <span className="footer-meta">
              {data.sensor} · {data.metric} · {dataFrom} →{" "}
              {toDateInputValue(series.meta.toMs)} · {data.chipId}
            </span>
            <span className="footer-freshness">
              Utolsó mérés: {lastMeasurement} · Nem élő adat
            </span>
            <span>
              Forrás: Grafana CSV · <code>{csvPath(metric)}</code>
            </span>
          </>
        )}
      </footer>
    </div>
  );
}
