import { describe, expect, mock, test } from "bun:test";
import {
  buildFilteredCsv,
  downloadFilteredCsv,
  downloadTextFile,
  filteredCsvFilename,
} from "./exportCsv";
import { TEST_FROM_MS, TEST_TO_MS } from "../test/fixtures";

describe("exportCsv", () => {
  test("buildFilteredCsv fejléc és sorok", () => {
    const csv = buildFilteredCsv([
      [TEST_FROM_MS, 12.5],
      [TEST_FROM_MS + 180_000, 20],
    ]);
    expect(csv.startsWith("timestamp,pm25_ug_m3")).toBe(true);
    expect(csv).toContain("12.5");
    expect(csv).toContain("20");
  });

  test("filteredCsvFilename formátum", () => {
    expect(filteredCsvFilename(TEST_FROM_MS, TEST_TO_MS)).toBe(
      "pm25_2026-01-15_2026-02-10.csv",
    );
  });

  test("downloadTextFile letöltést indít", () => {
    const click = mock(() => {});
    const appendChild = mock(() => {});
    const remove = mock(() => {});
    const revoke = mock(() => {});

    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = () => "blob:test";

    const anchor = {
      href: "",
      download: "",
      rel: "",
      click,
      remove,
    } as unknown as HTMLAnchorElement;

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      if (tag === "a") return anchor;
      return originalCreateElement(tag);
    }) as typeof document.createElement;

    document.body.appendChild = appendChild as typeof document.body.appendChild;
    URL.revokeObjectURL = revoke;

    downloadTextFile("test.csv", "a,b\n1,2");

    expect(anchor.download).toBe("test.csv");
    expect(click).toHaveBeenCalled();
    expect(appendChild).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalled();

    URL.createObjectURL = originalCreate;
    document.createElement = originalCreateElement;
  });

  test("downloadFilteredCsv összekapcsolja a részeket", () => {
    const click = mock(() => {});
    const anchor = {
      href: "",
      download: "",
      rel: "",
      click,
      remove: mock(() => {}),
    } as unknown as HTMLAnchorElement;

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      if (tag === "a") return anchor;
      return originalCreateElement(tag);
    }) as typeof document.createElement;

    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    document.body.appendChild = mock(() => {}) as typeof document.body.appendChild;

    downloadFilteredCsv([[TEST_FROM_MS, 15]], TEST_FROM_MS, TEST_TO_MS);

    expect(anchor.download).toBe("pm25_2026-01-15_2026-02-10.csv");
    expect(click).toHaveBeenCalled();

    document.createElement = originalCreateElement;
  });
});
