import { describe, expect, test } from "bun:test";
import {
  detectIntervalMin,
  GrafanaCsvError,
  parseCsvLine,
  parseGrafanaCsv,
  parseSensorMetric,
  parseValue,
} from "./parseGrafanaCsv";

const SAMPLE = `"Time","SPS30 PM2.5"
2026-01-01 00:00:00,
2026-01-01 00:03:00,44.3 μg/m³
2026-01-01 00:06:00,"12,7"
2026-01-01 00:09:00,8.1
`;

describe("parseGrafanaCsv", () => {
  test("üres sor és μg/m³", () => {
    const series = parseGrafanaCsv(SAMPLE, { chipId: "chip-1" });
    expect(series.meta.metric).toBe("PM2.5");
    expect(series.meta.sensor).toBe("SPS30");
    expect(series.meta.chipId).toBe("chip-1");
    expect(series.meta.intervalMin).toBe(3);
    expect(series.points).toHaveLength(3);
    expect(series.points[0]?.[1]).toBe(44.3);
    expect(series.points[1]?.[1]).toBe(12.7);
  });

  test("PM10 oszlopnév", () => {
    const csv = `Time,SPS30 PM10
2026-03-02 10:00:00,20
2026-03-02 10:03:00,21
`;
    expect(parseGrafanaCsv(csv).meta.metric).toBe("PM10");
  });

  test("üres CSV hiba", () => {
    expect(() => parseGrafanaCsv("Time,SPS30 PM2.5\n")).toThrow(GrafanaCsvError);
  });

  test("parseCsvLine idézőjelek", () => {
    expect(parseCsvLine('"Time","SPS30 PM2.5"')).toEqual([
      "Time",
      "SPS30 PM2.5",
    ]);
  });

  test("parseValue és parseSensorMetric", () => {
    expect(parseValue("")).toBeNull();
    expect(parseValue("44.3 μg/m³")).toBe(44.3);
    expect(parseSensorMetric("SPS30 PM1")).toEqual({
      sensor: "SPS30",
      metric: "PM1",
    });
  });

  test("detectIntervalMin", () => {
    expect(detectIntervalMin([[0, 1]])).toBe(3);
    expect(
      detectIntervalMin([
        [0, 1],
        [180_000, 2],
        [360_000, 3],
      ]),
    ).toBe(3);
  });
});
