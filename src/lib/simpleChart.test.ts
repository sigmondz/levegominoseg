import { describe, expect, test } from "bun:test";
import {
  belowThresholdFillValue,
  thresholdFillValue,
  withWhoThresholdShades,
} from "./simpleChart";

describe("simpleChart threshold shades", () => {
  test("a kitöltés a WHO-vonalhoz van clampelve, folytonos Area-hoz", () => {
    expect(thresholdFillValue(10, 15)).toBe(15);
    expect(thresholdFillValue(25, 15)).toBe(25);
    expect(thresholdFillValue(25, null)).toBe(0);
    expect(belowThresholdFillValue(10, 15)).toBe(10);
    expect(belowThresholdFillValue(25, 15)).toBe(15);
    expect(belowThresholdFillValue(25, null)).toBe(0);
  });

  test("WHO-átlépésnél beszúr keresztezési pontot", () => {
    const rows = withWhoThresholdShades(
      [
        { mean: 20, label: "a" },
        { mean: 10, label: "b" },
        { mean: 25, label: "c" },
      ],
      15,
    );

    expect(rows).toHaveLength(5);
    expect(rows[1]).toMatchObject({
      mean: 15,
      i: 0.5,
      shadedMean: 15,
      shadedBelow: 15,
    });
    expect(rows[0]?.shadedMean).toBe(20);
    expect(rows[0]?.shadedBelow).toBe(15);
    expect(rows[2]?.shadedMean).toBe(15);
    expect(rows[2]?.shadedBelow).toBe(10);
  });
});
