// A registry-typed export must be named by a Type Safety page. Each rule is
// pinned here on fixtures, and the last block runs the real tree against
// type-docs.json and type-docs-baseline.json.
//
//   pnpm test:scripts                                    the rules and the tree
//   node scripts/check-type-docs.mjs --update            rewrite both files
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { entryRows, exportName, pageMentions, pageText, problems, scanEntries, updateTexts } from "./check-type-docs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsPath = path.join(root, "type-docs.json");
const baselinePath = path.join(root, "type-docs-baseline.json");

/** @typedef {Record<string, string[]>} RowsByPage */

const SOURCE_PATH = "@chelone/core:SourcePath";
const ADMIN = "@chelone/react:Admin";
const USE_GET_LIST = "@chelone/react:useGetList";

/**
 * The tree is the two files' rows unless a test says otherwise, and each page
 * names its mapped rows by default, which is what a mapped row needs.
 *
 * @param {RowsByPage} docs
 * @param {RowsByPage} baseline
 * @param {{ found?: string[], baseBaseline?: RowsByPage | null, pages?: Record<string, string | null> }} [over]
 */
const check = (docs, baseline, over = {}) =>
  problems({
    found: over.found ?? [...Object.values(docs).flat(), ...Object.values(baseline).flat()],
    docs,
    baseline,
    baseBaseline: over.baseBaseline ?? baseline,
    pageText: (slug) => pagesOf(docs, over)[slug] ?? null,
  });

/** @param {RowsByPage} docs @param {{ pages?: Record<string, string | null> }} over */
const pagesOf = (docs, over) =>
  over.pages ?? Object.fromEntries(Object.entries(docs).map(([slug, rows]) => [slug, rows.map(exportName).join(" ")]));

describe("pageMentions", () => {
  it("reads the name as a whole word", () => {
    assert.ok(pageMentions("a `SourcePath` is a dotted path", "SourcePath"));
    assert.ok(!pageMentions("RowSourcePath is relative to a row", "SourcePath"));
    assert.ok(!pageMentions("AnySourcePathOf unions the paths", "AnySourcePath"));
    assert.ok(pageMentions("<Admin resources={…}>", "Admin"));
  });
});

describe("problems", () => {
  it("passes when every row sits in exactly one file", () => {
    assert.deepEqual(check({ "typed-hooks": [USE_GET_LIST] }, { "typed-hooks": [SOURCE_PATH, ADMIN] }), []);
  });

  it("names a registry-dependent export neither file holds", () => {
    assert.deepEqual(check({}, {}, { found: [SOURCE_PATH] }), [
      `${SOURCE_PATH} is registry-dependent and named by no page: map it in type-docs.json, or list it under its page in type-docs-baseline.json`,
    ]);
  });

  it("names a row in both files", () => {
    assert.deepEqual(check({ "typed-hooks": [SOURCE_PATH] }, { "typed-hooks": [SOURCE_PATH] }), [
      `${SOURCE_PATH} is in both type-docs.json and type-docs-baseline.json`,
      `${SOURCE_PATH} is in type-docs-baseline.json under typed-hooks, which already names it: move it to type-docs.json`,
    ]);
  });

  it("names a row a file holds under two pages", () => {
    const found = check({}, { "typed-hooks": [SOURCE_PATH], "typed-components": [SOURCE_PATH] });
    assert.deepEqual(found, [`${SOURCE_PATH} is in type-docs-baseline.json twice, under typed-components and typed-hooks`]);
  });

  it("names a mapped row whose page never names the export", () => {
    assert.deepEqual(
      check({ "typed-hooks": [SOURCE_PATH] }, {}, { pages: { "typed-hooks": "a page about filters and sort" } }),
      [`${SOURCE_PATH} maps to typed-hooks, which never names SourcePath`],
    );
  });

  it("names a mapped row whose page file is missing", () => {
    assert.deepEqual(
      check({ "typed-hooks": [SOURCE_PATH] }, {}, { pages: {} }),
      [`${SOURCE_PATH} maps to typed-hooks, which has no page file under apps/website/src/docs/content/type-safety/`],
    );
  });

  it("names a row either file holds that no export depends on any more", () => {
    assert.deepEqual(
      check({ "typed-hooks": [SOURCE_PATH] }, { "typed-hooks": [ADMIN] }, { found: [] }),
      [
        `${SOURCE_PATH} is in type-docs.json, but no export depends on a registry type through it any more`,
        `${ADMIN} is in type-docs-baseline.json, but no export depends on a registry type through it any more`,
      ],
    );
  });

  it("names a baseline row whose page already names it", () => {
    assert.deepEqual(
      check({}, { "typed-hooks": [USE_GET_LIST] }, { pages: { "typed-hooks": "useGetList reads the record" } }),
      [`${USE_GET_LIST} is in type-docs-baseline.json under typed-hooks, which already names it: move it to type-docs.json`],
    );
  });

  it("names a baseline row the base commit's baseline does not hold", () => {
    assert.deepEqual(
      check({}, { "typed-hooks": [SOURCE_PATH] }, { baseBaseline: { "typed-hooks": [] } }),
      [`${SOURCE_PATH} is a new baseline row: the baseline only shrinks, so a new registry-dependent export names its page in type-docs.json`],
    );
  });

  it("lets every baseline row through when the base has no baseline file", () => {
    assert.deepEqual(check({}, { "typed-hooks": [SOURCE_PATH] }, { baseBaseline: null }), []);
  });

  it("lets a row the base baseline held move to type-docs.json", () => {
    assert.deepEqual(
      check({ "typed-hooks": [SOURCE_PATH] }, {}, { baseBaseline: { "typed-hooks": [SOURCE_PATH] } }),
      [],
    );
  });
});

describe("updateTexts", () => {
  /**
   * @param {RowsByPage} docs
   * @param {RowsByPage} baseline
   * @param {{ found?: string[], pages?: Record<string, string | null> }} [over]
   */
  const run = (docs, baseline, over = {}) =>
    updateTexts({
      found: over.found ?? [...Object.values(docs).flat(), ...Object.values(baseline).flat()],
      docs,
      baseline,
      pageText: (slug) => pagesOf(docs, over)[slug] ?? null,
    });

  it("keeps every page key, even one with no rows", () => {
    const { docsText, baselineText } = run({ "when-types-widen": [] }, { "typed-hooks": [] });
    const empty = { "typed-hooks": [], "when-types-widen": [] };
    assert.equal(docsText, `${JSON.stringify(empty, null, 2)}\n`);
    assert.equal(baselineText, `${JSON.stringify(empty, null, 2)}\n`);
  });

  it("moves a baseline row whose page names it into type-docs.json", () => {
    const { docsText, baselineText } = run(
      { "typed-hooks": [] },
      { "typed-hooks": [USE_GET_LIST, SOURCE_PATH] },
      { pages: { "typed-hooks": "useGetList reads the record" } },
    );
    assert.deepEqual(JSON.parse(docsText), { "typed-hooks": [USE_GET_LIST] });
    assert.deepEqual(JSON.parse(baselineText), { "typed-hooks": [SOURCE_PATH] });
  });

  it("drops a row no export depends on any more", () => {
    const { docsText, baselineText, unassigned } = run(
      { "typed-hooks": [USE_GET_LIST] },
      { "typed-hooks": [ADMIN] },
      { found: [] },
    );
    assert.deepEqual(JSON.parse(docsText), { "typed-hooks": [] });
    assert.deepEqual(JSON.parse(baselineText), { "typed-hooks": [] });
    assert.deepEqual(unassigned, []);
  });

  it("holds the rows in code-unit order", () => {
    const { baselineText } = run({}, { "typed-hooks": [USE_GET_LIST, SOURCE_PATH, ADMIN] });
    assert.deepEqual(JSON.parse(baselineText), {
      "typed-hooks": [SOURCE_PATH, ADMIN, USE_GET_LIST],
    });
  });

  it("reports a row no page block holds", () => {
    const { unassigned } = run({}, {}, { found: [SOURCE_PATH] });
    assert.deepEqual(unassigned, [SOURCE_PATH]);
  });
});

/**
 * A tiny program over fixture files, so the scan rules need no packages built.
 * The host answers for the fixtures and leaves the compiler's own lib files to disk.
 *
 * @param {Record<string, string>} files fixture path -> source text
 */
function fixtureProgram(files) {
  const options = { strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext };
  const base = ts.createCompilerHost(options);
  const names = Object.keys(files);
  const host = {
    ...base,
    getSourceFile: (name, languageVersion) =>
      name in files ? ts.createSourceFile(name, files[name], languageVersion) : base.getSourceFile(name, languageVersion),
    fileExists: (name) => name in files || base.fileExists(name),
    readFile: (name) => (name in files ? files[name] : base.readFile(name)),
    directoryExists: (name) => names.some((file) => file.startsWith(`${name}/`)) || base.directoryExists(name),
    realpath: (name) => (names.some((file) => file === name || file.startsWith(`${name}/`)) ? name : base.realpath(name)),
  };
  return ts.createProgram(names, options, host);
}

const FIXTURE = {
  "/fixture/packages/core/src/resource/register.ts": `
export interface Register {}
export type RegisteredResources = Register extends { resources: infer R } ? R : Record<string, unknown>;
export type RegisteredResourceName = keyof RegisteredResources & string;
`,
  "/fixture/packages/core/src/index.ts": `
import type { Register, RegisteredResources, RegisteredResourceName } from "./resource/register";
export type { Register, RegisteredResources, RegisteredResourceName };
export declare function coreHook<TName extends RegisteredResourceName>(name: TName): TName;
export declare const looseHandle: { name: string };
export function bodyOnly(name: string): string {
  type Local = RegisteredResourceName;
  const value: Local = name;
  return value;
}
`,
  "/fixture/packages/react/src/index.ts": `
import type { RegisteredResourceName } from "../../core/src/index";
export type { RegisteredResourceName };
export { coreHook } from "../../core/src/index";
export { looseHandle } from "../../core/src/index";
export interface AdminProps<TName extends RegisteredResourceName> {
  resource: TName;
}
export function bodyOnlyReact(name: string): string {
  const value: RegisteredResourceName = name;
  return value;
}
`,
};

const fixture = fixtureProgram(FIXTURE);
const fixtureChecker = fixture.getTypeChecker();
const coreRows = entryRows(fixtureChecker, fixture.getSourceFile("/fixture/packages/core/src/index.ts"), "core");
const reactRows = entryRows(fixtureChecker, fixture.getSourceFile("/fixture/packages/react/src/index.ts"), "react");

describe("entryRows", () => {
  it("counts an export whose signature names a root type", () => {
    assert.ok(coreRows.includes("@chelone/core:coreHook"));
    assert.ok(reactRows.includes("@chelone/react:AdminProps"));
  });

  it("counts a root type itself", () => {
    assert.deepEqual(
      coreRows.filter((row) => row.startsWith("@chelone/core:Registered") || row === "@chelone/core:Register"),
      ["@chelone/core:Register", "@chelone/core:RegisteredResourceName", "@chelone/core:RegisteredResources"],
    );
  });

  it("leaves out an export that names a root type only inside a function body", () => {
    assert.ok(!coreRows.includes("@chelone/core:bodyOnly"));
    assert.ok(!reactRows.includes("@chelone/react:bodyOnlyReact"));
  });

  it("leaves out an export whose signature names nothing from the registry", () => {
    assert.ok(!coreRows.includes("@chelone/core:looseHandle"));
  });

  it("counts a core export once, not again for the adapter that re-exports it", () => {
    assert.ok(coreRows.includes("@chelone/core:coreHook"));
    assert.ok(!reactRows.includes("@chelone/react:coreHook"));
    assert.ok(!reactRows.includes("@chelone/react:RegisteredResourceName"));
    assert.ok(!reactRows.includes("@chelone/react:looseHandle"));
  });
});

describe("the tree against type-docs.json and type-docs-baseline.json", () => {
  const docsText = readFileSync(docsPath, "utf8");
  const baselineText = readFileSync(baselinePath, "utf8");
  const docs = /** @type {RowsByPage} */ (JSON.parse(docsText));
  const baseline = /** @type {RowsByPage} */ (JSON.parse(baselineText));
  const found = scanEntries();

  it("names every registry-dependent export in one of the two files", () => {
    const foundProblems = problems({ found, docs, baseline, baseBaseline: baseline, pageText });
    assert.deepEqual(
      foundProblems,
      [],
      `${foundProblems.length} type-docs problem(s):\n${foundProblems.join("\n")}`,
    );
  });

  it("holds one key per Type Safety page", () => {
    assert.deepEqual(
      Object.keys(baseline).sort(),
      [
        "registering-your-app",
        "resource-registry-and-codegen",
        "sources-filters-and-sort",
        "translations-and-permissions",
        "typed-components",
        "typed-hooks",
        "when-types-widen",
      ],
    );
    assert.deepEqual(Object.keys(docs).sort(), Object.keys(baseline).sort());
  });

  it("writes both files the way --update would", () => {
    const written = updateTexts({ found, docs, baseline, pageText });
    assert.equal(docsText, written.docsText, "type-docs.json is not what --update writes.");
    assert.equal(baselineText, written.baselineText, "type-docs-baseline.json is not what --update writes.");
  });
});
