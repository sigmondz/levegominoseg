import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PeriodFilter } from "./PeriodFilter";
import { TEST_META } from "../test/fixtures";

const baseProps = {
  monthKey: "2026-01" as const,
  within: "month" as const,
  selectedDay: "2026-01-20",
  windowStart: "2026-01-15",
  customFrom: "2026-01-15",
  customTo: "2026-01-31",
  dataFromMs: TEST_META.fromMs,
  dataToMs: TEST_META.toMs,
  onMonthChange: mock(() => {}),
  onWithinChange: mock(() => {}),
  onSelectedDayChange: mock(() => {}),
  onWindowStartChange: mock(() => {}),
  onCustomFromChange: mock(() => {}),
  onCustomToChange: mock(() => {}),
};

describe("PeriodFilter", () => {
  test("hónap chip-ek megjelennek és kattinthatók", async () => {
    const user = userEvent.setup();
    const onMonthChange = mock(() => {});

    const { getByRole } = render(
      <PeriodFilter {...baseProps} onMonthChange={onMonthChange} />,
    );

    const jan = getByRole("button", { name: /2026 január/i });
    const feb = getByRole("button", { name: /2026 február/i });

    expect(jan).toHaveAttribute("aria-pressed", "true");
    expect(feb).toHaveAttribute("aria-pressed", "false");

    await user.click(feb);
    expect(onMonthChange).toHaveBeenCalledWith("2026-02");
  });

  test("scope gombok (Teljes hónap, Nap, Hét, stb.)", async () => {
    const user = userEvent.setup();
    const onWithinChange = mock(() => {});

    const { getByRole } = render(
      <PeriodFilter {...baseProps} onWithinChange={onWithinChange} />,
    );

    await user.click(getByRole("button", { name: "Nap" }));
    expect(onWithinChange).toHaveBeenCalledWith("1d");

    await user.click(getByRole("button", { name: "Hét" }));
    expect(onWithinChange).toHaveBeenCalledWith("7d");

    await user.click(getByRole("button", { name: "2 hét" }));
    expect(onWithinChange).toHaveBeenCalledWith("14d");

    await user.click(getByRole("button", { name: "Egyéni" }));
    expect(onWithinChange).toHaveBeenCalledWith("custom");
  });

  test("nap chip-ek 1d scope-ban", async () => {
    const user = userEvent.setup();
    const onSelectedDayChange = mock(() => {});

    const { getByRole } = render(
      <PeriodFilter
        {...baseProps}
        within="1d"
        onSelectedDayChange={onSelectedDayChange}
      />,
    );

    await user.click(getByRole("button", { name: "20" }));
    expect(onSelectedDayChange).toHaveBeenCalledWith("2026-01-20");
  });

  test("hét chip-ek 7d scope-ban", async () => {
    const user = userEvent.setup();
    const onWindowStartChange = mock(() => {});

    const { getAllByRole } = render(
      <PeriodFilter
        {...baseProps}
        within="7d"
        onWindowStartChange={onWindowStartChange}
      />,
    );

    const weekButtons = getAllByRole("button").filter((btn) =>
      btn.textContent?.includes("–"),
    );
    expect(weekButtons.length).toBeGreaterThan(0);

    await user.click(weekButtons[0]!);
    expect(onWindowStartChange).toHaveBeenCalled();
  });

  test("egyéni scope DatePicker-t mutat", () => {
    const { getByText } = render(
      <PeriodFilter {...baseProps} within="custom" />,
    );

    expect(getByText("Ettől")).toBeInTheDocument();
    expect(getByText("Eddig")).toBeInTheDocument();
  });
});
