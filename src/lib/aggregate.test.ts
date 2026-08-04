import { describe, expect, test } from "bun:test";
import {
  availableMaxWindows,
  availableTrendGrains,
  buildSummary,
  listDaysInMonth,
  listMonthPresets,
  listWindowsInMonth,
  monthBounds,
  resolveMaxWindow,
  resolveTrendGrain,
  resolveWithinMonth,
  suggestTrendGrain,
  toDateInputValue,
  toMonthKey,
} from "./aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";

describe("aggregate", () => {
  test("toMonthKey és toDateInputValue", () => {
    expect(toMonthKey(2026, 1)).toBe("2026-01");
    expect(toMonthKey(2026, 12)).toBe("2026-12");
    expect(toDateInputValue(TEST_META.fromMs)).toBe("2026-01-15");
  });

  test("listMonthPresets a tartomány hónapjait adja", () => {
    const months = listMonthPresets(TEST_META.fromMs, TEST_META.toMs);
    expect(months.length).toBeGreaterThanOrEqual(2);
    expect(months.some((m) => m.id === "2026-01")).toBe(true);
    expect(months.some((m) => m.id === "2026-02")).toBe(true);
  });

  test("monthBounds levágja az adathoz", () => {
    const bounds = monthBounds("2026-01", TEST_META.fromMs, TEST_META.toMs);
    expect(toDateInputValue(bounds.fromMs)).toBe("2026-01-15");
    expect(toDateInputValue(bounds.toMs)).toBe("2026-01-31");
  });

  test("listDaysInMonth nap chip-eket ad", () => {
    const days = listDaysInMonth("2026-01", TEST_META.fromMs, TEST_META.toMs);
    expect(days.length).toBe(17);
    expect(days[0]!.id).toBe("2026-01-15");
    expect(days.at(-1)!.id).toBe("2026-01-31");
  });

  test("listWindowsInMonth 7 napos ablakok", () => {
    const windows = listWindowsInMonth(
      "2026-01",
      TEST_META.fromMs,
      TEST_META.toMs,
      7,
    );
    expect(windows.length).toBeGreaterThan(0);
    expect(windows[0]!.id).toBe("2026-01-15");
  });

  test("resolveWithinMonth scope-ok", () => {
    const month = "2026-01" as const;
    const full = resolveWithinMonth(
      month,
      "month",
      TEST_META.fromMs,
      TEST_META.toMs,
    );
    expect(toDateInputValue(full.fromMs)).toBe("2026-01-15");

    const oneDay = resolveWithinMonth(
      month,
      "1d",
      TEST_META.fromMs,
      TEST_META.toMs,
      { selectedDay: "2026-01-20" },
    );
    expect(toDateInputValue(oneDay.fromMs)).toBe("2026-01-20");
    expect(toDateInputValue(oneDay.toMs)).toBe("2026-01-20");

    const custom = resolveWithinMonth(
      month,
      "custom",
      TEST_META.fromMs,
      TEST_META.toMs,
      { customFrom: "2026-01-18", customTo: "2026-01-22" },
    );
    expect(toDateInputValue(custom.fromMs)).toBe("2026-01-18");
    expect(toDateInputValue(custom.toMs)).toBe("2026-01-22");
  });

  test("availableTrendGrains span alapján", () => {
    const short = availableTrendGrains(
      TEST_META.fromMs,
      TEST_META.fromMs + 24 * 60 * 60 * 1000,
    );
    expect(short).toContain("raw");
    expect(short).toContain("hour");

    const long = availableTrendGrains(TEST_META.fromMs, TEST_META.toMs);
    expect(long).toContain("day");
    expect(long).not.toContain("raw");
  });

  test("resolveTrendGrain visszaállít érvénytelen grain-re", () => {
    const span = TEST_META.fromMs + 20 * 24 * 60 * 60 * 1000;
    expect(resolveTrendGrain(TEST_META.fromMs, span, "raw")).not.toBe("raw");
    expect(resolveTrendGrain(TEST_META.fromMs, span, "day")).toBe("day");
  });

  test("suggestTrendGrain alapértelmezett", () => {
    expect(
      suggestTrendGrain(
        TEST_META.fromMs,
        TEST_META.fromMs + 12 * 60 * 60 * 1000,
      ),
    ).toBe("15m");
    expect(suggestTrendGrain(TEST_META.fromMs, TEST_META.toMs)).toBe("day");
  });

  test("availableMaxWindows és resolveMaxWindow", () => {
    const dayWindows = availableMaxWindows("day", 3);
    expect(dayWindows.length).toBeGreaterThan(0);
    expect(dayWindows).toContain("3m");

    expect(availableMaxWindows("raw", 3)).toEqual([]);
    expect(resolveMaxWindow("raw", 3, "hour")).toBe("3m");
    expect(resolveMaxWindow("day", 3, "hour")).toBe("hour");
  });

  test("buildSummary statisztikák és trend", () => {
    const summary = buildSummary(
      TEST_POINTS,
      TEST_META,
      TEST_META.fromMs,
      TEST_META.fromMs + 2 * 24 * 60 * 60 * 1000,
      "day",
      "3m",
    );

    expect(summary.valid).toBeGreaterThan(0);
    expect(summary.mean).toBeGreaterThan(0);
    expect(summary.daily.length).toBeGreaterThan(0);
    expect(summary.hourlyMean.length).toBeGreaterThan(0);
    expect(summary.trend.length).toBeGreaterThan(0);
    expect(summary.trendGrain).toBe("day");
    expect(summary.daysTotal).toBe(3);
    expect(summary.daysAboveWho).toBeGreaterThanOrEqual(0);
    expect(summary.daysAboveWho).toBeLessThanOrEqual(summary.daysTotal);
  });

  test("buildSummary egy napos tartomány daysTotal", () => {
    const summary = buildSummary(
      TEST_POINTS,
      TEST_META,
      TEST_META.fromMs,
      TEST_META.fromMs + 12 * 60 * 60 * 1000,
      "hour",
      "3m",
    );
    expect(summary.daysTotal).toBe(1);
  });

  test("buildSummary üres tartomány", () => {
    const summary = buildSummary(
      TEST_POINTS,
      TEST_META,
      TEST_META.toMs + 1_000_000,
      TEST_META.toMs + 2_000_000,
      "day",
      "3m",
    );
    expect(summary.valid).toBe(0);
    expect(summary.mean).toBe(0);
    expect(summary.trend).toEqual([]);
  });

  test("buildSummary aboveWhoPct PM2.5-nél a 15-ös küszöbbel egyezik", () => {
    const summary = buildSummary(
      TEST_POINTS,
      TEST_META,
      TEST_META.fromMs,
      TEST_META.fromMs + 2 * 24 * 60 * 60 * 1000,
      "day",
      "3m",
    );
    expect(summary.aboveWhoPct).toBe(summary.above15pct);
    expect(summary.daysAboveWho).toBeGreaterThan(0);
  });

  test("buildSummary PM10 WHO 45 küszöböt használ", () => {
    const fromMs = TEST_META.fromMs;
    const toMs = TEST_META.fromMs + 2 * 24 * 60 * 60 * 1000;
    const summary = buildSummary(
      TEST_POINTS,
      { ...TEST_META, metric: "PM10" },
      fromMs,
      toMs,
      "day",
      "3m",
    );
    const vals = TEST_POINTS.filter(([t]) => t >= fromMs && t <= toMs).map(
      ([, v]) => v,
    );
    const expectedPct = Number(
      ((100 * vals.filter((v) => v >= 45).length) / vals.length).toFixed(1),
    );
    expect(summary.aboveWhoPct).toBe(expectedPct);
    expect(summary.aboveWhoPct).toBeLessThan(summary.above15pct);
    expect(summary.daysAboveWho).toBe(
      summary.daily.filter((d) => d.mean >= 45).length,
    );
  });

  test("buildSummary PM1-nél nincs WHO statisztika", () => {
    const summary = buildSummary(
      TEST_POINTS,
      { ...TEST_META, metric: "PM1" },
      TEST_META.fromMs,
      TEST_META.fromMs + 2 * 24 * 60 * 60 * 1000,
      "day",
      "3m",
    );
    expect(summary.aboveWhoPct).toBe(0);
    expect(summary.daysAboveWho).toBe(0);
    expect(summary.above15pct).toBeGreaterThan(0);
  });
});
