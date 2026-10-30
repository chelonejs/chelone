// The landing page and both components.json files point at
// `https://chelone.dev/r/{name}.json`, so the static site must serve the shadcn
// registry under `/r`. `registry:build` writes it to `packages/react/dist/r`;
// this copies it into the website's static output at `build/client/r/` after
// the SSG build.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
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

// `shadcn build` exits 0 on error, so check every item the registry declares,
// plus registry.json itself, and that each file parses.
const source = JSON.parse(
  readFileSync(resolve(registryDist, "../../registry.json"), "utf8"),
);
const required = [
  "registry.json",
  ...source.items.map((item) => `${item.name}.json`),
];
for (const file of required) {
  const path = resolve(registryDist, file);
  if (!existsSync(path)) {
    throw new Error(
      `[copy-registry] registry build produced no ${file} in ${registryDist}`,
    );
  }
  try {
    JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `[copy-registry] ${path} is not valid JSON: ${error.message}`,
    );
  }
}

// Copy beside the destination, then swap, so a failed copy keeps the old output.
const staging = `${dest}.tmp`;
rmSync(staging, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
cpSync(registryDist, staging, { recursive: true });
rmSync(dest, { recursive: true, force: true });
renameSync(staging, dest);

console.log(`[copy-registry] copied ${registryDist} → ${dest}`);
