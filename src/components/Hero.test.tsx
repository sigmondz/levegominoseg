import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Hero } from "./Hero";

describe("Hero", () => {
  test("cím és nézetkapcsolók megjelennek", () => {
    const { getByRole, getByText, container } = render(
      <Hero
        theme="dark"
        onToggleTheme={() => {}}
        viewMode="detailed"
        onViewModeChange={() => {}}
      />,
    );

    expect(getByText("Levegőminőség Nagymaroson")).toBeInTheDocument();
    expect(getByRole("button", { name: "Egyszerű nézet" })).toBeInTheDocument();
    expect(getByRole("button", { name: "Részletes nézet" })).toBeInTheDocument();
    expect(container.querySelectorAll(".view-mode-icon")).toHaveLength(2);
  });

  test("az időszakos összefoglaló nem a Hero alatt jelenik meg", () => {
    const { queryByText } = render(
      <Hero
        theme="dark"
        onToggleTheme={() => {}}
        viewMode="detailed"
        onViewModeChange={() => {}}
      />,
    );

    expect(queryByText(/adatok helyi szenzorból származnak/)).toBeNull();
  });
});
