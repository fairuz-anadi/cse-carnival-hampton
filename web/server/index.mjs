import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createApiMiddleware } from "./api.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const distRoot = join(webRoot, "dist");
const port = Number(process.env.PORT ?? 3000);
const api = createApiMiddleware();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const server = createServer((req, res) => {
  api(req, res, () => {
    void serveStatic(req, res);
  });
});

server.listen(port, () => {
  console.log(`CampusOS running at http://localhost:${port}`);
});

async function serveStatic(req, res) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    const requested = pathname === "/" ? "/index.html" : pathname;
    const candidate = resolve(distRoot, `.${normalize(requested)}`);
    const filePath = candidate.startsWith(distRoot) ? candidate : join(distRoot, "index.html");

    const stats = await stat(filePath).catch(() => null);
    const resolvedPath = stats?.isFile() ? filePath : join(distRoot, "index.html");
    const ext = extname(resolvedPath);

    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypes[ext] ?? "application/octet-stream");
    createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(error instanceof Error ? error.message : "Unable to serve app");
  }
}
