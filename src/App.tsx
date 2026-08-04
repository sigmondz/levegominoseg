import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Hero } from "./components/Hero";
import { PeriodFilter } from "./components/PeriodFilter";
import { Stats } from "./components/Stats";
import { useTheme } from "./hooks/useTheme";
import {
  availableMaxWindows,
  availableTrendGrains,
  buildSummary,
  listDaysInMonth,
  listWindowsInMonth,
  monthBounds,
  resolveMaxWindow,
  resolveTrendGrain,
  resolveWithinMonth,
  toDateInputValue,
} from "./lib/aggregate";
import type {
  MaxWindow,
  MonthKey,
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

function applyViewState(
  view: ViewState,
  setters: {
    setMonthKey: (v: MonthKey) => void;
    setWithin: (v: WithinMonthScope) => void;
    setSelectedDay: (v: string) => void;
    setWindowStart: (v: string) => void;
    setCustomFrom: (v: string) => void;
    setCustomTo: (v: string) => void;
    setTrendGrain: (v: TrendGrain) => void;
    setMaxWindow: (v: MaxWindow) => void;
  },
) {
  setters.setMonthKey(view.monthKey);
  setters.setWithin(view.within);
  setters.setSelectedDay(view.selectedDay);
  setters.setWindowStart(view.windowStart);
  setters.setCustomFrom(view.customFrom);
  setters.setCustomTo(view.customTo);
  setters.setTrendGrain(view.trendGrain);
  setters.setMaxWindow(view.maxWindow);
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [series, setSeries] = useState<SeriesFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState<MonthKey | null>(null);
  const [within, setWithin] = useState<WithinMonthScope>("month");
  const [selectedDay, setSelectedDay] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [trendGrain, setTrendGrain] = useState<TrendGrain>("day");
  const [maxWindow, setMaxWindow] = useState<MaxWindow>("3m");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/data/series.json");
        if (!res.ok) {
          throw new Error(`Nem sikerült betölteni az adatot (${res.status})`);
        }
        const json = (await res.json()) as SeriesFile;
        if (!cancelled) {
          const defaults = buildDefaultViewState(json.meta);
          const view = parseViewState(readSearch(), json.meta, defaults);
          setSeries(json);
          applyViewState(view, {
            setMonthKey,
            setWithin,
            setSelectedDay,
            setWindowStart,
            setCustomFrom,
            setCustomTo,
            setTrendGrain,
            setMaxWindow,
          });
        }
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
  }, []);

  useEffect(() => {
    if (!series) return;

    function onPopState() {
      const defaults = buildDefaultViewState(series!.meta);
      const view = parseViewState(readSearch(), series!.meta, defaults);
      applyViewState(view, {
        setMonthKey,
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
    if (!series || !monthKey) return null;
    return resolveWithinMonth(
      monthKey,
      within,
      series.meta.fromMs,
      series.meta.toMs,
      {
        selectedDay,
        windowStart,
        customFrom,
        customTo,
      },
    );
  }, [
    series,
    monthKey,
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
    if (!series || !monthKey || !urlDefaults) return;
    const state: ViewState = {
      monthKey,
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
    monthKey,
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

  if (!series || !data || !monthKey) {
    return <div className="loading">Adatok betöltése…</div>;
  }

  return (
    <div className="app">
      <Hero
        data={data}
        dataFromMs={series.meta.fromMs}
        dataToMs={series.meta.toMs}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <PeriodFilter
        monthKey={monthKey}
        within={within}
        selectedDay={selectedDay}
        windowStart={windowStart}
        customFrom={customFrom}
        customTo={customTo}
        dataFromMs={series.meta.fromMs}
        dataToMs={series.meta.toMs}
        onMonthChange={(month) => {
          const bounds = monthBounds(
            month,
            series.meta.fromMs,
            series.meta.toMs,
          );
          setMonthKey(month);
          setWithin("month");
          setSelectedDay(
            defaultDay(month, series.meta.fromMs, series.meta.toMs),
          );
          setWindowStart(
            defaultWindow(month, series.meta.fromMs, series.meta.toMs, 7),
          );
          setCustomFrom(toDateInputValue(bounds.fromMs));
          setCustomTo(toDateInputValue(bounds.toMs));
        }}
        onWithinChange={(next) => {
          setWithin(next);
          if (next === "1d") {
            setSelectedDay(
              defaultDay(monthKey, series.meta.fromMs, series.meta.toMs),
            );
          }
          if (next === "7d") {
            setWindowStart(
              defaultWindow(monthKey, series.meta.fromMs, series.meta.toMs, 7),
            );
          }
          if (next === "14d") {
            setWindowStart(
              defaultWindow(monthKey, series.meta.fromMs, series.meta.toMs, 14),
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
        <HourlyChart hourly={data.hourlyMean} />
      </Suspense>
      <footer className="footer">
        <span>
          Forrás: Grafana CSV ·{" "}
          <code>
            {data.sensor} {data.metric}
          </code>
        </span>
        <span>
          Nyers adat: <code>/data/pm25-sps30-2026.csv</code>
        </span>
      </footer>
    </div>
  );
}
