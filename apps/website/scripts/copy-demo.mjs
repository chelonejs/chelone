// Decision B (p7g §4): the demo ships as a SEPARATE Vite SPA, linked out — NOT
// folded into this SSG shell's react-router tree. To make it reachable at
// `/demo/` on the single deployed static site, we copy the demo's built `dist/`
// into the website's static output at `build/client/demo/` after the SSG build.
//
// The demo is built with `base: "/demo/"` + `<BrowserRouter basename="/demo">`
// (see apps/demo/{vite.config.ts,src/App.tsx}), so every asset URL and client
// route already resolves under `/demo/`. This script only relocates the bundle.
// The Vue demo does the same under `/vue-demo/`.
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

const DEMOS = [
  { app: "demo", name: "@chelone/demo" },
  { app: "vue-demo", name: "@chelone/vue-demo" },
];

for (const { app, name } of DEMOS) {
  const dist = resolve(websiteRoot, "..", app, "dist");
  const dest = resolve(websiteRoot, "build/client", app);

  // Build the demo (its own vite build, with its base under the app's name).
  // pnpm resolves the workspace member; stdio inherits so build errors surface.
  console.log(`[copy-demo] building ${name}…`);
  execFileSync("pnpm", ["--filter", name, "build"], {
    cwd: websiteRoot,
    stdio: "inherit",
  });

  if (!existsSync(dist)) {
    throw new Error(`[copy-demo] ${name} build produced no dist at ${dist}`);
  }

  // Fresh copy each run (avoid stale assets from a prior build lingering).
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(dist, dest, { recursive: true });

  console.log(`[copy-demo] copied ${dist} → ${dest}`);
}
