import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { buildSummary } from "../lib/aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";
import { PeriodLead } from "./PeriodLead";

const summary = buildSummary(
  TEST_POINTS,
  TEST_META,
  TEST_META.fromMs,
  TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
  "day",
  "3m",
);

describe("PeriodLead", () => {
  test("megjeleníti az időszakos összefoglalót a WHO-értékkel", () => {
    const { container } = render(<PeriodLead data={summary} />);

    expect(container.textContent).toContain(
      "A PM2.5 adatok helyi szenzorból származnak",
    );
    expect(container.textContent).toContain("WHO irányértékhez (15 µg/m³)");
    expect(container.querySelector(".period-lead")).toBeInTheDocument();
  });
});
