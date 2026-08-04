import { describe, expect, test } from "bun:test";
import {
  GRAFANA_THRESHOLD,
  pmLabel,
  pmTone,
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
    expect(pmTone(79.9)).toBe("poor");
    expect(pmTone(80)).toBe("bad");
    expect(pmTone(200)).toBe("bad");
  });

  test("pmTone sávok PM10 WHO 45-höz igazítva", () => {
    expect(pmTone(40, "PM10")).toBe("good");
    expect(pmTone(45, "PM10")).toBe("moderate");
    expect(pmTone(74, "PM10")).toBe("moderate");
    expect(pmTone(75, "PM10")).toBe("poor");
  });

  test("pmLabel magyar címkék", () => {
    expect(pmLabel(10)).toBe("jó");
    expect(pmLabel(20)).toBe("mérsékelt");
    expect(pmLabel(50)).toBe("rossz");
    expect(pmLabel(90)).toBe("kritikus");
  });

  test("who24h metrikánként", () => {
    expect(who24h("PM2.5")).toBe(15);
    expect(who24h("PM10")).toBe(45);
    expect(who24h("PM1")).toBeNull();
  });

  test("konstans határértékek", () => {
    expect(WHO_24H).toBe(15);
    expect(GRAFANA_THRESHOLD).toBe(80);
  });
});
