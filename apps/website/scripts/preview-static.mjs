// Minimal static server that mimics a real static host serving `build/client`:
// serves files verbatim (so `/demo/*` returns the standalone demo bundle) and
// falls back to `404.html` (the SPA hydration shell) for any unmatched route
// (so client routes like `/docs/components` render). Verification-only — the
// production deploy uses a real static host with the same fallback semantics.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../build/client", import.meta.url));
const PORT = Number(process.env.PORT) || 4373;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const send = (res, code, file) => {
  res.writeHead(code, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
};

createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let fsPath = join(ROOT, normalize(urlPath));
  if (existsSync(fsPath) && statSync(fsPath).isDirectory()) fsPath = join(fsPath, "index.html");
  if (existsSync(fsPath) && statSync(fsPath).isFile()) return send(res, 200, fsPath);
  // SPA fallback — hydrate the client router for non-prerendered routes.
  return send(res, 200, join(ROOT, "404.html"));
}).listen(PORT, () => console.log(`[preview-static] serving ${ROOT} on :${PORT}`));
