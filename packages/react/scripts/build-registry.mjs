#!/usr/bin/env node

// Builds registry.json into dist/r/<name>.json (one file per item) + a copy of
// registry.json, via the pinned shadcn CLI. Run: pnpm registry:build.
//
// CRITICAL: `shadcn build` EXITS 0 ON ERROR. The real gate is not the CLI exit
// code — it's that dist/r holds one valid, non-empty JSON per item plus
// registry.json, and that no @chelone/<x> dep dangles. We assert all of that
// here after the CLI runs, so a partial/failed build fails loud. Never pipe the
// build through `tail` (would mask the exit code AND the emitted-file check).

import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const cwd = process.cwd();
const registryPath = path.resolve(cwd, "registry.json");
const outputDir = path.resolve(cwd, "dist/r");
const registryItemSchema = "https://ui.shadcn.com/schema/registry-item.json";

// Items shadcn's builder OOMs on (huge, highly-connected blocks) are built by
// hand instead. Chelone currently has none, but the mechanism is preserved so a
// future heavy block can be added here without a rewrite.
const manualBuildItems = new Set();

const dedupeBy = (items, keySelector) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keySelector(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const withFileContents = async (item) => {
  if (!item.files?.length) {
    return item;
  }

  item.files = dedupeBy(item.files, (file) => file.path);

  for (const file of item.files) {
    const filePath = path.resolve(cwd, file.path);
    const fileStat = await stat(filePath).catch(() => null);

    if (!fileStat?.isFile()) {
      throw new Error(
        `Manual registry build failed: file not found for item "${item.name}": ${file.path}`,
      );
    }

    file.content = await readFile(filePath, "utf8");
  }

  return item;
};

// The real gate: every item must have produced a valid, non-empty dist/r JSON,
// registry.json must be copied in, and no @chelone/<x> dep may dangle.
const verifyOutput = async (registry) => {
  const problems = [];
  const emitted = new Set(registry.items.map((i) => i.name));

  for (const item of registry.items) {
    const outPath = path.join(outputDir, `${item.name}.json`);
    const fileStat = await stat(outPath).catch(() => null);
    if (!fileStat?.isFile()) {
      problems.push(`missing dist output: ${item.name}.json`);
      continue;
    }
    const raw = await readFile(outPath, "utf8");
    if (raw.trim().length === 0) {
      problems.push(`empty dist output: ${item.name}.json`);
      continue;
    }
    try {
      JSON.parse(raw);
    } catch {
      problems.push(`invalid JSON: ${item.name}.json`);
    }
    for (const dep of item.registryDependencies ?? []) {
      if (dep.startsWith("@chelone/")) {
        const target = dep.slice("@chelone/".length);
        if (!emitted.has(target)) {
          problems.push(`dangling dep: ${item.name} -> ${dep}`);
        }
      }
    }
  }

  const rootStat = await stat(path.join(outputDir, "registry.json")).catch(
    () => null,
  );
  if (!rootStat?.isFile()) {
    problems.push("missing dist/r/registry.json");
  }

  if (problems.length > 0) {
    throw new Error(
      `Registry build gate failed (shadcn exits 0 on error — this is the real check):\n  ${problems.join("\n  ")}`,
    );
  }
};

const run = async () => {
  const rawRegistry = await readFile(registryPath, "utf8");
  const registry = JSON.parse(rawRegistry);

  // Clean stale artifacts: shadcn only writes the items it knows about, so
  // renamed/removed items from a prior build would otherwise linger in dist/r.
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const autoBuiltItems = registry.items.filter(
    (item) => !manualBuildItems.has(item.name),
  );

  if (autoBuiltItems.length > 0) {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "chelone-registry-"));
    const tempRegistryPath = path.join(tempDir, "registry.json");

    await writeFile(
      tempRegistryPath,
      JSON.stringify({ ...registry, items: autoBuiltItems }, null, 2),
    );

    // shadcn 4.x renamed `registry:build` -> `build` (same args).
    execFileSync(
      "pnpm",
      ["exec", "shadcn", "build", tempRegistryPath, "-o", outputDir],
      { cwd, stdio: "inherit" },
    );

    await rm(tempDir, { recursive: true, force: true });
  }

  const manualItems = registry.items.filter((item) =>
    manualBuildItems.has(item.name),
  );

  for (const item of manualItems) {
    const itemCopy = JSON.parse(JSON.stringify(item));
    itemCopy.$schema = registryItemSchema;

    if (itemCopy.dependencies) {
      itemCopy.dependencies = dedupeBy(itemCopy.dependencies, (dep) => dep);
    }

    if (itemCopy.devDependencies) {
      itemCopy.devDependencies = dedupeBy(
        itemCopy.devDependencies,
        (dep) => dep,
      );
    }

    if (itemCopy.registryDependencies) {
      itemCopy.registryDependencies = dedupeBy(
        itemCopy.registryDependencies,
        (dep) => dep,
      );
    }

    await withFileContents(itemCopy);

    await writeFile(
      path.join(outputDir, `${itemCopy.name}.json`),
      `${JSON.stringify(itemCopy, null, 2)}\n`,
    );
  }

  await copyFile(registryPath, path.join(outputDir, "registry.json"));

  await verifyOutput(registry);

  console.log(
    `Built ${registry.items.length} items into ${path.relative(cwd, outputDir)} (+ registry.json). Gate passed.`,
  );
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
