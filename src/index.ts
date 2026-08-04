import { serve } from "bun";
import index from "./index.html";

function publicFile(relativePath: string) {
  return Bun.file(new URL(`../public/${relativePath}`, import.meta.url));
}

const isProd = process.env.NODE_ENV === "production";
const preferredPort = Number(process.env.PORT) || 3000;

function start(port: number) {
  try {
    return serve({
      port,
      routes: {
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

          return new Response(file);
        },

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
