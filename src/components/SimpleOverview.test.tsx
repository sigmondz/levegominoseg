import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { buildSummary } from "../lib/aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";
import { SimpleOverview } from "./SimpleOverview";

const baseSummary = buildSummary(
  TEST_POINTS,
  TEST_META,
  TEST_META.fromMs,
  TEST_META.fromMs + 5 * 24 * 60 * 60 * 1000,
  "day",
  "3m",
);

describe("SimpleOverview", () => {
  test("szövegesen kiemeli az időszak minősítését", () => {
    const summary = { ...baseSummary, mean: 10, valid: 10 };
    const { getByRole, getByText, container } = render(
      <SimpleOverview data={summary} />,
    );

    expect(getByRole("heading", { name: "Jó" })).toBeInTheDocument();
    expect(getByText("Időszakos átlag")).toBeInTheDocument();
    expect(container.textContent).toContain(
      "A PM2.5 időszakos átlaga jó a WHO 15 µg/m³ irányértékéhez képest.",
    );
    expect(container.textContent).not.toContain("nem élő adatot mutat");
    const whoReference = container.querySelector(".who-reference");
    expect(whoReference).toHaveTextContent(
      "WHO 15 µg/m³ irányértékéhez",
    );
    expect(whoReference?.tagName).toBe("STRONG");
  });

  test("PM1 esetén is közérthető minősítést ad", () => {
    const summary = {
      ...baseSummary,
      metric: "PM1",
      mean: 10,
      valid: 10,
    };
    const { container } = render(<SimpleOverview data={summary} />);

    expect(container.textContent).toContain("A kiválasztott időszakban");
  });

  test("PM10-nél a WHO 45-ös irányérték félkövér", () => {
    const summary = {
      ...baseSummary,
      metric: "PM10",
      mean: 50,
      valid: 10,
    };
    const { container } = render(<SimpleOverview data={summary} />);
    const whoReference = container.querySelector(".who-reference");

    expect(whoReference).toHaveTextContent(
      "WHO 45 µg/m³ irányértékéhez",
    );
    expect(whoReference?.tagName).toBe("STRONG");
  });

  test("mérési adat nélkül nem ad félrevezető jó minősítést", () => {
    const summary = { ...baseSummary, mean: 0, valid: 0 };
    const { getByRole, queryByRole } = render(
      <SimpleOverview data={summary} />,
    );

    expect(getByRole("heading", { name: "Nincs mérési adat" })).toBeInTheDocument();
    expect(queryByRole("heading", { name: "Jó" })).toBeNull();
  });
});
