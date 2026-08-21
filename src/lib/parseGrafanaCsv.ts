import type { MetricId, SeriesEntry, SeriesFile } from "./types";

const TIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const VALUE_RE = /([\d.]+)/;
const UNIT = "µg/m³";

export class GrafanaCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrafanaCsvError";
  }
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((cell) => cell.trim());
}

export function parseValue(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const match = VALUE_RE.exec(raw.replace(",", "."));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function parseLocalTimeMs(raw: string): number | null {
  const match = TIME_RE.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const ms = new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function normalizeMetric(raw: string): MetricId | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (compact === "PM1") return "PM1";
  if (compact === "PM10") return "PM10";
  if (compact === "PM2.5" || compact === "PM25" || compact === "PM2,5") {
    return "PM2.5";
  }
  return null;
}

export function parseSensorMetric(column: string): {
  sensor: string;
  metric: MetricId;
} {
  const trimmed = column.trim().replace(/^"+|"+$/g, "");
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const metric = normalizeMetric(parts[parts.length - 1]!);
    if (metric) {
      return { sensor: parts.slice(0, -1).join(" "), metric };
    }
  }
  const only = normalizeMetric(trimmed);
  if (only) return { sensor: "SPS30", metric: only };
  throw new GrafanaCsvError(`Ismeretlen metrika az oszlopnévben: ${column}`);
}

export function detectValueColumn(fieldnames: string[]): string {
  for (const name of fieldnames) {
    if (name === "Time") continue;
    if (/pm/i.test(name)) return name;
  }
  const nonTime = fieldnames.filter((name) => name !== "Time");
  if (nonTime.length === 1 && nonTime[0]) return nonTime[0];
  throw new GrafanaCsvError(
    `Nem található PM értékoszlop: ${fieldnames.join(", ")}`,
  );
}

export function detectIntervalMin(points: SeriesEntry[]): number {
  if (points.length < 2) return 3;
  const diffs: number[] = [];
  const limit = Math.min(points.length, 200);
  for (let i = 1; i < limit; i += 1) {
    const delta = points[i]![0] - points[i - 1]![0];
    if (delta > 0) diffs.push(delta);
  }
  if (diffs.length === 0) return 3;
  diffs.sort((a, b) => a - b);
  const median = diffs[Math.floor(diffs.length / 2)]!;
  return Math.max(1, Math.round(median / 60_000));
}

export function parseGrafanaCsv(
  text: string,
  options: { chipId?: string } = {},
): SeriesFile {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    throw new GrafanaCsvError("A CSV üres vagy hiányzik a fejléc");
  }

  const fieldnames = parseCsvLine(lines[0]!);
  if (!fieldnames.includes("Time")) {
    throw new GrafanaCsvError("A CSV-nek Time oszlopra van szüksége");
  }
  const valueCol = detectValueColumn(fieldnames);
  const valueIndex = fieldnames.indexOf(valueCol);
  const timeIndex = fieldnames.indexOf("Time");
  const { sensor, metric } = parseSensorMetric(valueCol);

  const points: SeriesEntry[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const timeRaw = cells[timeIndex] ?? "";
    const ts = parseLocalTimeMs(timeRaw);
    if (ts == null) continue;
    const value = parseValue(cells[valueIndex]);
    if (value == null) continue;
    points.push([ts, value]);
  }

  if (points.length === 0) {
    throw new GrafanaCsvError("A CSV-ben nincs érvényes mérési pont");
  }

  points.sort((a, b) => a[0] - b[0]);
  const fromMs = points[0]![0];
  const toMs = points[points.length - 1]![0];

  return {
    meta: {
      sensor,
      metric,
      unit: UNIT,
      chipId: options.chipId?.trim() || "",
      intervalMin: detectIntervalMin(points),
      fromMs,
      toMs,
    },
    points,
  };
}
