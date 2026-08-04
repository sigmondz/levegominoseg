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
    const { getByText, getAllByText } = render(<Stats data={summary} />);

    expect(getByText("A kiválasztott időszak számokban")).toBeInTheDocument();
    expect(getByText("Átlag")).toBeInTheDocument();
    expect(getByText("Medián")).toBeInTheDocument();
    expect(getByText("Maximum")).toBeInTheDocument();
    expect(getByText("≥ 80 µg/m³")).toBeInTheDocument();
    expect(getByText(`${summary.mean.toFixed(1)}`)).toBeInTheDocument();
    expect(
      getAllByText((_, el) =>
        el?.classList.contains("stat-who-threshold") === true &&
        (el.textContent?.trim().startsWith("15") ?? false),
      ),
    ).toHaveLength(2);
    expect(getByText("WHO érték felett")).toBeInTheDocument();
    expect(document.querySelector(".stat--featured")).toBeTruthy();
    expect(
      getByText((_, el) => {
        return (
          el?.classList.contains("stat-value") === true &&
          el.textContent === `${summary.daysAboveWho}/${summary.daysTotal}nap`
        );
      }),
    ).toBeInTheDocument();
    const cards = document.querySelectorAll(".stat");
    expect(cards[0]?.textContent).toContain("WHO érték felett");
  });

  test("0% a 80 felett zöld, nem piros", () => {
    const clean = {
      ...summary,
      above80pct: 0,
      max: 10,
      mean: 5,
      p50: 4,
      aboveWhoPct: 0,
      daysAboveWho: 0,
    };
    const { getByText } = render(<Stats data={clean} />);
    const label = getByText("≥ 80 µg/m³");
    const card = label.closest(".stat");
    expect(card?.querySelector(".tone-good")).toBeTruthy();
    expect(card?.querySelector(".tone-bad")).toBeNull();
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
    const { getByText, getAllByText } = render(<Stats data={pm10} />);
    expect(getByText(`${pm10.aboveWhoPct}% a WHO 45 felett`)).toBeInTheDocument();
    expect(
      getAllByText((_, el) =>
        el?.classList.contains("stat-who-threshold") === true &&
        (el.textContent?.trim().startsWith("45") ?? false),
      ),
    ).toHaveLength(2);
    expect(getByText("WHO érték felett")).toBeInTheDocument();
  });
});
