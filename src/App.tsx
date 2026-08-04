import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { MetricFilter } from "./components/MetricFilter";
import { PeriodFilter } from "./components/PeriodFilter";
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
    setTrendGrain((current) =>
      resolveTrendGrain(range.fromMs, range.toMs, current),
    );
  }, [range?.fromMs, range?.toMs]);

  useEffect(() => {
    if (!series) return;
    setMaxWindow((current) =>
      resolveMaxWindow(trendGrain, series.meta.intervalMin, current),
    );
  }, [trendGrain, series]);

  const urlDefaults = useMemo(
    () => (series ? buildDefaultViewState(series.meta) : null),
    [series],
  );

  useEffect(() => {
    if (!series || !parentKey || !urlDefaults) return;
    const state: ViewState = {
      metric,
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

  const availableGrains = useMemo(() => {
    if (!range) return [] as TrendGrain[];
    return availableTrendGrains(range.fromMs, range.toMs);
  }, [range]);

  const availableMaxWindowOptions = useMemo(() => {
    if (!series) return [] as MaxWindow[];
    return availableMaxWindows(trendGrain, series.meta.intervalMin);
  }, [series, trendGrain]);

  const data = useMemo(() => {
    if (!series || !range) return null;
    return buildSummary(
      series.points,
      series.meta,
      range.fromMs,
      range.toMs,
      trendGrain,
      maxWindow,
    );
  }, [series, range, trendGrain, maxWindow]);

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

  return (
    <div className="app">
      <Hero
        data={data}
        dataFromMs={series.meta.fromMs}
        dataToMs={series.meta.toMs}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <MetricFilter metric={metric} onMetricChange={setMetric} />
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
        <HourlyChart hourly={data.hourlyMean} />
      </Suspense>
      <footer className="footer">
        <span>
          Forrás: Grafana CSV ·{" "}
          <code>
            {data.sensor} {data.metric}
          </code>
        </span>
        <span className="footer-freshness">
          Adatforrás: {dataFrom} → {lastMeasurement.slice(0, 10)} · Utolsó
          mérés: {lastMeasurement} · Nem élő adat
        </span>
        <span>
          Nyers fájl: <code>{csvPath(metric)}</code>
        </span>
      </footer>
    </div>
  );
}
