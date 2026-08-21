import { DEFAULT_METRIC, METRIC_OPTIONS, metricSlug } from "./aqi";
import type { MetricId, SiteId, SiteInfo } from "./types";

export const DEFAULT_SITE_ID: SiteId = "nagymaros-haz01";
export const CATALOG_URL = "/data/catalog.json";

const SITE_ID_RE = /^nagymaros-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const METRIC_IDS = new Set<MetricId>(METRIC_OPTIONS.map((m) => m.id));

export function isSiteId(value: string): boolean {
  return SITE_ID_RE.test(value);
}

export function seriesFileName(siteId: SiteId, metric: MetricId): string {
  return `${siteId}-${metricSlug(metric)}.json`;
}

export function seriesPublicPath(siteId: SiteId, metric: MetricId): string {
  return `/data/${seriesFileName(siteId, metric)}`;
}

export function seriesUrlFor(site: SiteInfo, metric: MetricId): string | null {
  return site.files[metric] ?? null;
}

export function sourceCsvPath(
  site: SiteInfo,
  metric: MetricId,
): string | null {
  return site.sourceCsv?.[metric] ?? null;
}

export function siteHasMetric(site: SiteInfo, metric: MetricId): boolean {
  return site.metrics.includes(metric) && Boolean(site.files[metric]);
}

export function pickMetric(
  site: SiteInfo,
  preferred: MetricId = DEFAULT_METRIC,
): MetricId {
  if (siteHasMetric(site, preferred)) return preferred;
  for (const option of METRIC_OPTIONS) {
    if (siteHasMetric(site, option.id)) return option.id;
  }
  throw new Error(`A helyszínnek (${site.id}) nincs betölthető metrikája`);
}

export function resolveSite(
  sites: readonly SiteInfo[],
  requested: string | null,
): SiteInfo {
  if (sites.length === 0) {
    throw new Error("A helyszínkatalógus üres");
  }
  if (requested) {
    const match = sites.find((site) => site.id === requested);
    if (match) return match;
  }
  return sites.find((site) => site.id === DEFAULT_SITE_ID) ?? sites[0]!;
}

function isMetricId(value: unknown): value is MetricId {
  return typeof value === "string" && METRIC_IDS.has(value as MetricId);
}

function isStringRecord(
  value: unknown,
): value is Partial<Record<MetricId, string>> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([key, path]) => isMetricId(key) && typeof path === "string" && path.length > 0,
  );
}

function parseSite(value: unknown): SiteInfo | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !isSiteId(row.id)) return null;
  if (typeof row.label !== "string" || row.label.trim() === "") return null;
  if (typeof row.sensor !== "string" || row.sensor.trim() === "") return null;
  if (typeof row.fromMs !== "number" || typeof row.toMs !== "number") return null;
  if (!Array.isArray(row.metrics) || !isStringRecord(row.files)) return null;
  const fileMap = row.files;

  const metrics = row.metrics.filter(isMetricId);
  if (metrics.length === 0) return null;

  const files: Partial<Record<MetricId, string>> = {};
  for (const metric of metrics) {
    const path = fileMap[metric];
    if (typeof path !== "string") return null;
    files[metric] = path;
  }

  const site: SiteInfo = {
    id: row.id,
    label: row.label.trim(),
    sensor: row.sensor.trim(),
    metrics,
    fromMs: row.fromMs,
    toMs: row.toMs,
    files,
  };
  if (typeof row.chipId === "string" && row.chipId.trim()) {
    site.chipId = row.chipId.trim();
  }
  if (isStringRecord(row.sourceCsv)) {
    site.sourceCsv = row.sourceCsv;
  }
  return site;
}

export function parseCatalog(data: unknown): SiteInfo[] {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Érvénytelen helyszínkatalógus");
  }
  const sitesRaw = (data as { sites?: unknown }).sites;
  if (!Array.isArray(sitesRaw)) {
    throw new Error("Érvénytelen helyszínkatalógus");
  }
  const sites: SiteInfo[] = [];
  for (const row of sitesRaw) {
    const site = parseSite(row);
    if (!site) {
      throw new Error("Érvénytelen helyszín a katalógusban");
    }
    sites.push(site);
  }
  if (sites.length === 0) {
    throw new Error("A helyszínkatalógus üres");
  }
  return sites;
}
