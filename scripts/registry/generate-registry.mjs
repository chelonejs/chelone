#!/usr/bin/env node

// Regenerates registry.json from src/ + scripts/registry.config.mjs.
//
// Run after adding/removing/moving files in any tracked block directory:
//   pnpm registry:generate
//
// The script walks each block's `sourceDirs`, ignores tests / stories /
// screenshots, merges in any `extraFiles`, granularizes the two component
// groups into flat @chelone/<name> items, and writes a deterministic
// registry.json (Biome-formatted).

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import {
  computeItemRegistryDeps,
  granularizeBlock,
} from "./granularize-block.mjs";
import { parseCssVars } from "./parse-css-vars.mjs";

// Run from the package that owns the registry; its config lives beside it.
const repoRoot = process.cwd();
const {
  AUTHOR,
  baseStyles,
  blocks,
  categoriesForGranular,
  registryMetadata,
  themes,
} = await import(
  pathToFileURL(join(repoRoot, "scripts", "registry.config.mjs")).href
);

const registryPath = join(repoRoot, "registry.json");

const SOURCE_EXTS = new Set([".ts", ".tsx"]);
const CSS_EXTS = new Set([".css"]);
const DEFAULT_EXCLUDED_DIRS = new Set(["__screenshots__", "__fixtures__"]);

const isTestOrStory = (filename) =>
  /\.spec\.(ts|tsx)$/.test(filename) ||
  /\.test\.(ts|tsx)$/.test(filename) ||
  /\.test-d\.(ts|tsx)$/.test(filename) ||
  /\.stories\.(ts|tsx)$/.test(filename);

const getExt = (filename) => {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot);
};

const walkSourceDir = (sourceDir) => {
  const absRoot = join(repoRoot, sourceDir.path);
  const allowedExts = sourceDir.cssExtensions
    ? new Set([...SOURCE_EXTS, ...CSS_EXTS])
    : SOURCE_EXTS;
  const excludedDirs = new Set([
    ...DEFAULT_EXCLUDED_DIRS,
    ...(sourceDir.excludeDirs ?? []),
  ]);

  const collected = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!sourceDir.recursive) continue;
        if (excludedDirs.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (isTestOrStory(entry.name)) continue;
      const ext = getExt(entry.name);
      if (!allowedExts.has(ext)) continue;
      collected.push(relative(repoRoot, full));
    }
  };

  walk(absRoot);
  return collected;
};

const buildBlock = (block) => {
  const fileMap = new Map();

  const addFile = (entry) => {
    fileMap.set(entry.path, entry);
  };

  for (const sourceDir of block.sourceDirs ?? []) {
    for (const path of walkSourceDir(sourceDir)) {
      addFile({ path, type: "registry:component" });
    }
  }

  for (const file of block.extraFiles ?? []) {
    addFile({ ...file });
  }

  const files = [...fileMap.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  const item = {
    name: block.name,
    type: block.type,
    title: block.title,
  };

  if (block.categories !== undefined) {
    item.categories = [...block.categories];
  }
  if (block.docs !== undefined) {
    item.docs = block.docs;
  }
  if (block.description !== undefined) {
    item.description = block.description;
  }

  // Compute registryDependencies from the alias/relative imports across ALL the
  // block's bundled files (the monolith path). Every `@/components/*`,
  // `@/components/ui/*`, `@/lib/*`, `@/hooks/*` import that maps to an OUR
  // emitted item — and is NOT itself one of the block's bundled files — becomes
  // a `@chelone/<basename>` dep (bare stock-shadcn refs stay bare). Without this
  // the monolith `admin` block shipped 132 files importing 26 `@/components/ui/*`
  // primitives with registryDependencies:undefined, so every ui import dangled
  // (TS2307) on install. Merge any explicit config deps on top.
  const computedDeps = computeItemRegistryDeps({
    files: files.map((f) => f.path),
    repoRoot,
    blockName: block.name,
  });
  const mergedDeps = new Set([
    ...(block.registryDependencies ?? []),
    ...computedDeps,
  ]);
  if (mergedDeps.size > 0) {
    item.registryDependencies = [...mergedDeps].sort();
  }
  if (block.dependencies !== undefined) {
    item.dependencies = [...block.dependencies];
  }
  if (block.devDependencies !== undefined) {
    item.devDependencies = [...block.devDependencies];
  }

  item.files = files;

  if (block.cssVarsFromFile) {
    const cssText = readFileSync(join(repoRoot, block.cssVarsFromFile), "utf8");
    item.cssVars = {
      light: parseCssVars(cssText, ":root"),
      dark: parseCssVars(cssText, ".dark"),
    };
  }

  return item;
};

const buildTheme = (theme) => {
  const cssText = readFileSync(join(repoRoot, theme.cssFile), "utf8");
  const sel = `.theme-${theme.selector}`;
  const cssVars = {
    light: parseCssVars(cssText, sel),
    dark: parseCssVars(cssText, `${sel}.dark`),
  };

  const item = {
    name: theme.name,
    type: "registry:theme",
    title: theme.title,
    categories: ["chelone", "theme"],
    cssVars,
    files: [],
  };
  if (theme.description) item.description = theme.description;
  return item;
};

// `registry:base` items carry a `config` block mirroring our components.json
// defaults. shadcn's rawConfig alias schema only allows
// components/utils/ui/lib/hooks, and rsc/tsx are consumer-side flags, so we
// project just the supported fields.
const componentsJson = JSON.parse(
  readFileSync(join(repoRoot, "components.json"), "utf8"),
);

const buildStyle = (style) => {
  const { components, utils, ui, lib, hooks } = componentsJson.aliases;
  const cssText = readFileSync(join(repoRoot, style.cssVarsFromFile), "utf8");
  return {
    name: style.name,
    type: "registry:base",
    title: style.title,
    description: style.description,
    config: {
      style: componentsJson.style,
      tailwind: { ...componentsJson.tailwind },
      iconLibrary: componentsJson.iconLibrary,
      aliases: { components, utils, ui, lib, hooks },
    },
    cssVars: {
      light: parseCssVars(cssText, ":root"),
      dark: parseCssVars(cssText, ".dark"),
    },
    files: [],
  };
};

const verifyFilesExist = (items) => {
  const missing = [];
  for (const item of items) {
    for (const file of item.files) {
      const abs = join(repoRoot, file.path);
      try {
        if (!statSync(abs).isFile()) {
          missing.push(`${item.name}: ${file.path} is not a regular file`);
        }
      } catch {
        missing.push(`${item.name}: ${file.path} is missing`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Registry references missing files:\n  ${missing.join("\n  ")}`,
    );
  }
};

// Every `@chelone/<x>` registryDependency must resolve to an emitted item, or it
// 404s a consumer install. verifyFilesExist only checks declared files exist on
// disk — it does NOT catch a dangling cross-item dep. Fail loud at generate time.
const verifyNoDanglingDeps = (items) => {
  const emitted = new Set(items.map((i) => i.name));
  const dangling = [];
  for (const item of items) {
    for (const dep of item.registryDependencies ?? []) {
      if (!dep.startsWith("@chelone/")) continue; // bare shadcn deps are fine
      const target = dep.slice("@chelone/".length);
      if (!emitted.has(target)) {
        dangling.push(`${item.name} -> ${dep} (no emitted item "${target}")`);
      }
    }
  }
  if (dangling.length > 0) {
    throw new Error(
      `Dangling @chelone registry dependencies (would 404 on install):\n  ${dangling.join("\n  ")}`,
    );
  }
};

const packageJson = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8"),
);

const main = async () => {
  const items = [];
  for (const block of blocks) {
    const builtBlock = buildBlock(block);
    items.push(builtBlock);

    if (block.granularize) {
      const granular = granularizeBlock({
        files: builtBlock.files.map((f) => f.path),
        packageJson,
        repoRoot,
        blockName: block.name,
      });
      for (const g of granular) {
        g.categories = categoriesForGranular(g.name, g.type);
      }
      items.push(...granular);
    }
  }

  for (const theme of themes) {
    items.push(buildTheme(theme));
  }

  for (const style of baseStyles) {
    items.push(buildStyle(style));
  }

  // Stamp attribution on every item (blocks, granular, themes, base styles).
  for (const item of items) {
    item.author = AUTHOR;
  }

  // Dedupe guard: item names are basename-derived (granularize-block.mjs), so a
  // future admin/<subdir>/ reorg could collide two leaf basenames. A duplicate
  // name makes build-registry.mjs write dist/r/<name>.json twice and silently
  // corrupt the published item — fail loud at generate time instead.
  const seenNames = new Map();
  for (const item of items) {
    const prior = seenNames.get(item.name);
    if (prior) {
      throw new Error(
        `Duplicate registry item name "${item.name}" (${prior} and ${item.type}). ` +
          `Basename collision — rename or relocate one source file, or add a UI_NAME_OVERRIDES entry.`,
      );
    }
    seenNames.set(item.name, item.type);
  }

  verifyFilesExist(items);
  verifyNoDanglingDeps(items);

  const registry = {
    ...registryMetadata,
    items,
  };

  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

  // Chelone formats with Biome (no prettier dep). Normalize the artifact so its
  // committed shape is stable across regenerations.
  try {
    execFileSync(
      "pnpm",
      ["exec", "biome", "format", "--write", registryPath],
      { cwd: repoRoot, stdio: "ignore" },
    );
  } catch {
    // Formatting is cosmetic; a Biome hiccup must not fail generation.
  }

  const totalFiles = items.reduce((sum, item) => sum + item.files.length, 0);
  const cheloneDepRefs = items.reduce(
    (sum, item) =>
      sum +
      (item.registryDependencies ?? []).filter((d) =>
        d.startsWith("@chelone/"),
      ).length,
    0,
  );
  // verifyNoDanglingDeps threw above if any @chelone dep was unresolved, so all
  // cheloneDepRefs are confirmed resolved by the time we reach here.
  console.log(
    `Wrote ${relative(repoRoot, registryPath)} (${items.length} items, ${totalFiles} files, ${cheloneDepRefs} @chelone deps all resolved, 0 dangling).`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
