import { serve } from "bun";
import { fileURLToPath } from "node:url";
import index from "./index.html";
import { ImportSiteError, importSite } from "./lib/importSite";

function publicFile(relativePath: string) {
  return Bun.file(new URL(`../public/${relativePath}`, import.meta.url));
}

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function contentTypeFor(path: string): string {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return CONTENT_TYPES[path.slice(dot)] ?? "application/octet-stream";
}

function isSafePublicPath(relativePath: string): boolean {
  return (
    Boolean(relativePath) &&
    !relativePath.includes("..") &&
    !relativePath.includes("\\") &&
    !relativePath.startsWith("/")
  );
}

async function servePublic(relativePath: string): Promise<Response> {
  if (!isSafePublicPath(relativePath)) {
    return new Response("Not found", { status: 404 });
  }

  const file = publicFile(relativePath);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": contentTypeFor(relativePath),
      "Cache-Control":
        relativePath === "sw.js" ? "no-cache" : "public, max-age=3600",
    },
  });
}

const isProd = process.env.NODE_ENV === "production";
const preferredPort = Number(process.env.PORT) || 3000;
const dataDir = fileURLToPath(new URL("../public/data", import.meta.url));

async function handleSiteImport(req: Request): Promise<Response> {
  if (isProd || req.method !== "POST") {
    return new Response("Not found", { status: 404 });
  }

  try {
    const form = await req.formData();
    const id = String(form.get("id") ?? "");
    const label = String(form.get("label") ?? "");
    const csvs: { name: string; text: string }[] = [];
    for (const entry of form.getAll("files")) {
      if (typeof entry === "string") continue;
      csvs.push({ name: entry.name || "upload.csv", text: await entry.text() });
    }
    const site = await importSite({ dataDir, id, label, csvs });
    return Response.json({ site });
  } catch (error) {
    const message =
      error instanceof ImportSiteError ? error.message : "Import hiba";
    const status = error instanceof ImportSiteError ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}

function start(port: number) {
  try {
    return serve({
      port,
      routes: {
        "/manifest.webmanifest": () => servePublic("manifest.webmanifest"),
        "/sw.js": () => servePublic("sw.js"),
        "/favicon.svg": () => servePublic("favicon.svg"),
        "/icons.svg": () => servePublic("icons.svg"),
        "/icons/:file": (req) => {
          const name = req.params.file;
          if (!name || name.includes("/") || name.includes("\\")) {
            return new Response("Not found", { status: 404 });
          }
          return servePublic(`icons/${name}`);
        },
        "/data/:file": async (req) => {
          const name = req.params.file;
          if (
            !name ||
            name.includes("..") ||
            name.includes("/") ||
            name.includes("\\")
          ) {
            return new Response("Not found", { status: 404 });
          }

          const file = publicFile(`data/${name}`);
          if (!(await file.exists())) {
            return new Response("Not found", { status: 404 });
          }

          return new Response(await file.arrayBuffer(), {
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });
        },
        "/api/sites": (req) => handleSiteImport(req),

        "/*": index,
      },
      development: !isProd && {
        hmr: true,
        console: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const busy =
      message.includes("EADDRINUSE") || message.toLowerCase().includes("in use");
    if (!isProd && busy && port < preferredPort + 20) {
      console.warn(`Port ${port} foglalt, próbálom: ${port + 1}`);
      return start(port + 1);
    }
    throw error;
  }
}

const server = start(preferredPort);
console.log(`Levegő fut: ${server.url}`);
