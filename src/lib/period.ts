import type {
  HalfKey,
  MonthKey,
  MonthSelection,
  ParentPeriodKey,
  PeriodRange,
  QuarterKey,
  WithinMonthScope,
} from "./types";
import { DAY_MS } from "./time";

const MONTH_NAMES_HU = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
] as const;

export function toMonthKey(year: number, month: number): MonthKey {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}` as MonthKey;
}

export function parseMonthKey(
  key: string,
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || !month || month < 1 || month > 12) return null;
  return { year, month };
}

export function toQuarterKey(year: number, quarter: 1 | 2 | 3 | 4): QuarterKey {
  return `${year}-Q${quarter}` as QuarterKey;
}

export function toHalfKey(year: number, half: 1 | 2): HalfKey {
  return `${year}-H${half}` as HalfKey;
}

export function parseParentKey(
  key: string,
):
  | { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 }
  | { kind: "half"; year: number; half: 1 | 2 }
  | null {
  const q = /^(\d{4})-Q([1-4])$/.exec(key);
  if (q) {
    return {
      kind: "quarter",
      year: Number(q[1]),
      quarter: Number(q[2]) as 1 | 2 | 3 | 4,
    };
  }
  const h = /^(\d{4})-H([12])$/.exec(key);
  if (h) {
    return {
      kind: "half",
      year: Number(h[1]),
      half: Number(h[2]) as 1 | 2,
    };
  }
  return null;
}

/** Quarter containing a calendar month (1–12). */
export function quarterOfMonth(month: number): 1 | 2 | 3 | 4 {
  return Math.ceil(month / 3) as 1 | 2 | 3 | 4;
}

function parentCalendarRange(key: ParentPeriodKey): PeriodRange | null {
  const parsed = parseParentKey(key);
  if (!parsed) return null;
  if (parsed.kind === "quarter") {
    const startMonth = (parsed.quarter - 1) * 3; // 0-based
    const from = startOfLocalDay(
      new Date(parsed.year, startMonth, 1).getTime(),
    );
    const to = endOfLocalDay(
      new Date(parsed.year, startMonth + 3, 0).getTime(),
    );
    return { fromMs: from, toMs: to };
  }
  const startMonth = parsed.half === 1 ? 0 : 6;
  const from = startOfLocalDay(new Date(parsed.year, startMonth, 1).getTime());
  const to = endOfLocalDay(new Date(parsed.year, startMonth + 6, 0).getTime());
  return { fromMs: from, toMs: to };
}

function rangesOverlap(a: PeriodRange, b: PeriodRange): boolean {
  return a.fromMs <= b.toMs && a.toMs >= b.fromMs;
}

export function listMonthPresets(
  fromMs: number,
  toMs: number,
): { id: MonthKey; label: string }[] {
  const start = new Date(fromMs);
  const end = new Date(toMs);
  let y = start.getFullYear();
  let m = start.getMonth();
  const endY = end.getFullYear();
  const endM = end.getMonth();
  const items: { id: MonthKey; label: string }[] = [];

  while (y < endY || (y === endY && m <= endM)) {
    const name = MONTH_NAMES_HU[m]!;
    items.push({
      id: toMonthKey(y, m + 1),
      label: `${y} ${name.toLowerCase()}`,
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return items;
}

/**
 * Parent presets overlapping data: per year Q1–Q4, then H1, H2.
 * Labels: "2026 Q1", "2026 H1".
 */
export function listParentPresets(
  fromMs: number,
  toMs: number,
): { id: ParentPeriodKey; label: string }[] {
  const dataRange = { fromMs, toMs };
  const startY = new Date(fromMs).getFullYear();
  const endY = new Date(toMs).getFullYear();
  const items: { id: ParentPeriodKey; label: string }[] = [];

  for (let year = startY; year <= endY; year++) {
    const candidates: ParentPeriodKey[] = [
      toQuarterKey(year, 1),
      toQuarterKey(year, 2),
      toQuarterKey(year, 3),
      toQuarterKey(year, 4),
      toHalfKey(year, 1),
      toHalfKey(year, 2),
    ];
    for (const id of candidates) {
      const cal = parentCalendarRange(id);
      if (cal && rangesOverlap(cal, dataRange)) {
        const label = id.replace("-", " ");
        items.push({ id, label });
      }
    }
  }
  return items;
}

/** Months inside a parent period, clipped to available data. */
export function listMonthsInParent(
  parentKey: ParentPeriodKey,
  dataFromMs: number,
  dataToMs: number,
): { id: MonthKey; label: string }[] {
  const bounds = parentBounds(parentKey, dataFromMs, dataToMs);
  return listMonthPresets(bounds.fromMs, bounds.toMs);
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Calendar month clipped to available data. */
export function monthBounds(
  monthKey: MonthKey,
  dataFromMs: number,
  dataToMs: number,
): PeriodRange {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return { fromMs: dataFromMs, toMs: dataToMs };
  }
  const from = startOfLocalDay(
    new Date(parsed.year, parsed.month - 1, 1).getTime(),
  );
  const to = endOfLocalDay(new Date(parsed.year, parsed.month, 0).getTime());
  return {
    fromMs: Math.max(dataFromMs, from),
    toMs: Math.min(dataToMs, to),
  };
}

/** Parent (quarter / half) clipped to available data. */
export function parentBounds(
  parentKey: ParentPeriodKey,
  dataFromMs: number,
  dataToMs: number,
): PeriodRange {
  const cal = parentCalendarRange(parentKey);
  if (!cal) {
    return { fromMs: dataFromMs, toMs: dataToMs };
  }
  return {
    fromMs: Math.max(dataFromMs, cal.fromMs),
    toMs: Math.min(dataToMs, cal.toMs),
  };
}

/** Effective range from parent + month row selection. */
export function effectivePeriodBounds(
  parentKey: ParentPeriodKey,
  monthSelection: MonthSelection,
  dataFromMs: number,
  dataToMs: number,
): PeriodRange {
  if (monthSelection === "full") {
    return parentBounds(parentKey, dataFromMs, dataToMs);
  }
  return monthBounds(monthSelection, dataFromMs, dataToMs);
}

/**
 * Resolve filter inside an effective period.
 * For 1d / 7d / 14d, pass the chosen window start date (YYYY-MM-DD).
 */
export function resolveWithinPeriod(
  bounds: PeriodRange,
  scope: WithinMonthScope,
  options?: {
    selectedDay?: string;
    windowStart?: string;
    customFrom?: string;
    customTo?: string;
  },
): PeriodRange {
  if (scope === "1d") {
    const day = options?.selectedDay ?? toDateInputValue(bounds.toMs);
    const from = startOfLocalDay(new Date(`${day}T00:00:00`).getTime());
    const to = endOfLocalDay(from);
    return {
      fromMs: Math.max(bounds.fromMs, from),
      toMs: Math.min(bounds.toMs, to),
    };
  }

  if (scope === "7d" || scope === "14d") {
    const days = scope === "7d" ? 7 : 14;
    const windows = listWindowsInPeriod(bounds, days);
    const startKey =
      options?.windowStart ??
      windows.at(-1)?.id ??
      toDateInputValue(bounds.fromMs);
    const from = startOfLocalDay(new Date(`${startKey}T00:00:00`).getTime());
    const idx = windows.findIndex((w) => w.id === startKey);
    const to =
      idx >= 0 && idx === windows.length - 1
        ? bounds.toMs
        : endOfLocalDay(from + (days - 1) * DAY_MS);
    return {
      fromMs: Math.max(bounds.fromMs, from),
      toMs: Math.min(bounds.toMs, to),
    };
  }

  if (scope === "custom" && options?.customFrom && options?.customTo) {
    const from = startOfLocalDay(
      new Date(`${options.customFrom}T00:00:00`).getTime(),
    );
    const to = endOfLocalDay(
      new Date(`${options.customTo}T00:00:00`).getTime(),
    );
    return {
      fromMs: Math.max(bounds.fromMs, Math.min(from, to)),
      toMs: Math.min(bounds.toMs, Math.max(from, to)),
    };
  }

  return bounds;
}

/** Resolve filter inside a selected month (wrapper around resolveWithinPeriod). */
export function resolveWithinMonth(
  monthKey: MonthKey,
  scope: WithinMonthScope,
  dataFromMs: number,
  dataToMs: number,
  options?: {
    selectedDay?: string;
    windowStart?: string;
    customFrom?: string;
    customTo?: string;
  },
): PeriodRange {
  return resolveWithinPeriod(
    monthBounds(monthKey, dataFromMs, dataToMs),
    scope,
    options,
  );
}

/** Calendar days available inside a period (clipped to data). */
export function listDaysInPeriod(
  bounds: PeriodRange,
): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  let cursor = startOfLocalDay(bounds.fromMs);
  const end = startOfLocalDay(bounds.toMs);

  while (cursor <= end) {
    const d = new Date(cursor);
    items.push({
      id: toDateInputValue(cursor),
      label: String(d.getDate()),
    });
    cursor += DAY_MS;
  }
  return items;
}

export function listDaysInMonth(
  monthKey: MonthKey,
  dataFromMs: number,
  dataToMs: number,
): { id: string; label: string }[] {
  return listDaysInPeriod(monthBounds(monthKey, dataFromMs, dataToMs));
}

/**
 * Non-overlapping windows inside a period.
 * Fixed-length windows cover the span; the last window absorbs any remainder
 * (no stub chip for leftover days — e.g. January → 4×7d or 2×14d, not 5/3).
 */
export function listWindowsInPeriod(
  bounds: PeriodRange,
  lengthDays: 7 | 14,
): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  const first = startOfLocalDay(bounds.fromMs);
  const last = startOfLocalDay(bounds.toMs);
  const spanDays = Math.floor((last - first) / DAY_MS) + 1;

  if (spanDays <= 0) return items;

  const fullCount = Math.floor(spanDays / lengthDays);

  // Shorter than one window: single chip for the whole span
  if (fullCount === 0) {
    items.push({
      id: toDateInputValue(first),
      label: `${formatShortDay(first)}–${formatShortDay(last)}`,
    });
    return items;
  }

  for (let i = 0; i < fullCount; i++) {
    const startMs = first + i * lengthDays * DAY_MS;
    const endMs =
      i === fullCount - 1
        ? last
        : startMs + (lengthDays - 1) * DAY_MS;
    items.push({
      id: toDateInputValue(startMs),
      label: `${formatShortDay(startMs)}–${formatShortDay(endMs)}`,
    });
  }

  return items;
}

export function listWindowsInMonth(
  monthKey: MonthKey,
  dataFromMs: number,
  dataToMs: number,
  lengthDays: 7 | 14,
): { id: string; label: string }[] {
  return listWindowsInPeriod(
    monthBounds(monthKey, dataFromMs, dataToMs),
    lengthDays,
  );
}

/** Default parent = quarter containing the preferred default month. */
export function defaultParentKey(
  fromMs: number,
  toMs: number,
): ParentPeriodKey {
  const months = listMonthPresets(fromMs, toMs);
  const january = months.find((m) => m.id.endsWith("-01"));
  const monthKey =
    january?.id ??
    months[0]?.id ??
    toMonthKey(new Date(fromMs).getFullYear(), new Date(fromMs).getMonth() + 1);
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return toQuarterKey(new Date(fromMs).getFullYear(), 1);
  }
  return toQuarterKey(parsed.year, quarterOfMonth(parsed.month));
}

function formatShortDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}.`;
}

/** Last calendar day in a period (fallback: data end date). */
export function defaultDay(bounds: PeriodRange, dataToMs: number): string {
  const days = listDaysInPeriod(bounds);
  return days.at(-1)?.id ?? toDateInputValue(dataToMs);
}

/** Last fixed-length window start in a period (fallback: data start date). */
export function defaultWindow(
  bounds: PeriodRange,
  dataFromMs: number,
  length: 7 | 14,
): string {
  const windows = listWindowsInPeriod(bounds, length);
  return windows.at(-1)?.id ?? toDateInputValue(dataFromMs);
}
