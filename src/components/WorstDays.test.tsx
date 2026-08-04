import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorstDays } from "./WorstDays";
import { TEST_DAILY } from "../test/fixtures";

describe("WorstDays", () => {
  test("nem renderel ha nem látható", () => {
    const { container } = render(
      <WorstDays daily={TEST_DAILY} visible={false} onSelectDay={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("rangsorolás és limit gombok", async () => {
    const user = userEvent.setup();

    const { getByText, getByRole, container } = render(
      <WorstDays daily={TEST_DAILY} visible onSelectDay={() => {}} />,
    );

    expect(getByText("Legrosszabb napok")).toBeInTheDocument();
    expect(
      container.querySelectorAll(".worst-days-metric").length,
    ).toBeGreaterThan(0);

    await user.click(getByRole("button", { name: "Átlag" }));
    expect(getByRole("button", { name: "Átlag" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelectorAll(".worst-days-metric").length).toBe(3);

    await user.click(getByRole("button", { name: "5" }));
    expect(document.querySelectorAll(".worst-days-item").length).toBe(4);
  });

  test("nap kiválasztása meghívja az onSelectDay-t", async () => {
    const user = userEvent.setup();
    const onSelectDay = mock(() => {});

    const { container } = render(
      <WorstDays daily={TEST_DAILY} visible onSelectDay={onSelectDay} />,
    );

    const dayButtons = container.querySelectorAll(".worst-days-item");
    await user.click(dayButtons[0] as HTMLElement);
    expect(onSelectDay).toHaveBeenCalledWith("2026-01-20");
  });
});
