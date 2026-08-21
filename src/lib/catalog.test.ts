import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SITE_ID,
  isSiteId,
  parseCatalog,
  pickMetric,
  resolveSite,
  seriesPublicPath,
} from "./catalog";
import { TEST_CATALOG, TEST_SITE_HAZ, TEST_SITE_ISKOLA } from "../test/fixtures";

describe("catalog", () => {
  test("isSiteId", () => {
    expect(isSiteId("nagymaros-haz01")).toBe(true);
    expect(isSiteId("nagymaros-iskola01")).toBe(true);
    expect(isSiteId("pm25")).toBe(false);
    expect(isSiteId("Nagymaros-haz01")).toBe(false);
  });

  test("parseCatalog és resolveSite", () => {
    const sites = parseCatalog(TEST_CATALOG);
    expect(sites).toHaveLength(2);
    expect(resolveSite(sites, null).id).toBe(DEFAULT_SITE_ID);
    expect(resolveSite(sites, "nincs").id).toBe(DEFAULT_SITE_ID);
    expect(resolveSite(sites, "nagymaros-iskola01").id).toBe(
      "nagymaros-iskola01",
    );
  });

  test("pickMetric hiányzó preferencia esetén első elérhető", () => {
    expect(pickMetric(TEST_SITE_ISKOLA, "PM1")).toBe("PM2.5");
    expect(pickMetric(TEST_SITE_HAZ, "PM10")).toBe("PM10");
  });

  test("seriesPublicPath lapos fájlnév", () => {
    expect(seriesPublicPath("nagymaros-iskola01", "PM2.5")).toBe(
      "/data/nagymaros-iskola01-pm25.json",
    );
  });

  test("parseCatalog elutasítja a hibás JSON-t", () => {
    expect(() => parseCatalog({})).toThrow();
    expect(() => parseCatalog({ sites: [] })).toThrow();
  });
});
