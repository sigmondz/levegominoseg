import { describe, expect, test } from "bun:test";
import {
  buildDefaultViewState,
  buildSearchParams,
  parseViewState,
} from "./urlState";
import { TEST_META } from "../test/fixtures";

describe("urlState", () => {
  const defaults = buildDefaultViewState(TEST_META);

  test("buildDefaultViewState ésszerű alapértékek", () => {
    expect(defaults.within).toBe("month");
    expect(defaults.trendGrain).toBe("day");
    expect(defaults.maxWindow).toBe("3m");
    expect(defaults.metric).toBe("PM2.5");
    expect(defaults.monthKey).toMatch(/^\d{4}-\d{2}$/);
  });

  test("parseViewState üres URL → default", () => {
    const view = parseViewState("", TEST_META, defaults);
    expect(view.monthKey).toBe(defaults.monthKey);
    expect(view.within).toBe("month");
    expect(view.trendGrain).toBe("day");
    expect(view.metric).toBe("PM2.5");
  });

  test("parseViewState hónap és scope paraméterek", () => {
    const view = parseViewState(
      "?h=2026-02&w=1d&d=2026-02-05&g=hour&m=15m",
      TEST_META,
      defaults,
    );
    expect(view.monthKey).toBe("2026-02");
    expect(view.within).toBe("1d");
    expect(view.selectedDay).toBe("2026-02-05");
    expect(view.trendGrain).toBe("hour");
    expect(view.maxWindow).toBe("15m");
  });

  test("parseViewState metric paraméter", () => {
    const view = parseViewState("?metric=pm10", TEST_META, defaults);
    expect(view.metric).toBe("PM10");

    const pm1 = parseViewState("?metric=pm1", TEST_META, defaults);
    expect(pm1.metric).toBe("PM1");

    const invalid = parseViewState("?metric=pm99", TEST_META, defaults);
    expect(invalid.metric).toBe("PM2.5");
  });

  test("parseViewState custom tartomány", () => {
    const view = parseViewState(
      "?h=2026-01&w=custom&from=2026-01-18&to=2026-01-22",
      TEST_META,
      defaults,
    );
    expect(view.within).toBe("custom");
    expect(view.customFrom).toBe("2026-01-18");
    expect(view.customTo).toBe("2026-01-22");
  });

  test("parseViewState érvénytelen paramétereket figyelmen kívül hagyja", () => {
    const view = parseViewState(
      "?h=1999-01&w=invalid&g=invalid&m=invalid",
      TEST_META,
      defaults,
    );
    expect(view.monthKey).toBe(defaults.monthKey);
    expect(view.within).toBe("month");
  });

  test("buildSearchParams csak a defaulttól eltérőket írja", () => {
    const params = buildSearchParams(defaults, defaults);
    expect(params.toString()).toBe("");

    const custom = {
      ...defaults,
      metric: "PM1" as const,
      monthKey: "2026-02" as const,
      within: "7d" as const,
      windowStart: "2026-02-01",
      trendGrain: "hour" as const,
      maxWindow: "15m" as const,
    };
    const built = buildSearchParams(custom, defaults);
    expect(built.get("metric")).toBe("pm1");
    expect(built.get("h")).toBe("2026-02");
    expect(built.get("w")).toBe("7d");
    expect(built.get("d")).toBe("2026-02-01");
    expect(built.get("g")).toBe("hour");
    expect(built.get("m")).toBe("15m");
  });
});
