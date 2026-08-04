export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "levego-theme";

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function resolveInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;

  let meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "color-scheme");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", theme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export type ChartColors = {
  text: string;
  textMuted: string;
  line: string;
  grid: string;
  elevated: string;
  accent: string;
  good: string;
  poor: string;
  bad: string;
  chartMean: string;
};

export function readChartColors(): ChartColors {
  return {
    text: readCssVar("--text"),
    textMuted: readCssVar("--text-muted"),
    line: readCssVar("--line"),
    grid: readCssVar("--chart-grid"),
    elevated: readCssVar("--bg-elevated"),
    accent: readCssVar("--accent"),
    good: readCssVar("--good"),
    poor: readCssVar("--poor"),
    bad: readCssVar("--bad"),
    chartMean: readCssVar("--chart-mean"),
  };
}
