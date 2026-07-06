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

import { readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SOURCE_EXTS = [".tsx", ".ts"];

// hooks/ files authored in THIS repo (resolve to `@chelone/<name>` items).
// Anything not listed resolves to a shadcn-upstream hook reference by bare name
// (e.g. "use-mobile" — a stock shadcn hook a consumer keeps their own copy of;
// chelone's src/hooks/use-mobile.ts is a thin re-export of the @chelone/react
// `useIsMobile`, so shipping it as a registry item would drag in the workspace
// package — leave it a bare stock-shadcn dep instead).
const OUR_HOOK_ITEMS = new Set();

// ui/ items whose flat basename collides with an admin basename, remapped to a
// `ui-<base>` install name so both ship unambiguously. `spinner` is the only
// collision today: admin/feedback/spinner.tsx (the app-facing `@chelone/spinner`
// wrapper) vs ui/spinner.tsx (the primitive, `@chelone/ui-spinner`). This map
// is applied to BOTH an item's own name and any dep that resolves onto it, so
// the admin wrapper's `@/components/ui/spinner` import points at `ui-spinner`.
const UI_NAME_OVERRIDES = new Map([["spinner", "ui-spinner"]]);

// NPM packages every React project already has — omitting them from item
// `dependencies` keeps the registry JSON noise-free.
const IMPLICIT_NPM = new Set(["react", "react-dom"]);

// The workspace seam. `@chelone/core` (vanilla engine) and `@chelone/react`
// (React adapter) are the REAL published-target deps a registry consumer
// installs from npm — keep the name verbatim. They are unpublished 0.0.0 today,
// which is why live consumer-install E2E (test-registry.sh) is deferred until
// they ship; the emitted registry items are correct now and need no change on
// publish. Listed here so bare imports of them map to npm `dependencies`
// regardless of whether the local package.json declares them as workspace:*.
const WORKSPACE_NPM_DEPS = new Set(["@chelone/core", "@chelone/react"]);

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const parseImports = (src) => {
  const clean = stripComments(src);
  const imports = new Set();
  for (const m of clean.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    imports.add(m[1]);
  }
  for (const m of clean.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) {
    imports.add(m[1]);
  }
  return [...imports];
};

const tryResolveFile = (basePath) => {
  for (const ext of SOURCE_EXTS) {
    const candidate = `${basePath}${ext}`;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not a file
    }
  }
  try {
    if (statSync(basePath).isFile()) return basePath;
  } catch {
    // not a file
  }
  for (const ext of SOURCE_EXTS) {
    const candidate = join(basePath, `index${ext}`);
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not a file
    }
  }
  return null;
};

const resolveImport = (importPath, sourceFile, repoRoot) => {
  if (importPath.startsWith(".")) {
    return tryResolveFile(resolve(dirname(sourceFile), importPath));
  }
  if (importPath.startsWith("@/")) {
    return tryResolveFile(join(repoRoot, "src", importPath.slice(2)));
  }
  return null;
};

const npmRoot = (importPath) => {
  if (importPath.startsWith("@")) {
    return importPath.split("/").slice(0, 2).join("/");
  }
  return importPath.split("/")[0];
};

const applyUiOverride = (name) => UI_NAME_OVERRIDES.get(name) ?? name;

// Maps an absolute file path under src/ to a registry item reference.
// Returns null when the file shouldn't be tracked (index barrels, type modules,
// unknown locations). `kind` tells callers whether it's an OUR item
// (`@chelone/<name>`) or a shadcn-upstream item referenced by bare name.
const fileToItemRef = (absFile, repoRoot) => {
  const rel = relative(join(repoRoot, "src"), absFile);
  if (rel.startsWith("..")) return null;

  const noExt = rel.replace(/\.(tsx?|ts)$/, "");

  // ui/ files are OUR items (the primitive layer ships in this registry). A flat
  // file (`ui/button.tsx`) is one item named after its basename. A ui SUBDIR
  // (`ui/color-picker/{color-picker,color-picker.types,index}.ts`) is ONE item
  // represented by its `index` barrel — the internal component/types files are
  // pulled in with it, not emitted as their own items. Resolving an import onto
  // any file in the subdir (or the barrel) yields the single dir-name item.
  // Colliding basenames are remapped via UI_NAME_OVERRIDES.
  if (noExt.startsWith("components/ui/")) {
    const sub = noExt.slice("components/ui/".length);
    const segments = sub.split("/");
    if (segments.length === 1) {
      return { kind: "ours", name: applyUiOverride(segments[0]) };
    }
    // Inside a ui subdir: only the barrel represents the item; skip the
    // internal component/types files so the dir emits exactly one item.
    if (segments[segments.length - 1] === "index") {
      return { kind: "ours", name: applyUiOverride(segments[0]) };
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
  const noExt = rel.replace(/\.(tsx?|ts)$/, "");
  if (!noExt.startsWith("components/ui/")) return null;
  const segments = noExt.slice("components/ui/".length).split("/");
  if (segments.length < 2) return null;
  return applyUiOverride(segments[0]);
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
}) => {
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
      const src = readFileSync(absFile, "utf8");
      const imports = parseImports(src);

      for (const imp of imports) {
        const resolved = resolveImport(imp, absFile, repoRoot);
        if (resolved) {
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
        if (IMPLICIT_NPM.has(pkg)) continue;
        // @chelone/core + @chelone/react are the real published-target npm deps
        // the copied source needs (see WORKSPACE_NPM_DEPS). Declare them
        // verbatim even though the local manifest lists them as workspace:*.
        if (WORKSPACE_NPM_DEPS.has(pkg)) {
          npmDeps.add(pkg);
          continue;
        }
        if (packageJson.dependencies?.[pkg]) {
          npmDeps.add(pkg);
        } else if (packageJson.devDependencies?.[pkg]) {
          npmDevDeps.add(pkg);
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

  return items;
};
