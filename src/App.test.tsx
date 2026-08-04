import { describe, expect, mock, test, beforeEach, afterEach } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { TEST_SERIES } from "./test/fixtures";

describe("App", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (
        url.includes("/data/series-pm25.json") ||
        url.includes("/data/series-pm1.json") ||
        url.includes("/data/series-pm10.json") ||
        url.includes("/data/series.json")
      ) {
        const metric = url.includes("pm1")
          ? "PM1"
          : url.includes("pm10")
            ? "PM10"
            : "PM2.5";
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

  test("adatsor váltó PM10-re vált", async () => {
    const user = userEvent.setup();
    const { findByRole, findByText } = render(<App />);

    await findByText("Levegőminőség Nagymaroson");
    const pm10 = await findByRole("button", { name: "PM10" });
    await user.click(pm10);

    await waitFor(() => {
      expect(window.location.search).toContain("metric=pm10");
    });
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
