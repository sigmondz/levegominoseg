import { describe, expect, mock, test } from "bun:test";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DailyChart } from "./DailyChart";
import { buildSummary } from "../lib/aggregate";
import { TEST_META, TEST_POINTS } from "../test/fixtures";

const summary = buildSummary(
  TEST_POINTS,
  TEST_META,
  TEST_META.fromMs,
  TEST_META.fromMs + 7 * 24 * 60 * 60 * 1000,
  "day",
  "3m",
);

describe("DailyChart", () => {
  test("grafikon és legendák megjelennek", () => {
    const { getByText } = render(
      <DailyChart
        trend={summary.trend}
        mean={summary.mean}
        grain="day"
        availableGrains={["hour", "day"]}
        maxWindow="3m"
        availableMaxWindows={["3m", "6m"]}
        intervalMin={3}
        exportPoints={TEST_POINTS.slice(0, 10)}
        exportFromMs={summary.fromMs}
        exportToMs={summary.toMs}
        onGrainChange={() => {}}
        onMaxWindowChange={() => {}}
      />,
    );

    expect(getByText("Napi átlag és csúcs")).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(getByText(/WHO 24 órás irányérték/)).toBeInTheDocument();
  });

  test("adatsűrűség gombok váltanak", async () => {
    const user = userEvent.setup();
    const onGrainChange = mock(() => {});

    const { getByRole } = render(
      <DailyChart
        trend={summary.trend}
        mean={summary.mean}
        grain="day"
        availableGrains={["hour", "day"]}
        maxWindow="3m"
        availableMaxWindows={["3m", "6m"]}
        intervalMin={3}
        exportPoints={TEST_POINTS.slice(0, 10)}
        exportFromMs={summary.fromMs}
        exportToMs={summary.toMs}
        onGrainChange={onGrainChange}
        onMaxWindowChange={() => {}}
      />,
    );

    const grainGroup = getByRole("group", { name: "Adatsűrűség" });
    await user.click(within(grainGroup).getByRole("button", { name: "1 óra" }));
    expect(onGrainChange).toHaveBeenCalledWith("hour");
  });

  test("max ablak gombok váltanak", async () => {
    const user = userEvent.setup();
    const onMaxWindowChange = mock(() => {});

    const { getByRole } = render(
      <DailyChart
        trend={summary.trend}
        mean={summary.mean}
        grain="day"
        availableGrains={["day"]}
        maxWindow="3m"
        availableMaxWindows={["3m", "6m", "15m"]}
        intervalMin={3}
        exportPoints={TEST_POINTS.slice(0, 10)}
        exportFromMs={summary.fromMs}
        exportToMs={summary.toMs}
        onGrainChange={() => {}}
        onMaxWindowChange={onMaxWindowChange}
      />,
    );

    const maxGroup = getByRole("group", { name: "Max ablak" });
    await user.click(within(maxGroup).getByRole("button", { name: "6 perc" }));
    expect(onMaxWindowChange).toHaveBeenCalledWith("6m");
  });

  test("CSV letöltés gomb kattintható adattal", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(
      <DailyChart
        trend={summary.trend}
        mean={summary.mean}
        grain="day"
        availableGrains={["day"]}
        maxWindow="3m"
        availableMaxWindows={["3m"]}
        intervalMin={3}
        exportPoints={TEST_POINTS.slice(0, 5)}
        exportFromMs={summary.fromMs}
        exportToMs={summary.toMs}
        onGrainChange={() => {}}
        onMaxWindowChange={() => {}}
      />,
    );

    const btn = getByRole("button", { name: "CSV letöltés" });
    expect(btn).not.toBeDisabled();
    await user.click(btn);
  });

  test("üres trend esetén üzenet", () => {
    const { getByText, getByRole } = render(
      <DailyChart
        trend={[]}
        mean={0}
        grain="raw"
        availableGrains={["raw"]}
        maxWindow="3m"
        availableMaxWindows={[]}
        intervalMin={3}
        exportPoints={[]}
        exportFromMs={summary.fromMs}
        exportToMs={summary.toMs}
        onGrainChange={() => {}}
        onMaxWindowChange={() => {}}
      />,
    );

    expect(
      getByText("Nincs adat a kiválasztott időszakban."),
    ).toBeInTheDocument();
    expect(getByRole("button", { name: "CSV letöltés" })).toBeDisabled();
  });
});
