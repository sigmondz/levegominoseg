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
    expect(defaults.maxWindow).toBe("6h");
    expect(defaults.metric).toBe("PM2.5");
    expect(defaults.parentKey).toBe("2026-Q1");
    expect(defaults.monthSelection).toBe("full");
  });

  test("parseViewState üres URL → default", () => {
    const view = parseViewState("", TEST_META, defaults);
    expect(view.parentKey).toBe(defaults.parentKey);
    expect(view.monthSelection).toBe("full");
    expect(view.within).toBe("month");
    expect(view.trendGrain).toBe("day");
    expect(view.maxWindow).toBe("6h");
    expect(view.metric).toBe("PM2.5");
  });

  test("parseViewState hónapnézet max ablak nem 3m", () => {
    const view = parseViewState("?h=2026-02", TEST_META, defaults);
    expect(view.monthSelection).toBe("2026-02");
    // ~10 napos hónapdarab → 2h grain, max ablak 1 óra (nem nyers 3m)
    expect(view.trendGrain).toBe("2h");
    expect(view.maxWindow).toBe("hour");
  });

  test("parseViewState legacy hónap paraméter", () => {
    const view = parseViewState(
      "?h=2026-02&w=1d&d=2026-02-05&g=hour&m=15m",
      TEST_META,
      defaults,
    );
    expect(view.parentKey).toBe("2026-Q1");
    expect(view.monthSelection).toBe("2026-02");
    expect(view.within).toBe("1d");
    expect(view.selectedDay).toBe("2026-02-05");
    expect(view.trendGrain).toBe("hour");
    expect(view.maxWindow).toBe("15m");
  });

  test("parseViewState szülő Q/H kulcs", () => {
    const view = parseViewState("?h=2026-H1", TEST_META, defaults);
    expect(view.parentKey).toBe("2026-H1");
    expect(view.monthSelection).toBe("full");
  });

  test("parseViewState szülő + hónap", () => {
    const view = parseViewState(
      "?h=2026-H1&hm=2026-02",
      TEST_META,
      defaults,
    );
    expect(view.parentKey).toBe("2026-H1");
    expect(view.monthSelection).toBe("2026-02");
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
    expect(view.monthSelection).toBe("2026-01");
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
    expect(view.parentKey).toBe(defaults.parentKey);
    expect(view.monthSelection).toBe(defaults.monthSelection);
    expect(view.within).toBe("month");
  });

  test("buildSearchParams csak a defaulttól eltérőket írja", () => {
    const params = buildSearchParams(defaults, defaults);
    expect(params.toString()).toBe("");

    const custom = {
      ...defaults,
      metric: "PM1" as const,
      monthSelection: "2026-02" as const,
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

  test("buildSearchParams H1 szülő", () => {
    const custom = {
      ...defaults,
      parentKey: "2026-H1" as const,
      monthSelection: "full" as const,
    };
    const built = buildSearchParams(custom, defaults);
    expect(built.get("h")).toBe("2026-H1");
    expect(built.get("hm")).toBeNull();
  });
});
