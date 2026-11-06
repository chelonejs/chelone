// Derives per-file registry items from a block's source files.
//
// Given a list of source files in a block, walks each file's imports and emits
// one `registry:ui` / `registry:component` / `registry:hook` / `registry:lib`
// item per file. Cross-file deps (sibling files, other emitted items, npm
// packages) are resolved from the import graph so each granular item declares
// only what it needs.
//
// Usage from generate-registry.mjs:
//   const granular = granularizeBlock({ files, packageJson, repoRoot, blockName });
//   items.push(...granular);

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ENGINE_PACKAGE,
  IMPLICIT_DEPENDENCIES,
  ITEM_NAMES,
  importSource,
  isEngineRelative,
  resolveSpecifier,
} from "./engine-seam.mjs";

// hooks/ files authored in THIS repo (resolve to `@chelone/<name>` items).
// Anything not listed resolves to a shadcn-upstream hook reference by bare name
// (e.g. "use-mobile" — a stock shadcn hook a consumer keeps their own copy of;
// chelone's src/hooks/use-mobile.ts is a thin re-export of the @chelone/react
// `useIsMobile`, so shipping it as a registry item would drag in the workspace
// package — leave it a bare stock-shadcn dep instead).
const OUR_HOOK_ITEMS = new Set();

// The workspace seam. `@chelone/core` (vanilla engine) and the configured
// engine package (the framework adapter) are the REAL published-target deps a
// registry consumer installs from npm — keep the names verbatim. Listed here so
// bare imports of them map to npm `dependencies` regardless of whether the
// local package.json declares them as workspace:*.
const WORKSPACE_NPM_DEPS = new Set(["@chelone/core", ENGINE_PACKAGE]);

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const parseImports = (src, { followDynamicImports = false } = {}) => {
  const clean = stripComments(src);
  const imports = new Set();
  for (const m of clean.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    imports.add(m[1]);
  }
  for (const m of clean.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) {
    imports.add(m[1]);
  }
  // A lazy chunk is still a file the consumer needs installed.
  if (followDynamicImports) {
    for (const m of clean.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
      imports.add(m[1]);
    }
  }
  return [...imports];
};

// Parse the NAMED symbols an `import … from "<spec>"` statement pulls from a
// given specifier — used by the barrel-export guard to verify every engine
// symbol a copied component needs is actually exported by the engine package.
// Returns a flat list of the imported source names (drops `as` aliases, keeps
// the exported name). Default and namespace imports are returned as a sentinel.
const parseImportedSymbols = (src, targetSpec) => {
  const clean = stripComments(src);
  const symbols = new Set();
  const re =
    /import\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g;
  for (const m of clean.matchAll(re)) {
    if (m[3] !== targetSpec) continue;
    const clause = m[2].trim();
    const brace = clause.match(/\{([^}]*)\}/);
    if (brace) {
      for (const raw of brace[1].split(",")) {
        const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (name) symbols.add(name);
      }
    }
    // default / namespace clause (e.g. `import Foo from` or `import * as Foo`)
    const head = clause.replace(/\{[^}]*\}/, "").replace(/,/g, "").trim();
    if (head && !head.startsWith("*")) symbols.add(head);
    else if (head.startsWith("*")) symbols.add("*");
  }
  return [...symbols];
};

// Collects every named symbol EXPORTED by the engine package's barrel
// (src/index.ts). Handles `export { a, b as c }` and `export type { … }` blocks
// (with or without a trailing `from "…"`). No `export *` is used in the barrel,
// so a flat name set is a complete public-API surface.
const parseBarrelExports = (repoRoot) => {
  const barrel = stripComments(
    readFileSync(join(repoRoot, "src", "index.ts"), "utf8"),
  );
  const exported = new Set();
  const re = /export\s+(?:type\s+)?\{([^}]*)\}/g;
  for (const m of barrel.matchAll(re)) {
    for (const raw of m[1].split(",")) {
      const seg = raw.trim();
      if (!seg) continue;
      // `a as b` re-exports name `b`; a plain `a` exports `a`.
      const name = seg.split(/\s+as\s+/).pop().replace(/^type\s+/, "").trim();
      if (name) exported.add(name);
    }
  }
  return exported;
};

export const resolveImport = resolveSpecifier;

const npmRoot = (importPath) => {
  if (importPath.startsWith("@")) {
    return importPath.split("/").slice(0, 2).join("/");
  }
  return importPath.split("/")[0];
};

const isOptionalPeer = (packageJson, pkg) =>
  Boolean(
    packageJson.peerDependencies?.[pkg] &&
      packageJson.peerDependenciesMeta?.[pkg]?.optional === true,
  );

const UTILS_PACKAGE = "@chelone/utils";

// `@chelone/utils/<subpath>` keeps its heavy packages as optional peers, so
// installing the package does not install them. The consumer of a subpath needs
// the peers that subpath's own source imports.
const UTILS_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../packages/utils",
);

const utilsSubpathPeers = (imp) => {
  if (!imp.startsWith(`${UTILS_PACKAGE}/`)) return [];
  const utilsJson = JSON.parse(
    readFileSync(join(UTILS_ROOT, "package.json"), "utf8"),
  );
  const peers = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) {
        for (const dep of parseImports(readFileSync(path, "utf8"))) {
          const pkg = npmRoot(dep);
          if (isOptionalPeer(utilsJson, pkg)) peers.add(pkg);
        }
      }
    }
  };
  walk(join(UTILS_ROOT, "src", imp.slice(UTILS_PACKAGE.length + 1)));
  return [...peers];
};

const stripExt = (rel) => rel.replace(/\.(tsx?|vue)$/, "");

// A ui item's name: its file (or subdir) basename, unless itemNames renames it.
// A subdir is one item, so its rename may be keyed on the dir or on its barrel.
const uiItemName = (segment) =>
  ITEM_NAMES.get(`components/ui/${segment}`) ??
  ITEM_NAMES.get(`components/ui/${segment}/index`) ??
  segment;

// The flat `components/ui/index` barrel re-exports the primitives; it is no
// item, and a shipped file importing it would copy it (and so every primitive)
// into a consumer. Importing the barrel is a mistake to fix at the import.
const isUiBarrel = (absFile, repoRoot) =>
  stripExt(relative(join(repoRoot, "src"), absFile)) === "components/ui/index";

const assertNotUiBarrel = (resolved, importer, repoRoot) => {
  if (!isUiBarrel(resolved, repoRoot)) return;
  throw new Error(
    `${relative(repoRoot, importer)} imports the ui barrel (src/components/ui/index). ` +
      `Import the primitive from its own file instead.`,
  );
};

// Maps an absolute file path under src/ to a registry item reference.
// Returns null when the file shouldn't be tracked (index barrels, type modules,
// unknown locations). `kind` tells callers whether it's an OUR item
// (`@chelone/<name>`) or a shadcn-upstream item referenced by bare name.
export const fileToItemRef = (absFile, repoRoot) => {
  const rel = relative(join(repoRoot, "src"), absFile);
  if (rel.startsWith("..")) return null;

  const noExt = stripExt(rel);

  if (isUiBarrel(absFile, repoRoot)) return null;

  // itemNames overrides every rule below, for the file's own item and for every
  // dep that resolves onto it. Files inside a ui subdir are left to the ui rule
  // below, which names the subdir's one item.
  const named = ITEM_NAMES.get(noExt);
  if (named && !/^components\/ui\/[^/]+\//.test(noExt)) {
    return { kind: "ours", name: named };
  }

  // ui/ files are OUR items (the primitive layer ships in this registry). A flat
  // file (`ui/button.tsx`) is one item named after its basename. A ui SUBDIR
  // (`ui/color-picker/{color-picker,color-picker.types,index}.ts`) is ONE item
  // represented by its `index` barrel — the internal component/types files are
  // pulled in with it, not emitted as their own items. Resolving an import onto
  // any file in the subdir (or the barrel) yields the single dir-name item.
  // Colliding basenames are remapped via itemNames.
  if (noExt.startsWith("components/ui/")) {
    const sub = noExt.slice("components/ui/".length);
    const segments = sub.split("/");
    if (segments.length === 1) {
      return { kind: "ours", name: uiItemName(segments[0]) };
    }
    // Inside a ui subdir: only the barrel represents the item; skip the
    // internal component/types files so the dir emits exactly one item.
    if (segments[segments.length - 1] === "index") {
      return { kind: "ours", name: uiItemName(segments[0]) };
    }
    return null;
  }

  // index barrels and type-only modules aren't installable components.
  if (noExt.endsWith("/index") || noExt.endsWith("/types")) return null;

  // Any component outside ui/ (admin/*) granularizes to a flat
  // @chelone/<basename> item. Name is the file BASENAME, decoupled from
  // internal subdirs (admin/inputs/, admin/fields/, …), so the source tree
  // stays organized while the emitted install name stays flat. The dedupe guard
  // in generate-registry.mjs fails loud on any basename collision.
  if (noExt.startsWith("components/")) {
    const base = noExt.split("/").pop();
    return { kind: "ours", name: base };
  }

  if (noExt.startsWith("hooks/")) {
    const name = noExt.slice("hooks/".length).replace(/\//g, "-");
    if (OUR_HOOK_ITEMS.has(name)) return { kind: "ours", name };
    return { kind: "shadcn", name };
  }

  if (noExt.startsWith("lib/")) {
    return {
      kind: "ours",
      name: `lib-${noExt.slice("lib/".length).replace(/\//g, "-")}`,
    };
  }

  return null;
};

// If `absFile` lives inside a ui SUBDIR (depth > 1 under components/ui/),
// return that subdir's item name so internal component/types files ship inside
// their barrel's item. Returns null for flat ui files and non-ui files.
const uiSubdirOwner = (absFile, repoRoot) => {
  const rel = relative(join(repoRoot, "src"), absFile);
  if (rel.startsWith("..")) return null;
  const noExt = stripExt(rel);
  if (!noExt.startsWith("components/ui/")) return null;
  const segments = noExt.slice("components/ui/".length).split("/");
  if (segments.length < 2) return null;
  return uiItemName(segments[0]);
};

const titleFromName = (name) =>
  name
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

const inferType = (relPath) => {
  if (relPath.startsWith("src/hooks/")) return "registry:hook";
  if (relPath.startsWith("src/lib/")) return "registry:lib";
  if (relPath.startsWith("src/components/ui/")) return "registry:ui";
  return "registry:component";
};

export const granularizeBlock = ({
  files,
  packageJson,
  repoRoot,
  blockName,
  extraRegistryDependencies = [],
  extraDependencies = [],
  followDynamicImports = false,
}) => {
  // The engine package's public-API surface — every ENGINE symbol a copied
  // component imports MUST be re-exported here, or the emit-time rewrite
  // (relative -> the engine package) produces an unresolvable bare import. The
  // guard below fails generate loud on any gap so we never ship a broken item.
  const barrelExports = parseBarrelExports(repoRoot);
  const missingBarrelSymbols = [];

  // Group input files by the item they belong to. A flat file is its own group;
  // a ui subdir (e.g. color-picker/) collapses onto its barrel's item name, so
  // all its files (component + types + index) ship in that ONE item. The
  // representative path (used to pick the item TYPE) is the barrel/main file.
  const groups = new Map();

  for (const file of files) {
    const absFile = resolve(repoRoot, file);
    const itemRef = fileToItemRef(absFile, repoRoot);

    // Files that don't map to an item on their own (a ui-subdir internal
    // component/types file) still need to SHIP inside their dir's item. Attach
    // them to the group whose barrel owns the dir.
    let name = itemRef?.kind === "ours" ? itemRef.name : null;
    let representative = itemRef?.kind === "ours";

    if (!name) {
      const owner = uiSubdirOwner(absFile, repoRoot);
      if (!owner) continue; // genuinely untracked (shadcn-upstream ref, barrel)
      name = owner;
      representative = false;
    }

    if (name === blockName) continue; // granularize self-skip (see below)

    let group = groups.get(name);
    if (!group) {
      group = { name, files: [], representativePath: null };
      groups.set(name, group);
    }
    group.files.push(file);
    if (representative) group.representativePath = file;
  }

  const items = [];

  for (const group of groups.values()) {
    // Skip a granular item whose derived name collides with the monolith block
    // (e.g. components/admin/admin.tsx -> "admin", same as the "admin" block).
    // The file still ships inside the monolith; any "@chelone/<blockName>"
    // dependency resolves to that block, so emitting a duplicate item here would
    // make build-registry.mjs write dist/r/<blockName>.json twice and corrupt it.
    if (group.name === blockName) continue;

    const registryDeps = new Set(extraRegistryDependencies);
    const npmDeps = new Set(extraDependencies);
    const npmDevDeps = new Set();

    const groupAbs = new Set(group.files.map((f) => resolve(repoRoot, f)));

    for (const file of group.files) {
      const absFile = resolve(repoRoot, file);
      const src = importSource(file, readFileSync(absFile, "utf8"));
      const imports = parseImports(src, { followDynamicImports });

      for (const imp of imports) {
        // Class A — ENGINE relative. Resolves to a src/ file OUTSIDE the shipped
        // surface (components/, lib/, hooks/). The emit-time content rewrite
        // turns the specifier into the bare engine package, so declare that npm
        // dep here (collapsing every engine import in the file to the one dep),
        // and verify each imported symbol IS on the barrel's public surface.
        if (isEngineRelative(imp, absFile, repoRoot)) {
          npmDeps.add(ENGINE_PACKAGE);
          for (const sym of parseImportedSymbols(src, imp)) {
            if (sym === "*") continue; // namespace import — barrel is the target
            if (!barrelExports.has(sym)) {
              missingBarrelSymbols.push(
                `${sym} (imported by ${file} from "${imp}") — add it to src/index.ts`,
              );
            }
          }
          continue;
        }

        const resolved = resolveImport(imp, absFile, repoRoot);
        if (resolved) {
          assertNotUiBarrel(resolved, absFile, repoRoot);
          if (groupAbs.has(resolve(resolved))) continue; // intra-item file
          const depRef = fileToItemRef(resolved, repoRoot);
          if (!depRef) continue;
          if (depRef.kind === "shadcn") {
            registryDeps.add(depRef.name);
          } else if (depRef.name !== group.name) {
            registryDeps.add(`@chelone/${depRef.name}`);
          }
          continue;
        }
        const pkg = npmRoot(imp);
        if (IMPLICIT_DEPENDENCIES.has(pkg)) continue;
        // @chelone/core + the engine package are the real published-target npm deps
        // the copied source needs (see WORKSPACE_NPM_DEPS). Declare them
        // verbatim even though the local manifest lists them as workspace:*.
        if (WORKSPACE_NPM_DEPS.has(pkg)) {
          npmDeps.add(pkg);
          continue;
        }
        // An optional peer is how an add-on keeps its packages off the base
        // install, so a consumer of the item needs it as a dependency. It beats
        // devDependencies because an add-on lists its peers there to test them.
        if (
          packageJson.dependencies?.[pkg] ||
          isOptionalPeer(packageJson, pkg)
        ) {
          npmDeps.add(pkg);
        } else if (packageJson.devDependencies?.[pkg]) {
          npmDevDeps.add(pkg);
        }
        for (const peer of utilsSubpathPeers(imp)) {
          npmDeps.add(peer);
        }
      }
    }

    const type = inferType(group.representativePath ?? group.files[0]);
    const sortedFiles = [...group.files].sort((a, b) => a.localeCompare(b));
    const item = {
      name: group.name,
      type,
      title: titleFromName(group.name),
      files: sortedFiles.map((path) => ({ path, type: inferType(path) })),
    };

    if (registryDeps.size > 0) {
      item.registryDependencies = [...registryDeps].sort();
    }
    if (npmDeps.size > 0) {
      item.dependencies = [...npmDeps].sort();
    }
    if (npmDevDeps.size > 0) {
      item.devDependencies = [...npmDevDeps].sort();
    }

    items.push(item);
  }

  if (missingBarrelSymbols.length > 0) {
    const unique = [...new Set(missingBarrelSymbols)].sort();
    throw new Error(
      `Engine seam: copied component imports ${unique.length} symbol(s) NOT ` +
        `exported by the ${ENGINE_PACKAGE} barrel (src/index.ts). The emit-time ` +
        `rewrite would produce an unresolvable "${ENGINE_PACKAGE}" import. Add ` +
        `each to the barrel:\n  ${unique.join("\n  ")}`,
    );
  }

  return items;
};

// Compute the registryDependencies for a BUNDLED/BLOCK item (e.g. the `admin`
// monolith) from the alias/relative imports across ALL its bundled files. Each
// `@/components/*`, `@/components/ui/*`, `@/lib/*`, `@/hooks/*` (or sibling
// relative) import that resolves to an OUR emitted item becomes a
// `@chelone/<basename>` dep — UNLESS that exact file is already bundled inside
// this SAME item (then it resolves internally, no dep needed). Shadcn-upstream
// refs (bare stock hooks) are returned as bare names. ENGINE relatives (class A)
// are ignored here — they collapse onto the engine package's npm dep, handled by
// the emit-time rewrite in build-registry.mjs, NOT a registryDependency.
//
// This is the SAME import-graph resolution the granular items use, applied
// across a multi-file item with its own files subtracted. `blockName` lets the
// item skip a self-referential dep (an import onto a file that granularizes to
// this block's own name).
export const computeItemRegistryDeps = ({ files, repoRoot, blockName }) => {
  const registryDeps = new Set();
  const bundledAbs = new Set(files.map((f) => resolve(repoRoot, f)));

  for (const file of files) {
    const absFile = resolve(repoRoot, file);
    const src = importSource(file, readFileSync(absFile, "utf8"));
    for (const imp of parseImports(src)) {
      // Class A engine relatives → engine package npm dep (emit-time rewrite),
      // never a registryDependency. Skip.
      if (isEngineRelative(imp, absFile, repoRoot)) continue;

      const resolved = resolveImport(imp, absFile, repoRoot);
      if (!resolved) continue; // bare npm import — handled as a dependency elsewhere
      assertNotUiBarrel(resolved, absFile, repoRoot);
      if (bundledAbs.has(resolve(resolved))) continue; // intra-item file, resolves internally

      const depRef = fileToItemRef(resolved, repoRoot);
      if (!depRef) continue; // untracked (index barrel, engine file already excluded)
      if (depRef.kind === "shadcn") {
        registryDeps.add(depRef.name);
      } else if (depRef.name !== blockName) {
        registryDeps.add(`@chelone/${depRef.name}`);
      }
    }
  }

  return [...registryDeps].sort();
};
