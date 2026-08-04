import type { MetricId } from "./types";

export type PmTone = "good" | "moderate" | "poor" | "bad";

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

/**
 * Concentration tone (µg/m³), scaled to the metric WHO AQG when available.
 * PM2.5: good &lt;15 · moderate &lt;25 · poor &lt;30 · bad ≥30
 * PM10:  good &lt;45 · moderate &lt;75 · poor &lt;90 · bad ≥90
 * PM1: same absolute bands as PM2.5 (no official WHO; practical scale).
 */
export function pmTone(
  value: number,
  metric: string = "PM2.5",
): PmTone {
  const who = who24h(metric) ?? WHO_24H;
  if (value < who) return "good";
  if (value < who * (25 / 15)) return "moderate";
  if (value < who * (30 / 15)) return "poor";
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

/** Share of readings ≥ 80 µg/m³ (strong pollution band). */
export function above80Tone(pct: number): PmTone {
  if (pct <= 0) return "good";
  if (pct < 2) return "moderate";
  if (pct < 5) return "poor";
  return "bad";
}

/** Days with daily mean ≥ WHO, vs calendar days in range. */
export function daysAboveWhoTone(days: number, total: number): PmTone {
  if (days <= 0) return "good";
  if (total <= 0) return "bad";
  const pct = (100 * days) / total;
  if (pct < 10) return "moderate";
  if (pct < 30) return "poor";
  return "bad";
}

/** Default PM2.5 WHO 24h guideline (µg/m³). Prefer who24h(metric). */
export const WHO_24H = 15;
/** Strongly polluted 3-minute reading threshold (µg/m³). */
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
