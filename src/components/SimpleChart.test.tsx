import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TEST_DAILY, TEST_POINTS } from "../test/fixtures";
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
  exportPoints: TEST_POINTS.slice(0, 10),
  exportFromMs: TEST_DAILY[0] ? Date.parse(`${TEST_DAILY[0].date}T00:00:00`) : 0,
  exportToMs: TEST_DAILY.at(-1)
    ? Date.parse(`${TEST_DAILY.at(-1)!.date}T23:59:00`)
    : 0,
};

describe("SimpleChart", () => {
  test("egyetlen átlaggörbét és a WHO alatti/feletti satírozást mutatja", () => {
    const { getByRole, getByText } = render(<SimpleChart {...baseProps} />);

    expect(
      getByRole("heading", { name: "Az átlag alakulása" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Miről szól ez a grafikon?" }),
    ).toBeInTheDocument();
    expect(
      getByText("Naponta egy pont mutatja a mért értékek átlagát."),
    ).toBeInTheDocument();
    expect(getByText("Napi átlag")).toBeInTheDocument();
    expect(
      getByText(/A zöld satírozás a WHO 15 µg\/m³ vonala és az átlaggörbe/),
    ).toBeInTheDocument();
    expect(
      getByText(/A vörös satírozás a WHO 15 µg\/m³ vonala és az átlaggörbe/),
    ).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(document.querySelectorAll(".recharts-area-area").length).toBeGreaterThanOrEqual(1);
    expect(document.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
  });

  test("max görbe alapból ki van kapcsolva, és bekapcsolható", async () => {
    const user = userEvent.setup();
    const { getByRole, container } = render(<SimpleChart {...baseProps} />);

    const toggle = getByRole("button", { name: "Max görbe" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(1);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);
  });

  test("CSV és link gombok megjelennek", () => {
    const { getByRole } = render(<SimpleChart {...baseProps} />);

    expect(getByRole("button", { name: "CSV letöltés" })).not.toBeDisabled();
    expect(getByRole("button", { name: "Link másolása" })).toBeInTheDocument();
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

  test("a kitöltés a WHO-vonalhoz van clampelve, folytonos Area-hoz", () => {
    expect(thresholdFillValue(10, 15)).toBe(15);
    expect(thresholdFillValue(25, 15)).toBe(25);
    expect(thresholdFillValue(25, null)).toBe(0);
    expect(belowThresholdFillValue(10, 15)).toBe(10);
    expect(belowThresholdFillValue(25, 15)).toBe(15);
    expect(belowThresholdFillValue(25, null)).toBe(0);
  });

  test("üres időszaknál jelzi, hogy nincs adat", () => {
    const { getByText, getByRole } = render(
      <SimpleChart {...baseProps} daily={[]} exportPoints={[]} />,
    );

    expect(
      getByText("Nincs adat a kiválasztott időszakban."),
    ).toBeInTheDocument();
    expect(getByRole("button", { name: "CSV letöltés" })).toBeDisabled();
  });
});
