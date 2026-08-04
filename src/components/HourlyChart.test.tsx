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

describe("HourlyChart", () => {
  test("grafikon megjelenik adattal", () => {
    const { getByText } = render(<HourlyChart hourly={summary.hourlyMean} />);

    expect(getByText("Óránkénti profil")).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(document.querySelector(".recharts-area")).toBeTruthy();
  });

  test("üres adat esetén üzenet", () => {
    const { getByText } = render(<HourlyChart hourly={[]} />);

    expect(
      getByText("Nincs adat a kiválasztott időszakban."),
    ).toBeInTheDocument();
  });
});
