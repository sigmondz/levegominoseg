import { describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareView } from "./ShareView";
import {
  buildSharePreview,
  formatShareRange,
} from "../lib/shareView";

describe("shareView helpers", () => {
  test("formatShareRange ugyanazon a napon", () => {
    const ms = new Date("2026-02-22T12:00:00").getTime();
    expect(formatShareRange(ms, ms)).toBe("feb. 22");
  });

  test("formatShareRange ugyanabban a hónapban", () => {
    const from = new Date("2026-02-22T00:00:00").getTime();
    const to = new Date("2026-02-28T23:59:00").getTime();
    expect(formatShareRange(from, to)).toBe("feb. 22–28");
  });

  test("formatShareRange hónapokon át", () => {
    const from = new Date("2026-01-28T00:00:00").getTime();
    const to = new Date("2026-02-03T23:59:00").getTime();
    expect(formatShareRange(from, to)).toBe("jan. 28 – feb. 3");
  });

  test("buildSharePreview", () => {
    const from = new Date("2026-02-22T00:00:00").getTime();
    const to = new Date("2026-02-28T23:59:00").getTime();
    expect(buildSharePreview(from, to, 27.7)).toBe(
      "Nagymaros, feb. 22–28, átlag 27.7",
    );
  });
});

describe("ShareView", () => {
  test("ikonos link másolás hover tooltippel", async () => {
    const user = userEvent.setup();
    const writeText = mock(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const from = new Date("2026-02-22T00:00:00").getTime();
    const to = new Date("2026-02-28T23:59:00").getTime();
    const { getByRole } = render(
      <ShareView fromMs={from} toMs={to} mean={27.7} />,
    );

    const btn = getByRole("button", { name: "Link másolása" });
    expect(btn).toBeInTheDocument();
    expect(document.getElementById("share-link-tip")?.textContent).toContain(
      "Nagymaros, feb. 22–28, átlag 27.7",
    );

    await user.click(btn);
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    await waitFor(() => {
      expect(getByRole("button", { name: "Másolva!" })).toBeInTheDocument();
    });
  });
});
