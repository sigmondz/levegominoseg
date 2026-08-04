import type { MetricId } from "./types";

/** WHO 24h guideline (µg/m³), or null if none for this metric. */
export function who24h(metric: string): number | null {
  switch (metric) {
    case "PM2.5":
      return 15;
    case "PM10":
      return 45;
    default:
      return null;
  }
}

/** WHO / gyakorlati sávok (µg/m³), metrika küszöbhöz igazítva ahol van WHO. */
export function pmTone(
  value: number,
  metric: string = "PM2.5",
): "good" | "moderate" | "poor" | "bad" {
  const who = who24h(metric) ?? WHO_24H;
  if (value < who) return "good";
  if (value < who * (25 / 15)) return "moderate";
  if (value < GRAFANA_THRESHOLD) return "poor";
  return "bad";
}

export function pmLabel(value: number, metric: string = "PM2.5"): string {
  switch (pmTone(value, metric)) {
    case "good":
      return "jó";
    case "moderate":
      return "mérsékelt";
    case "poor":
      return "rossz";
    case "bad":
      return "kritikus";
  }
}

/** Default PM2.5 WHO 24h guideline (µg/m³). Prefer who24h(metric). */
export const WHO_24H = 15;
export const GRAFANA_THRESHOLD = 80;

export const METRIC_OPTIONS: { id: MetricId; label: string; slug: string }[] = [
  { id: "PM1", label: "PM1", slug: "pm1" },
  { id: "PM2.5", label: "PM2.5", slug: "pm25" },
  { id: "PM10", label: "PM10", slug: "pm10" },
];

export const DEFAULT_METRIC: MetricId = "PM2.5";

export function metricSlug(metric: MetricId): string {
  return METRIC_OPTIONS.find((m) => m.id === metric)?.slug ?? "pm25";
}

export function parseMetricSlug(value: string | null): MetricId | null {
  if (value == null) return null;
  const match = METRIC_OPTIONS.find((m) => m.slug === value);
  return match?.id ?? null;
}

export function seriesUrl(metric: MetricId): string {
  return `/data/series-${metricSlug(metric)}.json`;
}

export function csvPath(metric: MetricId): string {
  return `/data/${metricSlug(metric)}-sps30-2026.csv`;
}
