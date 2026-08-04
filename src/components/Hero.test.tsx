import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";
import { Hero } from "./Hero";
import { buildSummary } from "../lib/aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";

const baseSummary = buildSummary(
  TEST_POINTS,
  TEST_META,
  TEST_META.fromMs,
  TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
  "day",
  "3m",
);

describe("Hero", () => {
  test("PM2.5 szöveg és WHO 15", () => {
    const { getByText, container } = render(
      <Hero
        data={baseSummary}
        dataFromMs={TEST_META.fromMs}
        dataToMs={TEST_META.toMs}
        theme="dark"
        onToggleTheme={() => {}}
      />,
    );

    expect(getByText("Levegőminőség Nagymaroson")).toBeInTheDocument();
    expect(container.textContent).toContain(
      "PM2.5 a helyi SPS30 szenzorból",
    );
    expect(container.textContent).toContain("15 µg/m³");
  });

  test("PM10 szöveg és WHO 45", () => {
    const pm10 = buildSummary(
      TEST_POINTS,
      { ...TEST_META, metric: "PM10" },
      TEST_META.fromMs,
      TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
      "day",
      "3m",
    );
    const { container } = render(
      <Hero
        data={pm10}
        dataFromMs={TEST_META.fromMs}
        dataToMs={TEST_META.toMs}
        theme="dark"
        onToggleTheme={mock(() => {})}
      />,
    );

    expect(container.textContent).toContain("PM10 a helyi SPS30 szenzorból");
    expect(container.textContent).toContain("45 µg/m³");
  });

  test("PM1-nél nincs WHO irányérték szöveg", () => {
    const pm1 = buildSummary(
      TEST_POINTS,
      { ...TEST_META, metric: "PM1" },
      TEST_META.fromMs,
      TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
      "day",
      "3m",
    );
    const { container, queryByText } = render(
      <Hero
        data={pm1}
        dataFromMs={TEST_META.fromMs}
        dataToMs={TEST_META.toMs}
        theme="light"
        onToggleTheme={() => {}}
      />,
    );

    expect(container.textContent).toContain(
      "a PM1-re nincs hivatalos WHO 24 órás irányérték",
    );
    expect(queryByText(/WHO 24 órás irányértékhez/)).toBeNull();
  });
});
