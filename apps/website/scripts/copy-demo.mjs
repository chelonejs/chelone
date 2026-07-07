// Decision B (p7g §4): the demo ships as a SEPARATE Vite SPA, linked out — NOT
// folded into this SSG shell's react-router tree. To make it reachable at
// `/demo/` on the single deployed static site, we copy the demo's built `dist/`
// into the website's static output at `build/client/demo/` after the SSG build.
//
// The demo is built with `base: "/demo/"` + `<BrowserRouter basename="/demo">`
// (see apps/demo/{vite.config.ts,src/App.tsx}), so every asset URL and client
// route already resolves under `/demo/`. This script only relocates the bundle.
//
// A static host serving `build/client/` then serves the working admin at
// `/demo/index.html`; the landing/footer "Demo" links are plain <a href="/demo/">
// (hard navigation), so the site's react-router never intercepts them.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const demoRoot = resolve(websiteRoot, "../demo");
const demoDist = resolve(demoRoot, "dist");
const dest = resolve(websiteRoot, "build/client/demo");

// Build the demo (its own vite build → apps/demo/dist with base "/demo/").
// pnpm resolves the workspace member; stdio inherits so build errors surface.
console.log("[copy-demo] building @chelone/demo…");
execFileSync("pnpm", ["--filter", "@chelone/demo", "build"], {
  cwd: websiteRoot,
  stdio: "inherit",
});

if (!existsSync(demoDist)) {
  throw new Error(`[copy-demo] demo build produced no dist at ${demoDist}`);
}

// Fresh copy each run (avoid stale assets from a prior build lingering).
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(demoDist, dest, { recursive: true });

console.log(`[copy-demo] copied ${demoDist} → ${dest}`);
