// A hook or factory one adapter exports and the other does not is an export parity
// gap. Some are real gaps, such as React having no `useUpdateMany` or `useDeleteMany`
// while Vue has both; others are adapter shape, such as Vue's `useMicroStore`, which
// has no React twin because React has no store bridge to expose.
// export-parity-baseline.json maps every gap row to a note, so a new one-sided hook
// fails here instead of landing unnoticed, and closing a gap takes its row off the list.
// A row is `<side>:<entry>:<name>`, as `react:.:useEvent` or `vue:./maps:useMapLayer`,
// one per export the other adapter does not have under the same name and entry.
//
// Only hooks and factories are compared, the value exports matching `use*` or `create*`.
// Components are left out: showcase.json already tracks which adapter has each one.
// Other value exports, formatters included, stay out until a later issue widens this.
//
// Each adapter's exports are the entry points its package.json names, read with the
// TypeScript compiler API and followed through their re-exports to the declarations
// behind them. An entry only one adapter has, such as React's `./tanstack-router`, is
// compared as an entry with nothing on the other side.
//
// A note is `untriaged`, `matches <row>` for the other adapter's export of the same
// thing, `intended: <reason>`, or `gap: <what is missing>`.
//
//   pnpm test:scripts                                    the check, with the rules pinned
//   node scripts/export-parity.test.mjs --update         rewrite the baseline from the tree
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ts = createRequire(import.meta.url)("typescript");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "export-parity-baseline.json");
const packages = { react: path.join(root, "packages/react"), vue: path.join(root, "packages/vue") };

/** Hooks and factories: the value exports this check compares. */
const HOOK_OR_FACTORY = /^(use|create)[A-Z]/;
/** A note the baseline accepts. */
const NOTE = /^(?:untriaged|matches react:\S+:\S+|matches vue:\S+:\S+|intended: \S.*|gap: \S.*)$/;
/** A `matches` note and the row it names. */
const MATCHES = /^matches (react|vue):(\S+):(\S+)$/;
/** A module an entry point or a re-export can name. */
const MODULE_FILE = /\.(?:ts|tsx|mts|vue)$/;
/** The extensions a module specifier can leave off. */
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".vue"];
/** The script blocks of a Vue SFC, which is where its exports sit. */
const VUE_SCRIPT = /<script\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/script>/g;

/** @typedef {"react" | "vue"} Side */
/** @typedef {{ values: Set<string>, types: Set<string> }} ExportedNames the names a module exports, by kind */
/** @typedef {{ key: string; source: string }} Module a module's text, keyed by what its importers resolve it to */
/** @typedef {(specifier: string, from: Module) => Module | undefined} Load reads a re-exported module, or says it has no source here */
/** @typedef {Map<string, Set<string>>} AdapterExports the hooks and factories of each entry point, by subpath */
/** @typedef {`${Side}:${string}:${string}`} ExportKey one gap, as `vue:./maps:useMapMarker` */
/** @typedef {Record<string, string>} Baseline every row the list holds, mapped to its note */

/** Code-unit order, so the baseline's rows do not move with a locale. */
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** @param {string} file @returns {boolean} */
function isFile(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/** Each script block of a module as a parsed source file. */
function sourceFiles(module) {
  const blocks = module.key.endsWith(".vue") ? [...module.source.matchAll(VUE_SCRIPT)].map((block) => block[1]) : [module.source];
  return blocks.map((text) => ts.createSourceFile(module.key, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS));
}

/**
 * Whether a name an `export { ... }` hands out is a value or a type where it comes
 * from: the module it re-exports from, or this module's own imports and declarations.
 * A name its source does not carry, such as a `.vue` file's default export or one of
 * `@tanstack/query-core`'s, is taken at face value as a value.
 *
 * @param {string} local
 * @param {ExportedNames} source
 * @returns {"values" | "types"}
 */
function exportKind(local, source) {
  return source.types.has(local) && !source.values.has(local) ? "types" : "values";
}

/**
 * A name the module can hand out under its own specifier-less `export { ... }`: an
 * import or a declaration. An import is not an export on its own, and a name that is
 * not exported here does not travel through an `export *` that opens this module.
 */
function localNames(statement, locals) {
  if (!ts.isImportDeclaration(statement)) {
    declaredNames(statement, locals);
    return;
  }
  const clause = statement.importClause;
  const bindings = clause?.namedBindings;
  if (!clause || !bindings || !ts.isNamedImports(bindings)) return;
  for (const element of bindings.elements) {
    locals[clause.isTypeOnly || element.isTypeOnly ? "types" : "values"].add(element.name.text);
  }
}

/** A declaration, exported or not, into the names the caller names. */
function declaredNames(statement, into) {
  if (ts.isExportAssignment(statement)) {
    into.values.add("default");
  } else if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) into.values.add(declaration.name.text);
    }
  } else if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) {
    if (statement.name) into.values.add(statement.name.text);
  } else if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
    into.types.add(statement.name.text);
  }
}

/** @param {ts.Statement} statement @returns {boolean} */
function isExported(statement) {
  return ts.isExportAssignment(statement) || Boolean(ts.getModifiers(statement)?.some((modifier) => ts.isExportModifier(modifier)));
}

/** `export { A, B as C } from "./m"`, `export { A }`, `export * from "./m"`, and their type-only forms. */
function exportDeclaration(statement, module, load, cache, names, locals) {
  const specifier = statement.moduleSpecifier?.text;
  const target = specifier ? load(specifier, module) : undefined;
  const clause = statement.exportClause;
  if (!clause) {
    if (!target || statement.isTypeOnly) return;
    const followed = exportedNames(target, load, cache);
    for (const name of followed.values) names.values.add(name);
    for (const name of followed.types) names.types.add(name);
    return;
  }
  if (ts.isNamespaceExport(clause)) {
    names.values.add(clause.name.text);
    return;
  }
  if (!ts.isNamedExports(clause)) return;
  const source = target ? exportedNames(target, load, cache) : locals;
  for (const element of clause.elements) {
    const local = element.propertyName?.text ?? element.name.text;
    const kind = element.isTypeOnly || statement.isTypeOnly ? "types" : exportKind(local, source);
    names[kind].add(element.name.text);
  }
}

/**
 * The names a module exports as values and as types, following its re-exports to the
 * declarations behind them, through workspace packages included.
 *
 * @param {Module} module
 * @param {Load} load
 * @param {Map<string, ExportedNames>} [cache]
 * @returns {ExportedNames}
 */
export function exportedNames(module, load, cache = new Map()) {
  const cached = cache.get(module.key);
  if (cached) return cached;
  /** @type {ExportedNames} */
  const names = { values: new Set(), types: new Set() };
  cache.set(module.key, names);
  /** @type {ExportedNames} */
  const locals = { values: new Set(), types: new Set() };
  const files = sourceFiles(module);
  for (const file of files) {
    for (const statement of file.statements) {
      if (!ts.isExportDeclaration(statement) && !isExported(statement)) localNames(statement, locals);
    }
  }
  for (const file of files) {
    for (const statement of file.statements) {
      if (ts.isExportDeclaration(statement)) exportDeclaration(statement, module, load, cache, names, locals);
      else if (isExported(statement)) declaredNames(statement, names);
    }
  }
  return names;
}

/**
 * The hooks and factories a module exports, by name.
 *
 * @param {Module} module
 * @param {Load} load
 * @param {Map<string, ExportedNames>} [cache]
 * @returns {Set<string>}
 */
export function hooksAndFactories(module, load, cache) {
  return new Set([...exportedNames(module, load, cache).values].filter((name) => HOOK_OR_FACTORY.test(name)));
}

/** @param {string} file @returns {Module} */
function fileModule(file) {
  return { key: file, source: readFileSync(file, "utf8") };
}

/** The `exports` map of a workspace package, by its folder. */
function packageExports(packageDir) {
  const manifest = /** @type {{ exports?: Record<string, unknown> }} */ (JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8")));
  return manifest.exports ?? {};
}

/**
 * The module a bare specifier names inside the workspace, such as `@chelone/core` or
 * `@chelone/utils/osm`. An external package has no source to follow here.
 *
 * @param {string} specifier
 * @returns {Module | undefined}
 */
function packageModule(specifier) {
  if (!specifier.startsWith("@chelone/")) return undefined;
  const [name, ...rest] = specifier.slice("@chelone/".length).split("/");
  const dir = path.join(root, "packages", name);
  const target = packageExports(dir)[rest.length > 0 ? `./${rest.join("/")}` : "."];
  if (typeof target !== "string" || !MODULE_FILE.test(target)) return undefined;
  return fileModule(path.join(dir, target));
}

/**
 * The module a specifier names: a relative path resolved against the importing file, a
 * workspace package, or nothing, which the check reads as an export of the entry itself.
 *
 * @param {string} from
 * @param {string} specifier
 * @returns {Module | undefined}
 */
function resolveModule(from, specifier) {
  if (!specifier.startsWith(".")) return packageModule(specifier);
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [base, ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`), ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`))];
  const file = candidates.find(isFile);
  return file ? fileModule(file) : undefined;
}

/**
 * The entry points an adapter's package.json names, as `<subpath> -> file`. An entry
 * that names no module, a stylesheet or `./package.json`, is left out.
 *
 * @param {string} packageDir
 * @param {Record<string, unknown>} exports
 * @returns {Map<string, string>}
 */
export function entryPoints(packageDir, exports) {
  /** @type {Map<string, string>} */
  const entries = new Map();
  for (const [subpath, target] of Object.entries(exports)) {
    if (typeof target === "string" && MODULE_FILE.test(target)) entries.set(subpath, path.resolve(packageDir, target));
  }
  return entries;
}

/**
 * The hooks and factories one adapter exports, by entry point.
 *
 * @param {string} packageDir
 * @returns {AdapterExports}
 */
function adapterExports(packageDir) {
  /** @type {Map<string, ExportedNames>} */
  const cache = new Map();
  /** @type {AdapterExports} */
  const byEntry = new Map();
  const load = (specifier, from) => resolveModule(from.key, specifier);
  for (const [subpath, file] of entryPoints(packageDir, packageExports(packageDir))) {
    byEntry.set(subpath, hooksAndFactories(fileModule(file), load, cache));
  }
  return byEntry;
}

/**
 * One row per export the other adapter does not have under the same name and entry, in
 * code-unit order. An entry only one adapter has is compared as an entry with nothing
 * on the other side, so every hook it exports is a row.
 *
 * @param {AdapterExports} react
 * @param {AdapterExports} vue
 * @returns {ExportKey[]}
 */
export function oneSidedExports(react, vue) {
  /** @type {ExportKey[]} */
  const rows = [];
  const sides = /** @type {[Side, AdapterExports, AdapterExports][]} */ ([
    ["react", react, vue],
    ["vue", vue, react],
  ]);
  for (const [side, own, other] of sides) {
    for (const [entry, names] of own) {
      const rival = other.get(entry) ?? new Set();
      for (const name of names) if (!rival.has(name)) rows.push(`${side}:${entry}:${name}`);
    }
  }
  return rows.sort(byCodeUnit);
}

/**
 * The baseline file's text: every row mapped to its note, rows in code-unit order.
 *
 * @param {Baseline} baseline
 * @returns {string}
 */
export function baselineText(baseline) {
  /** @type {Baseline} */
  const sorted = {};
  for (const row of Object.keys(baseline).sort(byCodeUnit)) sorted[row] = baseline[row];
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/**
 * The baseline rewritten from the adapters: every new row as `untriaged`, every row the
 * adapters no longer have dropped, and every other note kept as it was written.
 *
 * @param {ExportKey[]} rows
 * @param {Baseline} baseline
 * @returns {Baseline}
 */
export function updatedBaseline(rows, baseline) {
  /** @type {Baseline} */
  const notes = {};
  for (const row of rows) notes[row] = baseline[row] ?? "untriaged";
  return notes;
}

/**
 * Why a row's note is no note the baseline accepts. A `matches` row must be an export
 * of the other adapter at the entry it names.
 *
 * @param {ExportKey} row
 * @param {string} note
 * @param {Record<Side, AdapterExports>} adapters
 * @returns {string | undefined}
 */
function noteProblem(row, note, adapters) {
  const reset = `Fix the export, write a note, or run \`node scripts/export-parity.test.mjs --update\` to reset the row to \`untriaged\`.`;
  if (!NOTE.test(note)) {
    return `${row}: the note \`${note}\` is none of \`untriaged\`, \`matches <row>\`, \`intended: <reason>\` or \`gap: <what is missing>\`. ${reset}`;
  }
  const match = MATCHES.exec(note);
  if (!match) return undefined;
  const [, side, entry, name] = match;
  if (side === sideOf(row)) {
    return `${row}: the note \`${note}\` names a row on its own side. \`matches\` names the other adapter's export of the same thing.`;
  }
  if (!adapters[side].get(entry)?.has(name)) {
    return `${row}: the note \`${note}\` names \`${note.slice("matches ".length)}\`, which ${side} does not export at \`${entry}\`. ${reset}`;
  }
  return undefined;
}

/** @param {string} row @returns {Side} */
function sideOf(row) {
  return /** @type {Side} */ (row.split(":")[0]);
}

/**
 * Every way the baseline and the adapters disagree, as messages.
 *
 * @param {AdapterExports} react
 * @param {AdapterExports} vue
 * @param {Baseline} baseline
 * @returns {string[]}
 */
export function parityProblems(react, vue, baseline) {
  const adapters = { react, vue };
  const rows = oneSidedExports(react, vue);
  const live = new Set(rows);
  /** @type {string[]} */
  const problems = [];
  for (const row of rows) {
    if (row in baseline) continue;
    problems.push(
      `${row}: no row in export-parity-baseline.json. Give the export to the other adapter too, or run \`node scripts/export-parity.test.mjs --update\` to add the row as \`untriaged\` and triage it in the pull request.`,
    );
  }
  for (const row of Object.keys(baseline)) {
    if (live.has(row)) continue;
    problems.push(
      `${row}: a row the adapters no longer have. Run \`node scripts/export-parity.test.mjs --update\` to drop it.`,
    );
  }
  for (const [row, note] of Object.entries(baseline)) {
    if (!live.has(row)) continue;
    const problem = noteProblem(row, note, adapters);
    if (problem) problems.push(problem);
  }
  return problems;
}

/** @returns {Baseline} the baseline's rows, or nothing when there is no file yet */
function readBaseline() {
  if (!existsSync(baselinePath)) return {};
  return /** @type {Baseline} */ (JSON.parse(readFileSync(baselinePath, "utf8")));
}

const adapters = {
  react: adapterExports(packages.react),
  vue: adapterExports(packages.vue),
};
const rows = oneSidedExports(adapters.react, adapters.vue);

if (process.argv.includes("--update")) {
  const written = updatedBaseline(rows, readBaseline());
  writeFileSync(baselinePath, baselineText(written));
  console.log(`Wrote ${Object.keys(written).length} export gaps to export-parity-baseline.json.`);
}

/**
 * A fixture graph, so the rules can be pinned without reading the tree: modules keyed
 * by the specifier their importer spells.
 *
 * @param {Record<string, string>} sources
 * @returns {{ names: (entry: string) => ExportedNames, hooks: (entry: string) => Set<string> }} what a module whose text is the argument exports
 */
const fixture = (sources) => {
  const load = (specifier) => (specifier in sources ? { key: specifier, source: sources[specifier] } : undefined);
  return {
    names: (entry) => exportedNames({ key: "entry", source: entry }, load),
    hooks: (entry) => hooksAndFactories({ key: "entry", source: entry }, load),
  };
};

/** The module most of the fixtures re-export from. */
const THING = {
  "./a": `export function useThing() {}\nexport const createThing = () => {}\nexport function thing() {}\nexport interface ThingResult {}\nexport class Thing {}`,
};

/** @param {Record<string, string[]>} entries @returns {AdapterExports} */
const exportsOf = (entries) => new Map(Object.entries(entries).map(([entry, names]) => [entry, new Set(names)]));

describe("exportedNames", () => {
  it("follows a re-export to the declaration behind it", () => {
    const names = fixture({ "./a": `export function useThing() {}` }).names(`export { useThing } from "./a";`);
    assert.deepEqual([...names.values], ["useThing"]);
  });

  it("leaves out a type export, however it is marked", () => {
    const names = fixture({
      "./a": `export function useThing() {}\nexport type UseThingOptions = { name: string }\nexport interface UseThingResult {}`,
    }).names(`export type { UseThingResult } from "./a";\nexport { useThing, type UseThingOptions } from "./a";\nexport interface UseThingState {}`);
    assert.deepEqual([...names.values], ["useThing"]);
    assert.deepEqual([...names.types].sort(), ["UseThingOptions", "UseThingResult", "UseThingState"]);
  });

  it("follows export * to the module it opens", () => {
    const names = fixture(THING).names(`export * from "./a";`);
    assert.deepEqual([...names.values].sort(), ["Thing", "createThing", "thing", "useThing"]);
    assert.deepEqual([...names.types], ["ThingResult"]);
  });

  it("keeps a renamed export under the name the entry gives it", () => {
    const names = fixture(THING).names(`export { useThing as useRenamed } from "./a";`);
    assert.deepEqual([...names.values], ["useRenamed"]);
  });

  it("reads a Vue component's exports out of its script block", () => {
    const names = fixture({
      "./thing.vue": `<script setup lang="ts">\nimport { ref } from "vue";\nexport function useThing() { return ref(0) }\nexport type ThingState = number\n</script>\n<template><div /></template>`,
    }).names(`export { useThing, type ThingState } from "./thing.vue";`);
    assert.deepEqual([...names.values], ["useThing"]);
    assert.deepEqual([...names.types], ["ThingState"]);
  });

  it("takes an export of a package it cannot read as a value", () => {
    const names = fixture({}).names(`export { useQuery, type UseQueryOptions } from "@tanstack/react-query";`);
    assert.deepEqual([...names.values], ["useQuery"]);
    assert.deepEqual([...names.types], ["UseQueryOptions"]);
  });

  it("an import is not an export", () => {
    const names = fixture({ "./b": `export function useX() {}` }).names(`import { useX } from "./b";\nimport { useRouter } from "vue-router";\nexport function useY() {}`);
    assert.deepEqual([...names.values], ["useY"]);
  });

  it("export * carries what the target exports, not what it imports", () => {
    const names = fixture({ "./a": `import { useX } from "./b";\nimport { useRouter } from "vue-router";\nexport function useY() {}` }).names(`export * from "./a";`);
    assert.deepEqual([...names.values], ["useY"]);
  });

  it("hands out a local import only under an export that names it", () => {
    const names = fixture({}).names(`import { useX } from "./b";\nimport type { XResult } from "./b";\nfunction useLocal() {}\nexport { useX, useLocal };\nexport type { XResult };`);
    assert.deepEqual([...names.values].sort(), ["useLocal", "useX"]);
    assert.deepEqual([...names.types], ["XResult"]);
  });
});

describe("hooksAndFactories", () => {
  it("keeps a hook or factory and leaves out anything else", () => {
    assert.deepEqual([...fixture(THING).hooks(`export * from "./a";`)].sort(), ["createThing", "useThing"]);
  });

  it("follows a re-export through a barrel", () => {
    const graph = {
      ...THING,
      "./b": `export { useThing } from "./a";\nexport type { ThingResult } from "./a";`,
    };
    assert.deepEqual([...fixture(graph).hooks(`export * from "./b";`)], ["useThing"]);
  });
});

describe("entryPoints", () => {
  it("names each entry point's module and leaves out the entries that name none", () => {
    const entries = entryPoints("/pkg", {
      ".": "./src/index.ts",
      "./maps": "./src/maps.ts",
      "./maps.css": "./src/maps-dark.css",
      "./package.json": "./package.json",
    });
    assert.deepEqual([...entries], [
      [".", "/pkg/src/index.ts"],
      ["./maps", "/pkg/src/maps.ts"],
    ]);
  });
});

describe("oneSidedExports", () => {
  it("names an export the other adapter lacks under the same entry", () => {
    assert.deepEqual(
      oneSidedExports(exportsOf({ ".": ["useThing", "useShared"] }), exportsOf({ ".": ["useShared", "useOther"] })),
      ["react:.:useThing", "vue:.:useOther"],
    );
  });

  it("leaves out a name both adapters export at the same entry", () => {
    assert.deepEqual(oneSidedExports(exportsOf({ ".": ["useThing"] }), exportsOf({ ".": ["useThing"] })), []);
  });

  it("names a name exported at a different entry on each side", () => {
    assert.deepEqual(oneSidedExports(exportsOf({ ".": ["useThing"] }), exportsOf({ "./maps": ["useThing"] })), [
      "react:.:useThing",
      "vue:./maps:useThing",
    ]);
  });

  it("an entry only one adapter has lists its exports", () => {
    assert.deepEqual(oneSidedExports(exportsOf({ ".": [], "./router": ["useRoute"] }), exportsOf({ ".": [] })), [
      "react:./router:useRoute",
    ]);
  });

  it("a component is not compared", () => {
    const sources = { "./a": `export const Admin = () => {}\nexport function useAdmin() {}` };
    const react = new Map([[".", fixture(sources).hooks(`export * from "./a";`)]]);
    assert.deepEqual(oneSidedExports(react, new Map([[".", new Set()]])), ["react:.:useAdmin"]);
  });
});

describe("parityProblems", () => {
  const react = exportsOf({ ".": ["useThing", "useNamed"], "./maps": ["useMapThing"] });
  const vue = exportsOf({ ".": ["useOther", "useNamed"], "./maps": [] });
  const held = {
    "react:.:useThing": "gap: React has no twin for it",
    "react:./maps:useMapThing": "intended: only Vue renders a map",
    "vue:.:useOther": "untriaged",
  };

  it("holds the adapters where a baseline that names every row says they are", () => {
    assert.deepEqual(parityProblems(react, vue, held), []);
  });

  it("a one-sided export with no row fails", () => {
    const rest = Object.fromEntries(Object.entries(held).filter(([row]) => row !== "react:.:useThing"));
    assert.deepEqual(parityProblems(react, vue, rest), [
      "react:.:useThing: no row in export-parity-baseline.json. Give the export to the other adapter too, or run `node scripts/export-parity.test.mjs --update` to add the row as `untriaged` and triage it in the pull request.",
    ]);
  });

  it("a row the adapters no longer have fails", () => {
    assert.deepEqual(parityProblems(react, vue, { ...held, "vue:.:useGone": "untriaged" }), [
      "vue:.:useGone: a row the adapters no longer have. Run `node scripts/export-parity.test.mjs --update` to drop it.",
    ]);
  });

  it("a note in no known form fails", () => {
    const bad = (note) => parityProblems(react, vue, { ...held, "vue:.:useOther": note })[0];
    assert.equal(
      bad("maybe: someone will look"),
      "vue:.:useOther: the note `maybe: someone will look` is none of `untriaged`, `matches <row>`, `intended: <reason>` or `gap: <what is missing>`. Fix the export, write a note, or run `node scripts/export-parity.test.mjs --update` to reset the row to `untriaged`.",
    );
    assert.ok(bad("matches something").includes("is none of"));
    assert.ok(bad("intended:").includes("is none of"));
  });

  it("a matches note naming no export fails", () => {
    assert.deepEqual(parityProblems(react, vue, { ...held, "react:.:useThing": "matches vue:.:useMissing" }), [
      "react:.:useThing: the note `matches vue:.:useMissing` names `vue:.:useMissing`, which vue does not export at `.`. Fix the export, write a note, or run `node scripts/export-parity.test.mjs --update` to reset the row to `untriaged`.",
    ]);
  });

  it("a matches note naming the other adapter's export holds", () => {
    assert.deepEqual(parityProblems(react, vue, { ...held, "react:.:useThing": "matches vue:.:useOther" }), []);
  });

  it("a matches note naming a row on its own side fails", () => {
    assert.deepEqual(parityProblems(react, vue, { ...held, "react:.:useThing": "matches react:.:useNamed" }), [
      "react:.:useThing: the note `matches react:.:useNamed` names a row on its own side. `matches` names the other adapter's export of the same thing.",
    ]);
  });
});

describe("updatedBaseline", () => {
  it("update keeps notes", () => {
    const rows = ["react:.:useNew", "vue:.:useHeld"];
    const baseline = { "vue:.:useHeld": "intended: React reads the store directly", "vue:.:useGone": "gap: never landed" };
    assert.deepEqual(updatedBaseline(rows, baseline), {
      "react:.:useNew": "untriaged",
      "vue:.:useHeld": "intended: React reads the store directly",
    });
  });

  it("writes the rows in code-unit order", () => {
    // `./maps` sorts before `.`: `/` is below `:` in code units.
    assert.equal(
      baselineText({ "vue:.:useB": "untriaged", "react:.:useA": "untriaged", "react:./maps:useC": "untriaged" }),
      `{\n  "react:./maps:useC": "untriaged",\n  "react:.:useA": "untriaged",\n  "vue:.:useB": "untriaged"\n}\n`,
    );
  });
});

describe("the adapters' one-sided hooks and factories match the baseline", () => {
  const text = readFileSync(baselinePath, "utf8");
  const baseline = /** @type {Baseline} */ (JSON.parse(text));

  it("the adapters' one-sided hooks and factories match the baseline", () => {
    assert.deepEqual(
      parityProblems(adapters.react, adapters.vue, baseline),
      [],
      "export-parity-baseline.json and the adapters disagree. Fix the export, or run `node scripts/export-parity.test.mjs --update` and triage what it adds.",
    );
  });

  it("is the file the script writes", () => {
    assert.equal(
      text,
      baselineText(updatedBaseline(rows, baseline)),
      "export-parity-baseline.json is not the list the script writes. Run `node scripts/export-parity.test.mjs --update`.",
    );
  });
});
