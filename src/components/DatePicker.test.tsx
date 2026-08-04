import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  test("megnyitás és dátum kiválasztás", async () => {
    const user = userEvent.setup();
    const onChange = mock(() => {});

    const { getByText, getByRole } = render(
      <DatePicker
        label="Ettől"
        value="2026-01-20"
        min="2026-01-15"
        max="2026-01-31"
        onChange={onChange}
      />,
    );

    expect(getByText("2026. 01. 20.")).toBeInTheDocument();

    await user.click(getByRole("button", { name: "Ettől" }));
    expect(getByRole("dialog", { name: /Ettől naptár/i })).toBeInTheDocument();

    await user.click(getByRole("gridcell", { name: "22" }));

    expect(onChange).toHaveBeenCalledWith("2026-01-22");
    expect(() => getByRole("dialog")).toThrow();
  });

  test("Escape bezárja a naptárat", async () => {
    const user = userEvent.setup();

    const { getByRole, queryByRole } = render(
      <DatePicker
        label="Eddig"
        value="2026-01-20"
        min="2026-01-15"
        max="2026-01-31"
        onChange={() => {}}
      />,
    );

    await user.click(getByRole("button", { name: "Eddig" }));
    expect(getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("hónap navigáció", async () => {
    const user = userEvent.setup();

    const { getByText, getByRole } = render(
      <DatePicker
        label="Ettől"
        value="2026-01-20"
        min="2026-01-15"
        max="2026-02-10"
        onChange={() => {}}
      />,
    );

    await user.click(getByRole("button", { name: "Ettől" }));

    const nextBtn = getByRole("button", { name: "Következő hónap" });
    expect(nextBtn).not.toBeDisabled();

    await user.click(nextBtn);
    expect(getByText(/2026\. február/i)).toBeInTheDocument();
  });
});
