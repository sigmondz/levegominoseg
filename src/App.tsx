import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Hero } from "./components/Hero";
import { PeriodFilter } from "./components/PeriodFilter";
import { Stats } from "./components/Stats";
import { useTheme } from "./hooks/useTheme";
import {
  availableTrendGrains,
  buildSummary,
  listDaysInMonth,
  listMonthPresets,
  listWindowsInMonth,
  monthBounds,
  resolveTrendGrain,
  resolveWithinMonth,
  toDateInputValue,
  toMonthKey,
} from "./lib/aggregate";
import type {
  MonthKey,
  SeriesFile,
  TrendGrain,
  WithinMonthScope,
} from "./lib/types";

const DailyChart = lazy(async () => {
  const mod = await import("./components/DailyChart");
  return { default: mod.DailyChart };
});

const HourlyChart = lazy(async () => {
  const mod = await import("./components/HourlyChart");
  return { default: mod.HourlyChart };
});

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
          const month = defaultMonthKey(json.meta.fromMs, json.meta.toMs);
          const bounds = monthBounds(month, json.meta.fromMs, json.meta.toMs);
          setSeries(json);
          setMonthKey(month);
          setWithin("month");
          setSelectedDay(
            defaultDay(month, json.meta.fromMs, json.meta.toMs),
          );
          setWindowStart(
            defaultWindow(month, json.meta.fromMs, json.meta.toMs, 7),
          );
          setCustomFrom(toDateInputValue(bounds.fromMs));
          setCustomTo(toDateInputValue(bounds.toMs));
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

  const availableGrains = useMemo(() => {
    if (!range) return [] as TrendGrain[];
    return availableTrendGrains(range.fromMs, range.toMs);
  }, [range]);

  const data = useMemo(() => {
    if (!series || !range) return null;
    return buildSummary(
      series.points,
      series.meta,
      range.fromMs,
      range.toMs,
      trendGrain,
    );
  }, [series, range, trendGrain]);

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
          intervalMin={series.meta.intervalMin}
          onGrainChange={setTrendGrain}
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
