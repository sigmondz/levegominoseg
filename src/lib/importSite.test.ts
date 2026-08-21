import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { importSite, ImportSiteError } from "./importSite";
import { parseCatalog } from "./catalog";

const CSV = `Time,SPS30 PM2.5
2026-02-01 00:00:00,10
2026-02-01 00:03:00,12
`;

const CSV_PM10 = `Time,SPS30 PM10
2026-02-01 00:00:00,20
2026-02-01 00:03:00,22
`;

describe("importSite", () => {
  test("új helyszín catalog + lapos JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "levego-import-"));
    try {
      const site = await importSite({
        dataDir: dir,
        id: "nagymaros-iskola01",
        label: "Iskola 01",
        csvs: [{ name: "pm25.csv", text: CSV }],
      });
      expect(site.id).toBe("nagymaros-iskola01");
      expect(site.metrics).toEqual(["PM2.5"]);
      expect(site.files["PM2.5"]).toBe("/data/nagymaros-iskola01-pm25.json");

      const catalog = parseCatalog(
        JSON.parse(await readFile(join(dir, "catalog.json"), "utf8")),
      );
      expect(catalog[0]?.id).toBe("nagymaros-iskola01");
      const series = JSON.parse(
        await readFile(join(dir, "nagymaros-iskola01-pm25.json"), "utf8"),
      ) as { points: unknown[] };
      expect(series.points).toHaveLength(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("felülírás ugyanarra a slugra", async () => {
    const dir = await mkdtemp(join(tmpdir(), "levego-import-"));
    try {
      await importSite({
        dataDir: dir,
        id: "nagymaros-ovoda01",
        label: "Óvoda 01",
        csvs: [{ name: "a.csv", text: CSV }],
      });
      const again = await importSite({
        dataDir: dir,
        id: "nagymaros-ovoda01",
        label: "Óvoda 01b",
        csvs: [
          { name: "a.csv", text: CSV },
          { name: "b.csv", text: CSV_PM10 },
        ],
      });
      expect(again.label).toBe("Óvoda 01b");
      expect(again.metrics).toEqual(["PM2.5", "PM10"]);
      const catalog = parseCatalog(
        JSON.parse(await readFile(join(dir, "catalog.json"), "utf8")),
      );
      expect(catalog).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("hibás CSV nem ír a diskre", async () => {
    const dir = await mkdtemp(join(tmpdir(), "levego-import-"));
    try {
      await expect(
        importSite({
          dataDir: dir,
          id: "nagymaros-iskola01",
          label: "Iskola 01",
          csvs: [{ name: "bad.csv", text: "nincs fejléc" }],
        }),
      ).rejects.toBeInstanceOf(ImportSiteError);
      await expect(readFile(join(dir, "catalog.json"), "utf8")).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
