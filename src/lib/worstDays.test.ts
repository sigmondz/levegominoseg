import { describe, expect, test } from "bun:test";
import { rankWorstDays } from "./worstDays";
import { TEST_DAILY } from "../test/fixtures";

describe("worstDays", () => {
  test("max szerint rangsorol", () => {
    const ranked = rankWorstDays(TEST_DAILY, "max", 3);
    expect(ranked).toHaveLength(3);
    expect(ranked[0]!.date).toBe("2026-01-20");
    expect(ranked[0]!.max).toBe(85);
    expect(ranked[1]!.max).toBeGreaterThanOrEqual(ranked[2]!.max);
  });

  test("mean szerint rangsorol", () => {
    const ranked = rankWorstDays(TEST_DAILY, "mean", 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.date).toBe("2026-01-22");
    expect(ranked[0]!.mean).toBe(30.1);
  });

  test("üres lista", () => {
    expect(rankWorstDays([], "max")).toEqual([]);
  });

  test("limit nem haladja meg a napok számát", () => {
    expect(rankWorstDays(TEST_DAILY, "max", 10)).toHaveLength(4);
  });
});
