// The engine seam: chelone packs the ENGINE (@chelone/react hooks — context,
// resource, i18n-hooks, form-hooks, record/*, router/*, form/*, list/*, util/*,
// label/*, choices-hooks, compat-hooks, controller-hooks, auth-hooks,
// array-hooks, store-hooks, notification-hooks, save-context,
// field-error-display, record-view-context, use-list, hooks, admin/* engine
// files) and the COMPONENTS (components/{ui,admin}) in the SAME package. Admin
// component SOURCE imports the engine via DEEP RELATIVE paths like
// `import { useInput } from "../../../form-hooks"`. That is fine for the package
// build, but the registry COPIES a component file into a consumer where the
// engine files are NOT present (the engine is the npm package @chelone/react) —
// so those relatives 404 (TS2307). This module is the shadmin-core→ra-core seam
// analog (registry landmine #7).
//
// CLASS DISTINCTION (the fix hinges on this):
//   (A) ENGINE relatives  — a relative/`@/` import from a shipped component file
//       resolving to a src/ file NOT under components/, lib/, or hooks/. THESE
//       ARE THE BUG. Rewrite the specifier to the bare `@chelone/react`.
//   (B) SIBLING relatives  — resolve to another SHIPPED file under components/,
//       lib/, or hooks/. These resolve fine in a consumer because shadcn
//       preserves the src/components/admin/… structure, so the relative depth
//       still lands on the installed sibling (PROVIDED that sibling is a
//       registryDependency). Leave class B untouched.
//
// The rewrite happens at EMIT time (dist/r content), NOT in the source: the
// source keeps its relatives (rewriting the source would risk an
// index.ts<->components circular self-import). generate-registry declares
// `@chelone/react` as an npm dependency on every item whose content will be
// rewritten; build-registry performs the actual content rewrite so it reaches
// the final dist/r/<item>.json files[].content regardless of AUTO/MANUAL.

import { readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SOURCE_EXTS = [".tsx", ".ts"];

// The bare npm package the engine relatives collapse onto.
export const ENGINE_PACKAGE = "@chelone/react";

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

// Resolve a relative or `@/` import specifier against its source file to an
// absolute src/ path (or null if unresolvable / a bare npm package).
export const resolveSpecifier = (importPath, sourceFile, repoRoot) => {
  if (importPath.startsWith(".")) {
    return tryResolveFile(resolve(dirname(sourceFile), importPath));
  }
  if (importPath.startsWith("@/")) {
    return tryResolveFile(join(repoRoot, "src", importPath.slice(2)));
  }
  return null;
};

// Is the resolved absolute path an ENGINE file (class A)? True when it resolves
// under src/ but OUTSIDE the shipped-surface dirs {components/, lib/, hooks/}.
// `src/hooks.ts` (the engine hooks file) resolves to `hooks.ts`, NOT the
// `hooks/` dir, so it is correctly class A; `src/lib/utils.ts` is class B.
export const isEngineFile = (absResolved, repoRoot) => {
  if (!absResolved) return false;
  const rel = relative(join(repoRoot, "src"), absResolved);
  if (rel.startsWith("..")) return false; // outside src/ entirely — not ours
  return (
    !rel.startsWith("components/") &&
    !rel.startsWith("lib/") &&
    !rel.startsWith("hooks/")
  );
};

// Is a specifier an ENGINE relative (class A) from `sourceFile`?
export const isEngineRelative = (importPath, sourceFile, repoRoot) => {
  if (!importPath.startsWith(".") && !importPath.startsWith("@/")) return false;
  const resolved = resolveSpecifier(importPath, sourceFile, repoRoot);
  return isEngineFile(resolved, repoRoot);
};

// Matches the specifier of an `import … from "<spec>"` / bare `import "<spec>"` /
// `export … from "<spec>"` statement. Captures the specifier in group 2.
// (Preserves `import type` vs value imports — only the specifier is rewritten.)
const IMPORT_SPEC_RE =
  /(\bfrom\s+|^\s*(?:import|export)\s+)["']([^"']+)["']/gm;

// Rewrite every ENGINE-relative specifier in `content` to `@chelone/react`.
// `sourceFile` is the ORIGINAL absolute source path (used to resolve relatives).
// Returns { content, rewrote } — rewrote is true if any specifier changed.
export const rewriteEngineImports = (content, sourceFile, repoRoot) => {
  let rewrote = false;
  const next = content.replace(IMPORT_SPEC_RE, (full, lead, spec) => {
    if (isEngineRelative(spec, sourceFile, repoRoot)) {
      rewrote = true;
      return `${lead}"${ENGINE_PACKAGE}"`;
    }
    return full;
  });
  return { content: next, rewrote };
};
