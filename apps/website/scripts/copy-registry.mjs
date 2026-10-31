// Serve the React registry under `/r` and the Vue registry under `/r/vue`,
// matching their components.json URLs. Build and check both registries before
// copying them into the website's static output after the SSG build.
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
// React must be copied first: replacing `/r` would remove a prior Vue copy.
const registries = [
  {
    packageName: "@chelone/react",
    registryDist: resolve(websiteRoot, "../../packages/react/dist/r"),
    dest: resolve(websiteRoot, "build/client/r"),
  },
  {
    packageName: "@chelone/vue",
    registryDist: resolve(websiteRoot, "../../packages/vue/dist/r"),
    dest: resolve(websiteRoot, "build/client/r/vue"),
  },
];

for (const { packageName, registryDist } of registries) {
  console.log(`[copy-registry] building the ${packageName} registry…`);
  execFileSync("pnpm", ["--filter", packageName, "registry:build"], {
    cwd: websiteRoot,
    stdio: "inherit",
  });

  // The registry CLIs exit 0 on error, so check every declared item, plus
  // registry.json itself, exists and parses before publishing either registry.
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
}

for (const { registryDist, dest } of registries) {
  // Copy beside the destination, then swap, so a failed copy keeps the old output.
  const staging = `${dest}.tmp`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(registryDist, staging, { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  renameSync(staging, dest);

  console.log(`[copy-registry] copied ${registryDist} → ${dest}`);
}
