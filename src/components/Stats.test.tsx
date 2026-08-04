import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Stats } from "./Stats";
import { buildSummary } from "../lib/aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";

const summary = buildSummary(
  TEST_POINTS,
  TEST_META,
  TEST_META.fromMs,
  TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
  "day",
  "3m",
);

describe("Stats", () => {
  test("összefoglaló statisztikák megjelennek", () => {
    const { getByText } = render(<Stats data={summary} />);

    expect(getByText("A kiválasztott időszak számokban")).toBeInTheDocument();
    expect(getByText("Átlag")).toBeInTheDocument();
    expect(getByText("Medián")).toBeInTheDocument();
    expect(getByText("Maximum")).toBeInTheDocument();
    expect(getByText("≥ 80 µg/m³")).toBeInTheDocument();
    expect(getByText(`${summary.mean.toFixed(1)}`)).toBeInTheDocument();
  });
});
