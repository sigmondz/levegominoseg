import { resolve } from "node:path";
import { importSite, ImportSiteError } from "../src/lib/importSite";

function usage(): never {
  console.error(
    'Használat: bun run import-site -- --id nagymaros-iskola01 --label "Iskola 01" [--chip CHIP] file.csv [file.csv…]',
  );
  process.exit(1);
}

function takeArg(
  argv: string[],
  flag: string,
): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) usage();
  argv.splice(index, 2);
  return value;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const id = takeArg(argv, "--id");
  const label = takeArg(argv, "--label");
  const chipId = takeArg(argv, "--chip");
  const files = argv.filter((arg) => !arg.startsWith("--"));
  if (!id || !label || files.length === 0) usage();

  const csvs = await Promise.all(
    files.map(async (file) => {
      const path = resolve(file);
      const text = await Bun.file(path).text();
      return { name: path, text };
    }),
  );

  const dataDir = resolve(import.meta.dir, "../public/data");
  try {
    const site = await importSite({ dataDir, id, label, chipId, csvs });
    console.log(`${site.label} (${site.id})`);
    console.log(`metrikák: ${site.metrics.join(", ")}`);
    for (const metric of site.metrics) {
      console.log(`  ${site.files[metric]}`);
    }
  } catch (error) {
    const message =
      error instanceof ImportSiteError ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

await main();
