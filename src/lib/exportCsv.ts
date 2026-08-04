import { formatDateTime, toDateInputValue } from "./aggregate";
import type { SeriesEntry } from "./types";

/** Build CSV of filtered 3-min samples (Excel-friendly, UTF-8 BOM). */
export function buildFilteredCsv(points: SeriesEntry[]): string {
  const lines = ["timestamp,pm25_ug_m3"];
  for (const [t, v] of points) {
    lines.push(`${formatDateTime(t)},${v}`);
  }
  return lines.join("\n");
}

export function filteredCsvFilename(fromMs: number, toMs: number): string {
  return `pm25_${toDateInputValue(fromMs)}_${toDateInputValue(toMs)}.csv`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadFilteredCsv(
  points: SeriesEntry[],
  fromMs: number,
  toMs: number,
): void {
  downloadTextFile(
    filteredCsvFilename(fromMs, toMs),
    buildFilteredCsv(points),
  );
}
