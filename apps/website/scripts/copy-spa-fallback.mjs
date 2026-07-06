// Copy React Router's SPA fallback to 404.html so static hosts (GitHub Pages)
// serve the app on deep-link refreshes. Portable (no Unix `cp`) and no-ops with
// a warning if RR ever renames/omits the fallback.
import { copyFileSync, existsSync } from "node:fs";

const src = "build/client/__spa-fallback.html";
const dest = "build/client/404.html";

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log("wrote build/client/404.html");
} else {
  console.warn(`warning: ${src} not found — skipped 404.html (SPA deep-link refreshes may 404)`);
}
