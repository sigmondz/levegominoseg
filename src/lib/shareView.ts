const MONTHS_HU = [
  "jan.",
  "feb.",
  "márc.",
  "ápr.",
  "máj.",
  "jún.",
  "júl.",
  "aug.",
  "szept.",
  "okt.",
  "nov.",
  "dec.",
] as const;

function parts(ms: number): { year: number; month: number; day: number } {
  const d = new Date(ms);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

/** Compact Hungarian date range, e.g. "feb. 22–28" or "feb. 28 – márc. 3". */
export function formatShareRange(fromMs: number, toMs: number): string {
  const a = parts(fromMs);
  const b = parts(toMs);
  const monthA = MONTHS_HU[a.month]!;
  const monthB = MONTHS_HU[b.month]!;

  if (a.year === b.year && a.month === b.month && a.day === b.day) {
    return `${monthA} ${a.day}`;
  }

  if (a.year === b.year && a.month === b.month) {
    return `${monthA} ${a.day}–${b.day}`;
  }

  if (a.year === b.year) {
    return `${monthA} ${a.day} – ${monthB} ${b.day}`;
  }

  return `${a.year}. ${monthA} ${a.day} – ${b.year}. ${monthB} ${b.day}`;
}

/** Short share blurb, e.g. "Nagymaros, feb. 22–28, átlag 27.7". */
export function buildSharePreview(
  fromMs: number,
  toMs: number,
  mean: number,
): string {
  return `Nagymaros, ${formatShareRange(fromMs, toMs)}, átlag ${mean.toFixed(1)}`;
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}
