import type { DailyPoint, DatasetMeta, SeriesEntry, SeriesFile } from "../lib/types";

const INTERVAL_MS = 3 * 60 * 1000;

export const TEST_FROM_MS = new Date("2026-01-15T00:00:00").getTime();
export const TEST_TO_MS = new Date("2026-02-10T23:57:00").getTime();

export const TEST_META: DatasetMeta = {
  sensor: "SPS30",
  metric: "PM2.5",
  unit: "µg/m³",
  chipId: "test-chip",
  intervalMin: 3,
  fromMs: TEST_FROM_MS,
  toMs: TEST_TO_MS,
};

/** Deterministic sample points across several days with varying PM2.5. */
export function makeTestPoints(): SeriesEntry[] {
  const points: SeriesEntry[] = [];
  let t = TEST_FROM_MS;
  const values = [10, 12, 14, 16, 18, 20, 22, 25, 30, 35, 40, 85, 15, 8];
  let i = 0;

  while (t <= TEST_TO_MS && points.length < 500) {
    points.push([t, values[i % values.length]!]);
    t += INTERVAL_MS;
    i += 1;
  }

  return points;
}

export const TEST_POINTS = makeTestPoints();

export const TEST_SERIES: SeriesFile = {
  meta: TEST_META,
  points: TEST_POINTS,
};

export const TEST_DAILY: DailyPoint[] = [
  {
    date: "2026-01-20",
    label: "01/20",
    n: 480,
    mean: 22.5,
    max: 85,
    min: 8,
    p50: 18,
  },
  {
    date: "2026-01-21",
    label: "01/21",
    n: 480,
    mean: 14.2,
    max: 40,
    min: 8,
    p50: 14,
  },
  {
    date: "2026-01-22",
    label: "01/22",
    n: 480,
    mean: 30.1,
    max: 50,
    min: 10,
    p50: 28,
  },
  {
    date: "2026-01-23",
    label: "01/23",
    n: 480,
    mean: 18.0,
    max: 35,
    min: 9,
    p50: 17,
  },
];
