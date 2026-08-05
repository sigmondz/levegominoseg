import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { TEST_DAILY } from "../test/fixtures";
import {
  belowThresholdFillValue,
  thresholdFillValue,
} from "../lib/simpleChart";
import { SimpleChart } from "./SimpleChart";

const baseProps = {
  daily: TEST_DAILY,
  mean: 27.7,
  metric: "PM2.5",
  unit: "µg/m³",
};

describe("SimpleChart", () => {
  test("egyetlen átlaggörbét és a WHO alatti/feletti satírozást mutatja", () => {
    const { getByRole, getByText, queryByText } = render(
      <SimpleChart {...baseProps} />,
    );

    expect(
      getByRole("heading", { name: "Az átlag alakulása" }),
    ).toBeInTheDocument();
    expect(getByText("Napi átlag")).toBeInTheDocument();
    expect(
      getByText(/A zöld satírozás a WHO 15 µg\/m³ vonala és az átlaggörbe/),
    ).toBeInTheDocument();
    expect(
      getByText(/A vörös satírozás a WHO 15 µg\/m³ vonala és az átlaggörbe/),
    ).toBeInTheDocument();
    expect(queryByText("Max görbe")).toBeNull();
    expect(document.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(document.querySelectorAll(".recharts-area-area").length).toBeGreaterThanOrEqual(1);
    expect(document.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
  });

  test("PM1-nél nem jelenít meg hivatalos küszöbsávot", () => {
    const { getByText, queryByText } = render(
      <SimpleChart {...baseProps} metric="PM1" />,
    );

    expect(
      getByText(
        "Ehhez a mérőszámhoz nincs hivatalos WHO-irányérték, ezért nincs küszöb-satírozás.",
      ),
    ).toBeInTheDocument();
    expect(queryByText(/WHO.*irányértéke/)).toBeNull();
    expect(document.querySelectorAll(".recharts-area-area")).toHaveLength(0);
  });

  test("a kitöltés alapja a WHO-vonal, nem a grafikon alja", () => {
    expect(thresholdFillValue(10, 15)).toBe(15);
    expect(thresholdFillValue(25, 15)).toBe(25);
    expect(thresholdFillValue(25, null)).toBe(0);
    expect(belowThresholdFillValue(10, 15)).toBe(10);
    expect(belowThresholdFillValue(25, 15)).toBe(15);
    expect(belowThresholdFillValue(25, null)).toBe(0);
  });

  test("üres időszaknál jelzi, hogy nincs adat", () => {
    const { getByText } = render(<SimpleChart {...baseProps} daily={[]} />);

    expect(
      getByText("Nincs adat a kiválasztott időszakban."),
    ).toBeInTheDocument();
  });
});
