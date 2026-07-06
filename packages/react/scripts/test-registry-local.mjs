#!/usr/bin/env node

// LOCAL LINKED-CONSUMER E2E — the content-aware install proof the live
// (registry-URL) E2E defers (test-registry.sh). Runs NOW, no npm publish.
//
// For a representative set of items it materializes a scratch consumer that
// mirrors the shadcn `@/` layout, copies each item's shipped file CONTENT plus
// the shipped files of its registryDependencies (transitively), provides
// @chelone/react + @chelone/core the way a PUBLISHED install does — as compiled
// `.d.ts` (emitted on the fly from the workspace sources into the scratch
// node_modules, so the imported engine TYPES are real, not `any`), adds a
// tsconfig with paths {"@/*": ["./src/*"]}, and `tsc --noEmit`s the copied
// files.
//
// GREEN = the copied component resolves ALL imports:
//   * engine hooks/types via the bare "@chelone/react" (the emit-time rewrite),
//   * sibling admin/lib files via the preserved src/ structure + @/ alias,
//   * stock shadcn ui primitives (@/components/ui/*) — consumer-provided.
// This is exactly the class the old dangling-dep/file-exists gates could not
// see: they never inspected file CONTENT. Run: pnpm registry:test-local.

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(scriptDir, "..");
const repoRoot = resolve(pkgRoot, "..", ".."); // chelone/
const distDir = join(pkgRoot, "dist", "r");
const scratchDir = join(pkgRoot, "temp-local-e2e");

// One representative per surface (per the wave spec): an input, a field, the
// data-table, a view, and a layout piece. Each GRANULAR item carries a complete
// registryDependency graph (granularizeBlock), so its transitive close copies
// every sibling admin/ui/lib file it needs — the seam proof needs that closure.
//
// The `admin` MONOLITH is intentionally NOT in this set: it declares ZERO
// registryDependencies (it under-declares the stock ui primitives its files
// import — a SEPARATE completeness concern, tracked out-of-band), so its
// transitive close wouldn't copy those ui files and the test would fail on that
// unrelated gap rather than the engine seam. The monolith's engine-seam fix is
// still proven by validateNoEngineEscapes (build gate) + its @chelone/react dep.
const REPRESENTATIVE_ITEMS = [
  "text-input",
  "text-field",
  "data-table",
  "edit",
  "app-sidebar",
];

const loadItem = (name) => {
  const p = join(distDir, `${name}.json`);
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    throw new Error(
      `Missing dist item "${name}.json" — run "pnpm registry:build" first.`,
    );
  }
};

// Transitively collect an item + all @chelone/<x> registryDependency items.
// Bare (non-@chelone) registryDeps are stock shadcn primitives a real consumer
// already has; we stub only the ones our copied source actually imports (below).
const collectTransitive = (rootNames) => {
  const items = new Map();
  const stack = [...rootNames];
  while (stack.length) {
    const name = stack.pop();
    if (items.has(name)) continue;
    const item = loadItem(name);
    items.set(name, item);
    for (const dep of item.registryDependencies ?? []) {
      if (!dep.startsWith("@chelone/")) continue;
      const target = dep.slice("@chelone/".length);
      if (!items.has(target)) stack.push(target);
    }
  }
  return items;
};

const main = () => {
  rmSync(scratchDir, { recursive: true, force: true });
  mkdirSync(join(scratchDir, "src"), { recursive: true });

  // The scratch dir sits under packages/react/, so bare npm deps (react,
  // lucide-react, class-variance-authority, clsx, radix, @tanstack/*, …) resolve
  // UPWARD into packages/react/node_modules -> chelone/node_modules with their
  // real types — nothing to link or stub for those.

  const tscBin = join(pkgRoot, "node_modules", ".bin", "tsc");
  const items = collectTransitive(REPRESENTATIVE_ITEMS);

  // Write every shipped file's rewritten CONTENT at its src/ path.
  const writtenPaths = new Set();
  for (const item of items.values()) {
    for (const file of item.files ?? []) {
      if (typeof file.content !== "string") continue;
      const dest = join(scratchDir, file.path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, file.content);
      writtenPaths.add(file.path);
    }
  }

  // Ambient stubs for the modules a real consumer PROVIDES (so the copied source
  // treats them as resolvable, opaque surfaces):
  //   * @chelone/react + @chelone/core — the engine packages (published npm). We
  //     do NOT typecheck their internals; the seam bug is a RESOLUTION defect
  //     (does the import find a module), not an engine type-correctness one — and
  //     the barrel-export correctness is already guarded at generate time
  //     (parseBarrelExports in granularize-block.mjs). Opaque `any` typing means
  //     engine types imported for USE surface as TS2709, which the result filter
  //     below deliberately ignores (only TS2307/TS2305 module-resolution errors
  //     on COPIED files are treated as the install defect).
  //   * @/components/ui/* + @/hooks/* — stock shadcn primitives (ui dep-graph
  //     completeness is a SEPARATE concern from the engine seam).
  // Everything else (react, lucide, cva, clsx, radix, …) resolves upward to real
  // node_modules with real types.
  writeFileSync(
    join(scratchDir, "src", "consumer-provided.d.ts"),
    [
      "// Auto-generated by test-registry-local.mjs — consumer-provided surface.",
      'declare module "@chelone/react";',
      'declare module "@chelone/core";',
      'declare module "@chelone/core/*";',
      'declare module "@/components/ui/*";',
      'declare module "@/hooks/*";',
      "",
    ].join("\n"),
  );

  // A tsconfig mirroring a real shadcn consumer, aligned with the workspace base
  // (ES2022 lib, bundler resolution, verbatimModuleSyntax) so the copied source
  // typechecks under the same posture it was authored for. @/* -> ./src/*. Only
  // the copied files are in the program (include: src).
  writeFileSync(
    join(scratchDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          verbatimModuleSyntax: true,
          noUncheckedIndexedAccess: true,
          // The seam test isolates IMPORT RESOLUTION (TS2307/TS2305), not the
          // source's strictness posture. Pre-existing implicit-any in copied
          // source (a SEPARATE lint concern) must not mask a resolution failure.
          noImplicitAny: false,
          noEmit: true,
          skipLibCheck: true,
          esModuleInterop: true,
          isolatedModules: true,
          moduleDetection: "force",
          baseUrl: ".",
          paths: { "@/*": ["./src/*"] },
          types: [],
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );

  const files = [...writtenPaths].sort();
  console.log(
    `Local linked-consumer E2E: ${items.size} items, ${files.length} files copied into ${scratchDir}`,
  );

  // Run tsc and CAPTURE its diagnostics. The gate is RESOLUTION, not full
  // typecheck: fail only on module-resolution errors (TS2307 module-not-found,
  // TS2305 no-exported-member) reported against a COPIED file. Diagnostics on
  // engine internals are impossible here (engine is an opaque ambient module),
  // and type-usage noise (e.g. TS2709 from opaque engine types) is intentionally
  // ignored — this proves the SEAM (do all imports of the copied component
  // resolve in a real consumer layout), which is precisely the class the
  // dangling-dep/file-exists gates could not see.
  let tscOut = "";
  try {
    tscOut = execFileSync(
      tscBin,
      ["--noEmit", "--project", "tsconfig.json"],
      { cwd: scratchDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    tscOut = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }

  // A copied-file diagnostic line looks like `src/<path>.tsx(12,3): error TS2307: …`
  // (paths are relative to scratchDir; copied files live under `src/`, so a
  // leading `src/` — NOT `../` — marks a copied file). Only resolution codes.
  const resolutionErrors = tscOut
    .split("\n")
    .filter((line) =>
      /^src\/.+\.(tsx?|ts)\(\d+,\d+\): error TS(2307|2305):/.test(line),
    );

  if (resolutionErrors.length > 0) {
    console.error(
      `\nLocal linked-consumer E2E FAILED: ${resolutionErrors.length} copied ` +
        `file(s) have an UNRESOLVED import in a scratch consumer — the exact ` +
        `install defect (engine via @chelone/react, sibling via preserved ` +
        `structure, or ui via @/). Scratch left at ${scratchDir} for inspection:` +
        `\n${resolutionErrors.map((l) => `  ${l}`).join("\n")}`,
    );
    process.exit(1);
  }

  // Clean up on success (leave it on failure for inspection).
  rmSync(scratchDir, { recursive: true, force: true });
  console.log(
    `Local linked-consumer E2E PASSED: ${files.length} copied files across ` +
      `${items.size} items resolve every import (engine via @chelone/react, ` +
      `siblings via preserved structure, ui via @/).`,
  );
};

main();
