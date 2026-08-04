import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricFilter } from "./MetricFilter";

describe("MetricFilter", () => {
  test("chip-ek megjelennek, PM2.5 aktív alapból", () => {
    const { getByRole } = render(
      <MetricFilter metric="PM2.5" onMetricChange={() => {}} />,
    );

    expect(getByRole("button", { name: "PM1" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(getByRole("button", { name: "PM2.5" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(getByRole("button", { name: "PM10" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("kattintás meghívja onMetricChange-et", async () => {
    const user = userEvent.setup();
    const onMetricChange = mock(() => {});

    const { getByRole } = render(
      <MetricFilter metric="PM2.5" onMetricChange={onMetricChange} />,
    );

    await user.click(getByRole("button", { name: "PM1" }));
    expect(onMetricChange).toHaveBeenCalledWith("PM1");

    await user.click(getByRole("button", { name: "PM10" }));
    expect(onMetricChange).toHaveBeenCalledWith("PM10");
  });
});
