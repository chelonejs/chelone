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
//
// Each demo folder also gets a `404.html` copied from its own `index.html`.
// Cloudflare Pages answers an unmatched path with the NEAREST `404.html`, so
// without one `/demo/posts` falls through to the site root's SPA fallback and
// renders the docs shell. With it the demo serves its own deep links: the shell
// loads `/demo/assets/*` and the demo's router renders the route. The status is
// 404, which is fine for a client-rendered demo — see docs/deploying.md.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");

export const DEMOS = [
  { app: "demo", name: "@chelone/demo" },
  { app: "vue-demo", name: "@chelone/vue-demo" },
];

/**
 * Relocate one built demo `dist/` into the website's static output, then give it
 * a `404.html` of its own so Pages serves the demo (not the docs site) for a
 * deep link under that folder.
 */
export function copyDemoBuild({ dist, dest }) {
  if (!existsSync(dist)) {
    throw new Error(`[copy-demo] no demo build at ${dist}`);
  }

  // Fresh copy each run (avoid stale assets from a prior build lingering).
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(dist, dest, { recursive: true });

  const index = resolve(dest, "index.html");
  if (!existsSync(index)) {
    throw new Error(`[copy-demo] ${dist} emitted no index.html, so ${dest} can have no 404.html`);
  }
  copyFileSync(index, resolve(dest, "404.html"));

  return dest;
}

function main() {
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

    copyDemoBuild({ dist, dest });
    console.log(`[copy-demo] copied ${dist} → ${dest} with its own 404.html`);
  }
}

/**
 * True when this module is the script Node was asked to run.
 *
 * Node resolves a module through symlinks, so `import.meta.url` is a realpath
 * while `process.argv[1]` is the path as typed. Realpath the argument too, or a
 * checkout reached through a symlink (macOS `/tmp` is `/private/tmp`) makes the
 * two disagree, `main()` never runs, and the build ships no demos with no error.
 */
export function isMain(moduleUrl, argvPath) {
  return Boolean(argvPath) && moduleUrl === pathToFileURL(realpathSync(argvPath)).href;
}

if (isMain(import.meta.url, process.argv[1])) main();
