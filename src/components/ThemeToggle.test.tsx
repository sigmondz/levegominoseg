import { describe, expect, mock, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  test("sötét módban világosra vált", async () => {
    const user = userEvent.setup();
    const onToggle = mock(() => {});

    const { getByRole } = render(
      <ThemeToggle theme="dark" onToggle={onToggle} />,
    );

    const btn = getByRole("switch", { name: /világos módra/i });
    expect(btn).toHaveAttribute("aria-checked", "false");

    await user.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("világos módban sötétre vált", async () => {
    const user = userEvent.setup();
    const onToggle = mock(() => {});

    const { getByRole } = render(
      <ThemeToggle theme="light" onToggle={onToggle} />,
    );

    const btn = getByRole("switch", { name: /sötét módra/i });
    expect(btn).toHaveAttribute("aria-checked", "true");

    await user.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
