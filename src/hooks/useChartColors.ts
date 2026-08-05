import { useEffect, useState } from "react";
import { readChartColors, type ChartColors } from "../lib/theme";

const FALLBACK: ChartColors = {
  text: "#e9f2f4",
  textMuted: "#8aa0a8",
  line: "rgba(232, 240, 242, 0.12)",
  grid: "rgba(232, 240, 242, 0.08)",
  elevated: "#121c22",
  accent: "#7dffa8",
  good: "#7dffa8",
  moderate: "#d6e56a",
  poor: "#ffb347",
  bad: "#ff5c4d",
  chartMean: "#5ec8ff",
};

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(() => {
    if (typeof document === "undefined") return FALLBACK;
    return readChartColors();
  });

  useEffect(() => {
    const sync = () => setColors(readChartColors());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
