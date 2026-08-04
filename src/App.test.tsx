import { describe, expect, mock, test, beforeEach, afterEach } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { TEST_SERIES } from "./test/fixtures";

function metricFromSeriesUrl(url: string): string {
  if (url.includes("series-pm10")) return "PM10";
  if (url.includes("series-pm1")) return "PM1";
  return "PM2.5";
}

function isSeriesUrl(url: string): boolean {
  return (
    url.includes("/data/series-pm25.json") ||
    url.includes("/data/series-pm1.json") ||
    url.includes("/data/series-pm10.json") ||
    url.includes("/data/series.json")
  );
}

describe("App", () => {
  let originalFetch: typeof fetch;
  let seriesFetchCount: Map<string, number>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    seriesFetchCount = new Map();
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (isSeriesUrl(url)) {
        const metric = metricFromSeriesUrl(url);
        seriesFetchCount.set(metric, (seriesFetchCount.get(metric) ?? 0) + 1);
        return new Response(
          JSON.stringify({
            ...TEST_SERIES,
            meta: { ...TEST_SERIES.meta, metric },
          }),
          { status: 200 },
        );
      }
      return originalFetch(input);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("betölti az adatokat és megjeleníti a fő elemeket", async () => {
    const { getByText, findByText } = render(<App />);

    expect(await findByText("Levegőminőség Nagymaroson")).toBeInTheDocument();
    expect(getByText("Adatsor")).toBeInTheDocument();
    expect(getByText("Időszak")).toBeInTheDocument();
    expect(
      getByText("A kiválasztott időszak számokban"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(document.querySelector(".recharts-responsive-container")).toBeTruthy();
    });
  });

  test("URL metric=pm1-ről indul", async () => {
    window.history.replaceState(null, "", "/?metric=pm1");
    const { findByRole, findByText } = render(<App />);

    await findByText("Levegőminőség Nagymaroson");
    expect(await findByRole("button", { name: "PM1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() => {
      expect(seriesFetchCount.get("PM1")).toBe(1);
      expect(seriesFetchCount.get("PM2.5") ?? 0).toBe(0);
    });
  });

  test("adatsor váltó PM10-re vált", async () => {
    const user = userEvent.setup();
    const { findByRole, findByText } = render(<App />);

    await findByText("Levegőminőség Nagymaroson");
    const pm10 = await findByRole("button", { name: "PM10" });
    await user.click(pm10);

    await waitFor(() => {
      expect(window.location.search).toContain("metric=pm10");
    });
    expect(await findByRole("button", { name: "PM10" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("vissza-váltáskor a cache miatt nincs újabb fetch", async () => {
    const user = userEvent.setup();
    const { findByRole, findByText } = render(<App />);

    await findByText("Levegőminőség Nagymaroson");
    await waitFor(() => {
      expect(seriesFetchCount.get("PM2.5")).toBe(1);
    });

    await user.click(await findByRole("button", { name: "PM10" }));
    await waitFor(() => {
      expect(seriesFetchCount.get("PM10")).toBe(1);
      expect(window.location.search).toContain("metric=pm10");
    });

    await user.click(await findByRole("button", { name: "PM2.5" }));
    await waitFor(() => {
      expect(window.location.search).not.toContain("metric=");
    });
    expect(seriesFetchCount.get("PM2.5")).toBe(1);
    expect(seriesFetchCount.get("PM10")).toBe(1);
  });

  test("téma váltó gomb működik", async () => {
    const user = userEvent.setup();
    const { findByRole } = render(<App />);

    const themeSwitch = await findByRole("switch");
    const initialTheme = document.documentElement.getAttribute("data-theme");

    await user.click(themeSwitch);

    await waitFor(() => {
      const nextTheme = document.documentElement.getAttribute("data-theme");
      expect(nextTheme).not.toBe(initialTheme);
    });
  });

  test("hibaüzenet ha az adat nem tölthető be", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(null, { status: 500 });
    }) as unknown as typeof fetch;

    const { findByRole } = render(<App />);

    const alert = await findByRole("alert");
    expect(alert).toHaveTextContent(/Nem sikerült betölteni az adatot/i);
  });
});
