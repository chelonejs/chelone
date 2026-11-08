#!/usr/bin/env node

// Builds registry.json into dist/r/<name>.json (one file per item) + a copy of
// registry.json, via the package's pinned registry CLI (`engine.cli`: shadcn or
// shadcn-vue). Run: pnpm registry:build.
//
// CRITICAL: the CLI EXITS 0 ON ERROR. The real gate is not the CLI exit
// code — it's that dist/r holds one valid, non-empty JSON per item plus
// registry.json, and that no @chelone/<x> dep dangles. We assert all of that
// here after the CLI runs, so a partial/failed build fails loud. Never pipe the
// build through `tail` (would mask the exit code AND the emitted-file check).

import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  CLI,
  ENGINE_PACKAGE,
  importSource,
  isEngineRelative,
  resolveSpecifier,
  rewriteEngineImports,
  USE_CLIENT,
} from "./engine-seam.mjs";
import { fileToItemRef, resolveImport } from "./granularize-block.mjs";
import {
  hasUseClient,
  needsUseClient,
  withUseClient,
} from "./use-client.mjs";

const isScript = (file) => file.endsWith(".ts") || file.endsWith(".tsx");

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
    let emittedItem;
    try {
      emittedItem = JSON.parse(raw);
    } catch {
      problems.push(`invalid JSON: ${item.name}.json`);
    }
    if (USE_CLIENT) {
      for (const file of emittedItem?.files ?? []) {
        if (
          isScript(file.path) &&
          typeof file.content === "string" &&
          needsUseClient(file.content) &&
          !hasUseClient(file.content)
        ) {
          problems.push(
            `missing "use client": ${item.name} (${file.path})`,
          );
        }
      }
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
      `Registry build gate failed (the CLI exits 0 on error — this is the real check):\n  ${problems.join("\n  ")}`,
    );
  }
};

// EMIT-TIME ENGINE-SEAM REWRITE (the shadmin-core->ra-core analog).
//
// shadcn's `build` copies each source file's RAW content into dist/r/<item>.json
// files[].content — INCLUDING the deep engine relatives (`../../../form-hooks`)
// that 404 in a consumer (the engine is an npm package, not
// present as sibling files). This pass rewrites every ENGINE-relative specifier
// in shipped content to the bare engine package, and adds that npm dependency
// to any item whose content changed. Class-B sibling relatives (another shipped
// components/lib/hooks file) are LEFT ALONE — they resolve fine because shadcn
// preserves the src/… structure in the consumer. Runs over EVERY dist/r item
// (AUTO + MANUAL) so the rewrite reaches the final content regardless of how it
// was produced. `file.path` is the ORIGINAL source-relative path, so relatives
// resolve against the true source location.
const rewriteEmittedItems = async () => {
  const entries = await readdir(outputDir);
  let filesRewritten = 0;
  let itemsWithEngineDep = 0;
  let filesMarked = 0;

  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry === "registry.json") continue;
    const outPath = path.join(outputDir, entry);
    const item = JSON.parse(await readFile(outPath, "utf8"));
    if (!item.files?.length) continue;

    let itemRewrote = false;
    let itemMarked = false;
    for (const file of item.files) {
      if (typeof file.content !== "string") continue;
      if (USE_CLIENT && isScript(file.path)) {
        const marked = withUseClient(file.content);
        if (marked !== file.content) {
          file.content = marked;
          itemMarked = true;
          filesMarked += 1;
        }
      }
      const sourceAbs = path.resolve(cwd, file.path);
      const { content, rewrote } = rewriteEngineImports(
        file.content,
        sourceAbs,
        cwd,
      );
      if (rewrote) {
        file.content = content;
        itemRewrote = true;
        filesRewritten += 1;
      }
    }

    if (itemRewrote) {
      const deps = new Set(item.dependencies ?? []);
      deps.add(ENGINE_PACKAGE);
      item.dependencies = [...deps].sort();
      itemsWithEngineDep += 1;
    }

    if (itemRewrote || itemMarked) {
      await writeFile(outPath, `${JSON.stringify(item, null, 2)}\n`);
    }
  }

  return { filesRewritten, itemsWithEngineDep, filesMarked };
};

// CONTENT-AWARE ESCAPING-RELATIVE VALIDATOR (finding 3).
//
// verifyOutput only checks @chelone/<x> registry refs + declared files. It never
// inspected shipped file CONTENT for relative imports that escape the installed
// surface — the real 404 class. After the rewrite, assert NO shipped content
// still contains an ENGINE-relative: every relative/`@/` import in every dist/r
// file must resolve to a file under components/, lib/, or hooks/ (a
// structurally-installed sibling), NOT an engine file. Any survivor is an
// unrewritten seam that would fail `tsc`/build in a consumer (TS2307).
const IMPORT_SPEC_RE = /(?:\bfrom\s+|^\s*(?:import|export)\s+)["']([^"']+)["']/gm;

const validateNoEngineEscapes = async () => {
  const entries = await readdir(outputDir);
  const violations = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry === "registry.json") continue;
    const item = JSON.parse(
      await readFile(path.join(outputDir, entry), "utf8"),
    );
    if (!item.files?.length) continue;

    for (const file of item.files) {
      if (typeof file.content !== "string") continue;
      const sourceAbs = path.resolve(cwd, file.path);
      for (const m of importSource(file.path, file.content).matchAll(IMPORT_SPEC_RE)) {
        const spec = m[1];
        if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
        if (isEngineRelative(spec, sourceAbs, cwd)) {
          violations.push(
            `${item.name} (${file.path}) still imports engine relative "${spec}" — must be "${ENGINE_PACKAGE}"`,
          );
        }
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Registry engine-seam validator failed: ${violations.length} shipped ` +
        `file(s) import the engine via an escaping relative that 404s in a ` +
        `consumer (should be "${ENGINE_PACKAGE}"):\n  ${violations.join("\n  ")}`,
    );
  }
};

// CONTENT-AWARE ALIAS-RESOLUTION VALIDATOR (the @/ monolith gap).
//
// validateNoEngineEscapes guards ENGINE relatives → the engine package. It does NOT
// guard `@/`-alias imports that resolve to ANOTHER emitted registry item (the
// primitive layer): the `admin` monolith shipped 132 files importing 26+
// `@/components/ui/*` primitives while declaring registryDependencies:undefined
// — every one dangled (TS2307) on install. This validator asserts, for EVERY
// item, that every `@/components|lib|hooks/*` alias import in its shipped
// content resolves to EITHER (a) a file bundled in the SAME item, OR (b) a
// declared `@chelone/<basename>` registryDependency that IS an emitted item.
// Bare stock-shadcn refs (e.g. `use-mobile`) are covered by a plain-name
// registryDependency. ENGINE relatives are ignored here (validateNoEngineEscapes
// owns them). Fails loud on any alias import with no covering bundle-or-dep, so
// no future regen can reintroduce a dangling alias.
const validateNoAliasEscapes = async (registry) => {
  const emitted = new Set(registry.items.map((i) => i.name));
  const entries = await readdir(outputDir);
  const violations = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry === "registry.json") continue;
    const item = JSON.parse(
      await readFile(path.join(outputDir, entry), "utf8"),
    );
    if (!item.files?.length) continue;

    const bundled = new Set(
      item.files.map((f) => path.resolve(cwd, f.path)),
    );
    // Declared @chelone/<name> deps this item covers with, by bare item name.
    const declaredCheloneDeps = new Set(
      (item.registryDependencies ?? [])
        .filter((d) => d.startsWith("@chelone/"))
        .map((d) => d.slice("@chelone/".length)),
    );

    for (const file of item.files) {
      if (typeof file.content !== "string") continue;
      const sourceAbs = path.resolve(cwd, file.path);
      for (const m of importSource(file.path, file.content).matchAll(IMPORT_SPEC_RE)) {
        const spec = m[1];
        if (!spec.startsWith("@/")) continue; // only alias imports here
        // ENGINE `@/` imports are validateNoEngineEscapes's domain; skip.
        if (isEngineRelative(spec, sourceAbs, cwd)) continue;

        const resolved = resolveImport(spec, sourceAbs, cwd);
        if (!resolved) continue; // unresolvable @/ path — not one of our tracked items
        if (bundled.has(path.resolve(resolved))) continue; // (a) bundled in same item

        const ref = fileToItemRef(resolved, cwd);
        if (!ref || ref.kind !== "ours") continue; // stock-shadcn/untracked — not our item
        if (declaredCheloneDeps.has(ref.name)) continue; // (b) covered by a declared dep
        if (!emitted.has(ref.name)) {
          // Resolves to an OUR item that was never emitted — deeper bug.
          violations.push(
            `${item.name} (${file.path}) imports "${spec}" → @chelone/${ref.name}, which is NOT an emitted registry item`,
          );
          continue;
        }
        violations.push(
          `${item.name} (${file.path}) imports "${spec}" → @chelone/${ref.name}, but that is NOT bundled here NOR a declared registryDependency (would dangle TS2307 on install)`,
        );
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Registry alias-resolution validator failed: ${violations.length} shipped ` +
        `file(s) import an @/ alias that resolves to an OUR registry item with no ` +
        `covering bundle-or-registryDependency (dangles TS2307 on install):\n  ${violations.join("\n  ")}`,
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

    // shadcn 4.x renamed `registry:build` -> `build` (same args); shadcn-vue
    // takes the same. Both log an invalid item and exit 0 — verifyOutput below
    // is the gate.
    execFileSync(
      "pnpm",
      ["exec", CLI, "build", tempRegistryPath, "-o", outputDir],
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

  // Rewrite engine relatives -> the engine package in shipped content BEFORE the
  // registry.json copy + validators, so dist reflects the installable form.
  const { filesRewritten, itemsWithEngineDep, filesMarked } =
    await rewriteEmittedItems();

  await copyFile(registryPath, path.join(outputDir, "registry.json"));

  await verifyOutput(registry);
  // Content-aware gate: no shipped file may still import an engine relative.
  await validateNoEngineEscapes();
  // Content-aware gate: every @/ alias import resolving to an OUR item must be
  // bundled here or declared as a @chelone/<name> registryDependency.
  await validateNoAliasEscapes(registry);

  console.log(
    `Built ${registry.items.length} items into ${path.relative(cwd, outputDir)} (+ registry.json). Gate passed.`,
  );
  console.log(
    `Engine seam: rewrote ${filesRewritten} file(s) across ${itemsWithEngineDep} item(s) to import "${ENGINE_PACKAGE}"; 0 engine-relative escapes remain.`,
  );
  if (USE_CLIENT) {
    console.log(`Use client: marked ${filesMarked} file(s).`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
