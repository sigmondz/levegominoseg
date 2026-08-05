import { describe, expect, test } from "bun:test";
import {
  buildYAxisTicks,
  chartYDomainMax,
  formatYAxisTick,
  nearlyEqual,
} from "./chartAxis";

describe("chartAxis", () => {
  test("több, szellős ticket ad, és beemeli a WHO / átlag értékeket", () => {
    const ticks = buildYAxisTicks(60, [15, 22.4]);
    expect(ticks[0]).toBe(0);
    expect(ticks).toContain(15);
    expect(ticks).toContain(22.4);
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    expect(ticks.at(-1)).toBe(60);
  });

  test("magas tartománynál sűrűbb tengelyt ad", () => {
    const ticks = buildYAxisTicks(200, [15, 36.5]);
    expect(ticks).toContain(15);
    expect(ticks).toContain(36.5);
    expect(ticks.length).toBeGreaterThanOrEqual(9);
    expect(ticks.at(-1)).toBe(200);
  });

  test("közeli WHO és átlag is megmarad a tengelyen", () => {
    const ticks = buildYAxisTicks(250, [45, 38.1]);
    expect(ticks).toContain(45);
    expect(ticks).toContain(38.1);
  });

  test("közeli sima ticket a marker javára elhagyja", () => {
    const ticks = buildYAxisTicks(50, [15]);
    expect(ticks).toContain(15);
    expect(ticks.filter((tick) => nearlyEqual(tick, 15, 2)).length).toBe(1);
  });

  test("a tartományt kerek, olvasható plafonra emeli", () => {
    expect(chartYDomainMax(14)).toBeGreaterThanOrEqual(15);
    expect(chartYDomainMax(0)).toBeGreaterThanOrEqual(1);
  });

  test("az Y címkét olvashatóan formázza", () => {
    expect(formatYAxisTick(15)).toBe("15");
    expect(formatYAxisTick(12.4)).toBe("12.4");
    expect(formatYAxisTick(12.01)).toBe("12");
  });
});
