// The landing page and both components.json files point at
// `https://chelone.dev/r/{name}.json`, so the static site must serve the shadcn
// registry under `/r`. `registry:build` writes it to `packages/react/dist/r`;
// this copies it into the website's static output at `build/client/r/` after
// the SSG build.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const registryDist = resolve(websiteRoot, "../../packages/react/dist/r");
const dest = resolve(websiteRoot, "build/client/r");

console.log("[copy-registry] building the @chelone/react registry…");
execFileSync("pnpm", ["--filter", "@chelone/react", "registry:build"], {
  cwd: websiteRoot,
  stdio: "inherit",
});

// `shadcn build` exits 0 on error, so check the files the site links to.
for (const file of ["registry.json", "admin.json"]) {
  if (!existsSync(resolve(registryDist, file))) {
    throw new Error(
      `[copy-registry] registry build produced no ${file} in ${registryDist}`,
    );
  }
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(registryDist, dest, { recursive: true });

console.log(`[copy-registry] copied ${registryDist} → ${dest}`);
