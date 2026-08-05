import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { HourlyChart } from "./HourlyChart";
import { buildSummary } from "../lib/aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";

const summary = buildSummary(
  TEST_POINTS,
  TEST_META,
  TEST_META.fromMs,
  TEST_META.fromMs + 3 * 24 * 60 * 60 * 1000,
  "day",
  "3m",
);

const baseProps = {
  hourly: summary.hourlyMean,
  mean: summary.mean,
  metric: "PM2.5",
  intervalMin: 3,
};

describe("HourlyChart", () => {
  test("grafikon, görbe- és határérték-jelmagyarázat megjelenik", () => {
    const { getByText, getByRole, queryByText } = render(
      <HourlyChart {...baseProps} />,
    );

    expect(getByText("Óránkénti profil")).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(document.querySelector(".recharts-line")).toBeTruthy();
    expect(getByText("Óránkénti átlag")).toBeInTheDocument();
    expect(getByText("WHO irányérték alatti rész")).toBeInTheDocument();
    expect(getByText("WHO irányérték feletti rész")).toBeInTheDocument();
    expect(getByText("WHO 24 órás irányérték")).toBeInTheDocument();
    expect(getByText("15 µg/m³")).toBeInTheDocument();
    expect(getByText("Kiválasztott időszak átlaga")).toBeInTheDocument();
    expect(queryByText("Magas szennyezettségi küszöb")).toBeNull();
    expect(queryByText("80 µg/m³")).toBeNull();
    expect(
      getByRole("button", { name: "Mi az óránkénti átlag görbe?" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mit jelöl a zöld satírozás?" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mit jelöl a vörös satírozás?" }),
    ).toBeInTheDocument();
  });

  test("PM1-nél nincs WHO irányérték", () => {
    const { queryByText } = render(
      <HourlyChart {...baseProps} metric="PM1" />,
    );
    expect(queryByText("WHO 24 órás irányérték")).toBeNull();
    expect(queryByText("WHO irányérték alatti rész")).toBeNull();
    expect(queryByText("WHO irányérték feletti rész")).toBeNull();
    expect(queryByText("Magas szennyezettségi küszöb")).toBeNull();
  });

  test("üres adat esetén üzenet", () => {
    const { getByText } = render(<HourlyChart {...baseProps} hourly={[]} />);

    expect(
      getByText("Nincs adat a kiválasztott időszakban."),
    ).toBeInTheDocument();
  });
});
