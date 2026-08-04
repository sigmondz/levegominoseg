import { describe, expect, test } from "bun:test";
import {
  above80Tone,
  daysAboveWhoTone,
  GRAFANA_THRESHOLD,
  parseMetricSlug,
  pmLabel,
  pmTone,
  seriesUrl,
  who24h,
  WHO_24H,
} from "./aqi";

describe("aqi", () => {
  test("pmTone sávok PM2.5", () => {
    expect(pmTone(10)).toBe("good");
    expect(pmTone(14.9)).toBe("good");
    expect(pmTone(15)).toBe("moderate");
    expect(pmTone(24.9)).toBe("moderate");
    expect(pmTone(25)).toBe("poor");
    expect(pmTone(29.9)).toBe("poor");
    expect(pmTone(30)).toBe("bad");
    expect(pmTone(54.5)).toBe("bad");
    expect(pmTone(80)).toBe("bad");
    expect(pmTone(200)).toBe("bad");
  });

  test("pmTone sávok PM10 WHO 45-höz igazítva", () => {
    expect(pmTone(40, "PM10")).toBe("good");
    expect(pmTone(45, "PM10")).toBe("moderate");
    expect(pmTone(74, "PM10")).toBe("moderate");
    expect(pmTone(75, "PM10")).toBe("poor");
    expect(pmTone(89, "PM10")).toBe("poor");
    expect(pmTone(90, "PM10")).toBe("bad");
  });

  test("pmLabel magyar címkék", () => {
    expect(pmLabel(10)).toBe("jó");
    expect(pmLabel(20)).toBe("mérsékelt");
    expect(pmLabel(27)).toBe("rossz");
    expect(pmLabel(30)).toBe("kritikus");
  });

  test("above80Tone a százalék alapján", () => {
    expect(above80Tone(0)).toBe("good");
    expect(above80Tone(1)).toBe("moderate");
    expect(above80Tone(5)).toBe("poor");
    expect(above80Tone(10)).toBe("bad");
  });

  test("daysAboveWhoTone a naparány alapján", () => {
    expect(daysAboveWhoTone(0, 31)).toBe("good");
    expect(daysAboveWhoTone(1, 31)).toBe("moderate");
    expect(daysAboveWhoTone(5, 31)).toBe("poor");
    expect(daysAboveWhoTone(15, 31)).toBe("bad");
  });

  test("who24h metrikánként", () => {
    expect(who24h("PM2.5")).toBe(15);
    expect(who24h("PM10")).toBe(45);
    expect(who24h("PM1")).toBeNull();
  });

  test("parseMetricSlug és seriesUrl", () => {
    expect(parseMetricSlug("pm1")).toBe("PM1");
    expect(parseMetricSlug("pm25")).toBe("PM2.5");
    expect(parseMetricSlug("pm10")).toBe("PM10");
    expect(parseMetricSlug("nope")).toBeNull();
    expect(seriesUrl("PM1")).toBe("/data/series-pm1.json");
    expect(seriesUrl("PM2.5")).toBe("/data/series-pm25.json");
    expect(seriesUrl("PM10")).toBe("/data/series-pm10.json");
  });

  test("konstans határértékek", () => {
    expect(WHO_24H).toBe(15);
    expect(GRAFANA_THRESHOLD).toBe(80);
  });
});
