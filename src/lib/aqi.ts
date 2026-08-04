/** WHO / gyakorlati PM2.5 sávok (µg/m³). */
export function pmTone(value: number): "good" | "moderate" | "poor" | "bad" {
  if (value < 15) return "good";
  if (value < 25) return "moderate";
  if (value < 80) return "poor";
  return "bad";
}

export function pmLabel(value: number): string {
  switch (pmTone(value)) {
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

export const WHO_24H = 15;
export const GRAFANA_THRESHOLD = 80;
