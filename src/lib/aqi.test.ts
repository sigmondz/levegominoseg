import { describe, expect, test } from "bun:test";
import { GRAFANA_THRESHOLD, pmLabel, pmTone, WHO_24H } from "./aqi";

describe("aqi", () => {
  test("pmTone sávok", () => {
    expect(pmTone(10)).toBe("good");
    expect(pmTone(14.9)).toBe("good");
    expect(pmTone(15)).toBe("moderate");
    expect(pmTone(24.9)).toBe("moderate");
    expect(pmTone(25)).toBe("poor");
    expect(pmTone(79.9)).toBe("poor");
    expect(pmTone(80)).toBe("bad");
    expect(pmTone(200)).toBe("bad");
  });

  test("pmLabel magyar címkék", () => {
    expect(pmLabel(10)).toBe("jó");
    expect(pmLabel(20)).toBe("mérsékelt");
    expect(pmLabel(50)).toBe("rossz");
    expect(pmLabel(90)).toBe("kritikus");
  });

  test("konstans határértékek", () => {
    expect(WHO_24H).toBe(15);
    expect(GRAFANA_THRESHOLD).toBe(80);
  });
});
