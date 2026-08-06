import { lazy, Suspense } from "react";
import { Hero } from "./components/Hero";
import { MetricFilter } from "./components/MetricFilter";
import { PeriodFilter } from "./components/PeriodFilter";
import { PeriodLead } from "./components/PeriodLead";
import { SimpleChart } from "./components/SimpleChart";
import { SimpleOverview } from "./components/SimpleOverview";
import { Stats } from "./components/Stats";
import { WorstDays } from "./components/WorstDays";
import { useDashboardState } from "./hooks/useDashboardState";
import { useTheme } from "./hooks/useTheme";
import { formatDateTime, toDateInputValue } from "./lib/aggregate";
import { csvPath } from "./lib/aqi";

const DailyChart = lazy(async () => {
  const mod = await import("./components/DailyChart");
  return { default: mod.DailyChart };
});

const HourlyChart = lazy(async () => {
  const mod = await import("./components/HourlyChart");
  return { default: mod.HourlyChart };
});

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const state = useDashboardState();

  if (state.status === "error") {
    return (
      <div className="error" role="alert">
        {state.error}
      </div>
    );
  }

  if (state.status === "loading") {
    return <div className="loading">Adatok betöltése…</div>;
  }

  const {
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
  } = state;

  const dataFrom = toDateInputValue(series.meta.fromMs);
  const lastMeasurement = formatDateTime(series.meta.toMs).slice(0, 16);

  return (
    <div className="app">
      <Hero
        theme={theme}
        onToggleTheme={toggleTheme}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <div className="filter-bar">
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
          onParentChange={handleParentChange}
          onMonthSelectionChange={handleMonthSelectionChange}
          onWithinChange={handleWithinChange}
          onSelectedDayChange={setSelectedDay}
          onWindowStartChange={setWindowStart}
          onCustomFromChange={handleCustomFromChange}
          onCustomToChange={handleCustomToChange}
        />
        <MetricFilter metric={metric} onMetricChange={setMetric} />
        {viewMode === "detailed" ? <PeriodLead data={data} /> : null}
      </div>
      {viewMode === "simple" ? (
        <>
          <SimpleOverview data={data} />
          <SimpleChart
            daily={data.daily}
            mean={data.mean}
            metric={data.metric}
            unit={data.unit}
            exportPoints={filteredPoints}
            exportFromMs={data.fromMs}
            exportToMs={data.toMs}
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
              onSelectDay={handleWorstDaySelect}
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
