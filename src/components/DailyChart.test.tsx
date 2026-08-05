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

const baseProps = {
  trend: summary.trend,
  mean: summary.mean,
  metric: "PM2.5",
  grain: "day" as const,
  availableGrains: ["hour", "day"] as ("hour" | "day")[],
  maxWindow: "3m" as const,
  availableMaxWindows: ["3m", "6m"] as ("3m" | "6m")[],
  intervalMin: 3,
  exportPoints: TEST_POINTS.slice(0, 10),
  exportFromMs: summary.fromMs,
  exportToMs: summary.toMs,
  onGrainChange: () => {},
  onMaxWindowChange: () => {},
};

describe("DailyChart", () => {
  test("grafikon és legendák megjelennek", () => {
    const { getByText, getByRole } = render(<DailyChart {...baseProps} />);

    expect(getByText("Napi átlag és csúcs")).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(getByText("WHO 24 órás irányérték")).toBeInTheDocument();
    expect(getByText("15 µg/m³")).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mi az átlag görbe?" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mi a max görbe?" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mi a WHO irányérték?" }),
    ).toBeInTheDocument();
    expect(getByText("WHO alatti rész")).toBeInTheDocument();
    expect(getByText("WHO feletti rész")).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mit jelöl a zöld satírozás?" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mit jelöl a vörös satírozás?" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mi a kiválasztott időszak átlaga?" }),
    ).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Mi a magas szennyezettségi küszöb?" }),
    ).toBeInTheDocument();
  });

  test("PM10-nél WHO 45 jelenik meg", () => {
    const { getByText } = render(
      <DailyChart {...baseProps} metric="PM10" />,
    );
    expect(getByText("WHO 24 órás irányérték")).toBeInTheDocument();
    expect(getByText("45 µg/m³")).toBeInTheDocument();
  });

  test("PM1-nél nincs WHO irányérték", () => {
    const { queryByText, queryByRole } = render(
      <DailyChart {...baseProps} metric="PM1" />,
    );
    expect(queryByText("WHO 24 órás irányérték")).toBeNull();
    expect(queryByText("WHO alatti rész")).toBeNull();
    expect(queryByText("WHO feletti rész")).toBeNull();
    expect(
      queryByRole("button", { name: "Mit jelöl a vörös satírozás?" }),
    ).toBeNull();
  });

  test("adatsűrűség gombok váltanak", async () => {
    const user = userEvent.setup();
    const onGrainChange = mock(() => {});

    const { getByRole } = render(
      <DailyChart {...baseProps} onGrainChange={onGrainChange} />,
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
        {...baseProps}
        availableGrains={["day"]}
        availableMaxWindows={["3m", "6m", "15m"]}
        onMaxWindowChange={onMaxWindowChange}
      />,
    );

    const maxGroup = getByRole("group", { name: "Max ablak" });
    await user.click(within(maxGroup).getByRole("button", { name: "6 perc" }));
    expect(onMaxWindowChange).toHaveBeenCalledWith("6m");
  });

  test("max görbe ki-be kapcsolható", async () => {
    const user = userEvent.setup();

    const { getByRole, container } = render(
      <DailyChart
        {...baseProps}
        availableGrains={["day"]}
        availableMaxWindows={["3m", "6m"]}
      />,
    );

    const toggle = getByRole("button", { name: "Max görbe" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(1);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);
  });

  test("CSV letöltés gomb kattintható adattal", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(
      <DailyChart
        {...baseProps}
        availableGrains={["day"]}
        availableMaxWindows={["3m"]}
        exportPoints={TEST_POINTS.slice(0, 5)}
      />,
    );

    const btn = getByRole("button", { name: "CSV letöltés" });
    expect(btn).not.toBeDisabled();
    await user.click(btn);
  });

  test("üres trend esetén üzenet", () => {
    const { getByText, getByRole } = render(
      <DailyChart
        {...baseProps}
        trend={[]}
        mean={0}
        grain="raw"
        availableGrains={["raw"]}
        availableMaxWindows={[]}
        exportPoints={[]}
      />,
    );

    expect(
      getByText("Nincs adat a kiválasztott időszakban."),
    ).toBeInTheDocument();
    expect(getByRole("button", { name: "CSV letöltés" })).toBeDisabled();
  });
});
