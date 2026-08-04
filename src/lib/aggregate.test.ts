import { describe, expect, test } from "bun:test";
import {
  availableMaxWindows,
  availableTrendGrains,
  buildSummary,
  defaultParentKey,
  effectivePeriodBounds,
  listDaysInMonth,
  listMonthPresets,
  listMonthsInParent,
  listParentPresets,
  listWindowsInMonth,
  listWindowsInPeriod,
  monthBounds,
  parentBounds,
  resolveMaxWindow,
  resolveTrendGrain,
  resolveWithinMonth,
  resolveWithinPeriod,
  suggestMaxWindow,
  suggestTrendGrain,
  toDateInputValue,
  toMonthKey,
} from "./aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";
import type { PeriodRange } from "./types";

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

  test("listParentPresets Q majd H sorrendben, csak átfedők", () => {
    const parents = listParentPresets(TEST_META.fromMs, TEST_META.toMs);
    expect(parents.map((p) => p.id)).toEqual(["2026-Q1", "2026-H1"]);
    expect(parents[0]!.label).toBe("2026 Q1");
    expect(parents[1]!.label).toBe("2026 H1");
  });

  test("defaultParentKey a default hónap negyedéve", () => {
    expect(defaultParentKey(TEST_META.fromMs, TEST_META.toMs)).toBe("2026-Q1");
  });

  test("parentBounds és effectivePeriodBounds", () => {
    const q1 = parentBounds("2026-Q1", TEST_META.fromMs, TEST_META.toMs);
    expect(toDateInputValue(q1.fromMs)).toBe("2026-01-15");
    expect(toDateInputValue(q1.toMs)).toBe("2026-02-10");

    const full = effectivePeriodBounds(
      "2026-Q1",
      "full",
      TEST_META.fromMs,
      TEST_META.toMs,
    );
    expect(full).toEqual(q1);

    const feb = effectivePeriodBounds(
      "2026-Q1",
      "2026-02",
      TEST_META.fromMs,
      TEST_META.toMs,
    );
    expect(toDateInputValue(feb.fromMs)).toBe("2026-02-01");
    expect(toDateInputValue(feb.toMs)).toBe("2026-02-10");
  });

  test("listMonthsInParent a szülő hónapjait adja", () => {
    const months = listMonthsInParent(
      "2026-Q1",
      TEST_META.fromMs,
      TEST_META.toMs,
    );
    expect(months.map((m) => m.id)).toEqual(["2026-01", "2026-02"]);
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

  test("listWindowsInPeriod: január 31 nap — nincs stub maradék chip", () => {
    const jan: PeriodRange = {
      fromMs: new Date("2024-01-01T00:00:00").getTime(),
      toMs: new Date("2024-01-31T23:59:59").getTime(),
    };

    const weeks = listWindowsInPeriod(jan, 7);
    expect(weeks).toHaveLength(4);
    expect(weeks.map((w) => w.id)).toEqual([
      "2024-01-01",
      "2024-01-08",
      "2024-01-15",
      "2024-01-22",
    ]);
    expect(weeks.map((w) => w.label)).toEqual([
      "01.01.–01.07.",
      "01.08.–01.14.",
      "01.15.–01.21.",
      "01.22.–01.31.",
    ]);
    // Ne legyen 01.29.–01.31. stub
    expect(weeks.some((w) => w.id === "2024-01-29")).toBe(false);

    const twoWeeks = listWindowsInPeriod(jan, 14);
    expect(twoWeeks).toHaveLength(2);
    expect(twoWeeks.map((w) => w.id)).toEqual([
      "2024-01-01",
      "2024-01-15",
    ]);
    expect(twoWeeks.map((w) => w.label)).toEqual([
      "01.01.–01.14.",
      "01.15.–01.31.",
    ]);
    expect(twoWeeks.some((w) => w.id === "2024-01-29")).toBe(false);
  });

  test("listWindowsInPeriod: rövid span egyetlen ablak", () => {
    const short: PeriodRange = {
      fromMs: new Date("2024-01-29T00:00:00").getTime(),
      toMs: new Date("2024-01-31T23:59:59").getTime(),
    };
    expect(listWindowsInPeriod(short, 7)).toEqual([
      { id: "2024-01-29", label: "01.29.–01.31." },
    ]);
    expect(listWindowsInPeriod(short, 14)).toEqual([
      { id: "2024-01-29", label: "01.29.–01.31." },
    ]);
  });

  test("resolveWithinPeriod utolsó hét a hónap végéig tart", () => {
    const jan = {
      fromMs: new Date("2024-01-01T00:00:00").getTime(),
      toMs: new Date("2024-01-31T23:59:59").getTime(),
    };
    const lastWeek = resolveWithinPeriod(jan, "7d", {
      windowStart: "2024-01-22",
    });
    expect(toDateInputValue(lastWeek.fromMs)).toBe("2024-01-22");
    expect(toDateInputValue(lastWeek.toMs)).toBe("2024-01-31");

    const lastTwo = resolveWithinPeriod(jan, "14d", {
      windowStart: "2024-01-15",
    });
    expect(toDateInputValue(lastTwo.fromMs)).toBe("2024-01-15");
    expect(toDateInputValue(lastTwo.toMs)).toBe("2024-01-31");
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

  test("resolveWithinPeriod teljes szülőn", () => {
    const bounds = parentBounds("2026-H1", TEST_META.fromMs, TEST_META.toMs);
    const full = resolveWithinPeriod(bounds, "month");
    expect(toDateInputValue(full.fromMs)).toBe("2026-01-15");
    expect(toDateInputValue(full.toMs)).toBe("2026-02-10");
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
    expect(long).not.toContain("week");
    expect(long).not.toContain("raw");

    const longExt = availableTrendGrains(TEST_META.fromMs, TEST_META.toMs, {
      extended: true,
    });
    expect(longExt).toContain("2d");
    expect(longExt).toContain("week");
    expect(longExt).not.toContain("raw");
  });

  test("resolveTrendGrain visszaállít érvénytelen grain-re", () => {
    const span = TEST_META.fromMs + 20 * 24 * 60 * 60 * 1000;
    expect(resolveTrendGrain(TEST_META.fromMs, span, "raw")).not.toBe("raw");
    expect(resolveTrendGrain(TEST_META.fromMs, span, "day")).toBe("day");
    expect(resolveTrendGrain(TEST_META.fromMs, TEST_META.toMs, "week")).toBe(
      "day",
    );
    expect(
      resolveTrendGrain(TEST_META.fromMs, TEST_META.toMs, "week", {
        extended: true,
      }),
    ).toBe("week");
    expect(
      resolveTrendGrain(TEST_META.fromMs, TEST_META.toMs, "2d", {
        extended: true,
      }),
    ).toBe("2d");
  });

  test("suggestTrendGrain alapértelmezett", () => {
    expect(
      suggestTrendGrain(
        TEST_META.fromMs,
        TEST_META.fromMs + 12 * 60 * 60 * 1000,
      ),
    ).toBe("15m");
    expect(suggestTrendGrain(TEST_META.fromMs, TEST_META.toMs)).toBe("day");
    expect(
      suggestTrendGrain(
        TEST_META.fromMs,
        TEST_META.fromMs + 90 * 24 * 60 * 60 * 1000,
      ),
    ).toBe("day");
    expect(
      suggestTrendGrain(
        TEST_META.fromMs,
        TEST_META.fromMs + 90 * 24 * 60 * 60 * 1000,
        { extended: true },
      ),
    ).toBe("2d");
  });

  test("availableMaxWindows és resolveMaxWindow", () => {
    const dayWindows = availableMaxWindows("day", 3);
    expect(dayWindows.length).toBeGreaterThan(0);
    expect(dayWindows).toContain("3m");
    expect(dayWindows).not.toContain("2h");
    expect(dayWindows).not.toContain("6h");
    expect(dayWindows).not.toContain("day");

    expect(availableMaxWindows("raw", 3)).toEqual([]);
    expect(resolveMaxWindow("raw", 3, "hour")).toBe("3m");
    expect(resolveMaxWindow("day", 3, "hour")).toBe("hour");
  });

  test("suggestMaxWindow a grainhez igazodik", () => {
    // Hónap / napi nézet: 3m túl zajos → 1 óra
    expect(suggestMaxWindow("day", 3)).toBe("hour");
    expect(suggestMaxWindow("hour", 3)).toBe("30m");
    expect(suggestMaxWindow("15m", 3)).toBe("6m");
    expect(suggestMaxWindow("6m", 3)).toBe("3m");

    // Teljes Q/H: hosszabb peak-ablak
    expect(suggestMaxWindow("day", 3, { extended: true })).toBe("6h");
    expect(suggestMaxWindow("2d", 3, { extended: true })).toBe("2h");
    expect(suggestMaxWindow("week", 3, { extended: true })).toBe("day");
    expect(suggestMaxWindow("hour", 3, { extended: true })).toBe("30m");
  });

  test("extended max ablakok csak extended: true esetén", () => {
    const dayExt = availableMaxWindows("day", 3, { extended: true });
    expect(dayExt).toContain("2h");
    expect(dayExt).toContain("6h");
    expect(dayExt).toContain("12h");
    expect(dayExt).not.toContain("day");

    const weekExt = availableMaxWindows("week", 3, { extended: true });
    expect(weekExt).toContain("2h");
    expect(weekExt).toContain("6h");
    expect(weekExt).toContain("12h");
    expect(weekExt).toContain("day");

    expect(resolveMaxWindow("day", 3, "2h")).toBe("hour");
    expect(resolveMaxWindow("day", 3, "12h", { extended: true })).toBe("12h");
    expect(resolveMaxWindow("week", 3, "day", { extended: true })).toBe("day");
    expect(resolveMaxWindow("day", 3, "day", { extended: true })).toBe("6h");
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
