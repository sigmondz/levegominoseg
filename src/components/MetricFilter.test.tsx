import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricFilter } from "./MetricFilter";
import { TEST_SITE_HAZ, TEST_SITE_ISKOLA } from "../test/fixtures";

describe("MetricFilter", () => {
  test("chip-ek megjelennek, PM2.5 aktív alapból", () => {
    const { getByRole } = render(
      <MetricFilter
        sites={[TEST_SITE_HAZ]}
        siteId={TEST_SITE_HAZ.id}
        onSiteChange={() => {}}
        metric="PM2.5"
        availableMetrics={["PM1", "PM2.5", "PM10"]}
        onMetricChange={() => {}}
      />,
    );

    expect(getByRole("combobox", { name: "Helyszín" })).toHaveValue(
      "nagymaros-haz01",
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
    expect(getByRole("button", { name: "Mit jelent a PM?" })).toBeInTheDocument();
  });

  test("kattintás meghívja onMetricChange-et", async () => {
    const user = userEvent.setup();
    const onMetricChange = mock(() => {});

    const { getByRole } = render(
      <MetricFilter
        sites={[TEST_SITE_HAZ]}
        siteId={TEST_SITE_HAZ.id}
        onSiteChange={() => {}}
        metric="PM2.5"
        availableMetrics={["PM1", "PM2.5", "PM10"]}
        onMetricChange={onMetricChange}
      />,
    );

    await user.click(getByRole("button", { name: "PM1" }));
    expect(onMetricChange).toHaveBeenCalledWith("PM1");

    await user.click(getByRole("button", { name: "PM10" }));
    expect(onMetricChange).toHaveBeenCalledWith("PM10");
  });

  test("hiányzó PM chip nincs a DOM-ban", () => {
    const { queryByRole, getByRole } = render(
      <MetricFilter
        sites={[TEST_SITE_HAZ, TEST_SITE_ISKOLA]}
        siteId={TEST_SITE_ISKOLA.id}
        onSiteChange={() => {}}
        metric="PM2.5"
        availableMetrics={["PM2.5"]}
        onMetricChange={() => {}}
      />,
    );

    expect(getByRole("button", { name: "PM2.5" })).toBeInTheDocument();
    expect(queryByRole("button", { name: "PM1" })).toBeNull();
    expect(queryByRole("button", { name: "PM10" })).toBeNull();
  });
});
