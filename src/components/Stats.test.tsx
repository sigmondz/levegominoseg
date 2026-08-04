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
    expect(getByText("WHO érték felett")).toBeInTheDocument();
    expect(
      getByText((_, el) => {
        return (
          el?.classList.contains("stat-value") === true &&
          el.textContent === `${summary.daysAboveWho}/${summary.daysTotal}nap`
        );
      }),
    ).toBeInTheDocument();
  });

  test("egynapos tartománynál nincs WHO feletti napok kártya", () => {
    const oneDay = buildSummary(
      TEST_POINTS,
      TEST_META,
      TEST_META.fromMs,
      TEST_META.fromMs + 12 * 60 * 60 * 1000,
      "hour",
      "3m",
    );
    const { queryByText } = render(<Stats data={oneDay} />);
    expect(queryByText("WHO érték felett")).toBeNull();
  });

  test("PM1-nél nincs WHO feletti kártya", () => {
    const pm1 = buildSummary(
      TEST_POINTS,
      { ...TEST_META, metric: "PM1" },
      TEST_META.fromMs,
      TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
      "day",
      "3m",
    );
    const { queryByText, getByText } = render(<Stats data={pm1} />);
    expect(queryByText("WHO érték felett")).toBeNull();
    expect(getByText("nincs hivatalos WHO irányérték")).toBeInTheDocument();
  });

  test("PM10-nél WHO 45 jelenik meg", () => {
    const pm10 = buildSummary(
      TEST_POINTS,
      { ...TEST_META, metric: "PM10" },
      TEST_META.fromMs,
      TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
      "day",
      "3m",
    );
    const { getByText } = render(<Stats data={pm10} />);
    expect(getByText(`${pm10.aboveWhoPct}% a WHO 45 felett`)).toBeInTheDocument();
    expect(getByText("WHO érték felett")).toBeInTheDocument();
  });
});
