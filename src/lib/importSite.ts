import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_SITE_ID,
  isSiteId,
  parseCatalog,
  seriesFileName,
  seriesPublicPath,
} from "./catalog";
import { GrafanaCsvError, parseGrafanaCsv } from "./parseGrafanaCsv";
import type { MetricId, SeriesFile, SiteInfo } from "./types";

export class ImportSiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportSiteError";
  }
}

export type CsvInput = {
  name: string;
  text: string;
};

export type ImportSiteOptions = {
  dataDir: string;
  id: string;
  label: string;
  chipId?: string;
  csvs: CsvInput[];
};

function catalogPath(dataDir: string): string {
  return join(dataDir, "catalog.json");
}

async function readCatalog(dataDir: string): Promise<SiteInfo[]> {
  try {
    const raw = await readFile(catalogPath(dataDir), "utf8");
    return parseCatalog(JSON.parse(raw) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function parsedMetric(series: SeriesFile): MetricId {
  const metric = series.meta.metric;
  if (metric === "PM1" || metric === "PM2.5" || metric === "PM10") {
    return metric;
  }
  throw new ImportSiteError(`Ismeretlen metrika: ${metric}`);
}

export async function importSite(
  options: ImportSiteOptions,
): Promise<SiteInfo> {
  const id = options.id.trim();
  const label = options.label.trim();
  if (!isSiteId(id)) {
    throw new ImportSiteError(
      `Érvénytelen helyszín-azonosító: ${options.id} (pl. nagymaros-iskola01)`,
    );
  }
  if (!label) {
    throw new ImportSiteError("A helyszín felirata kötelező");
  }
  if (options.csvs.length === 0) {
    throw new ImportSiteError("Legalább egy Grafana CSV kell");
  }

  const byMetric = new Map<MetricId, SeriesFile>();
  for (const csv of options.csvs) {
    let series: SeriesFile;
    try {
      series = parseGrafanaCsv(csv.text, { chipId: options.chipId });
    } catch (error) {
      const message =
        error instanceof GrafanaCsvError ? error.message : String(error);
      throw new ImportSiteError(`${csv.name}: ${message}`);
    }
    const metric = parsedMetric(series);
    if (byMetric.has(metric)) {
      throw new ImportSiteError(`A ${metric} metrika kétszer szerepel`);
    }
    byMetric.set(metric, series);
  }

  const metrics = [...byMetric.keys()];
  const files: Partial<Record<MetricId, string>> = {};
  let fromMs = Number.POSITIVE_INFINITY;
  let toMs = Number.NEGATIVE_INFINITY;
  let sensor = "SPS30";
  let chipId = options.chipId?.trim() || "";

  for (const [metric, series] of byMetric) {
    files[metric] = seriesPublicPath(id, metric);
    fromMs = Math.min(fromMs, series.meta.fromMs);
    toMs = Math.max(toMs, series.meta.toMs);
    sensor = series.meta.sensor || sensor;
    if (!chipId && series.meta.chipId) chipId = series.meta.chipId;
  }

  const site: SiteInfo = {
    id,
    label,
    sensor,
    metrics,
    fromMs,
    toMs,
    files,
  };
  if (chipId) site.chipId = chipId;

  const existing = await readCatalog(options.dataDir);
  const nextSites = existing.filter((item) => item.id !== id);
  const defaultIndex = nextSites.findIndex((item) => item.id === DEFAULT_SITE_ID);
  if (id === DEFAULT_SITE_ID || defaultIndex === -1) {
    nextSites.unshift(site);
  } else {
    nextSites.push(site);
  }

  await mkdir(options.dataDir, { recursive: true });
  for (const [metric, series] of byMetric) {
    const dest = join(options.dataDir, seriesFileName(id, metric));
    await writeFile(dest, JSON.stringify(series), "utf8");
  }
  await writeFile(
    catalogPath(options.dataDir),
    `${JSON.stringify({ sites: nextSites }, null, 2)}\n`,
    "utf8",
  );

  return site;
}
