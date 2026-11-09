// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const page = readFileSync(
  new URL(
    "../src/docs/content/type-safety/when-types-widen.mdx",
    import.meta.url,
  ),
  "utf8",
);
const coreIndex = readFileSync(
  new URL("../../../packages/core/src/index.ts", import.meta.url),
  "utf8",
);

/**
 * Every widening type the page is written to cover. Each is exported by
 * `@chelone/core`, and each must be named on the page: the page is the one that
 * explains the fallbacks, so a type that widens and is never named there is a
 * hole in it.
 */
const WIDENING_TYPES = [
  "AnyFilterSourceKeyOf",
  "AnySourcePath",
  "AnySourcePathOf",
  "FilterPayload",
  "LooseRecord",
  "MessageCatalog",
  "RecordFilterKey",
  "RecordOf",
  "RegisteredMessages",
  "RegisteredPermissions",
  "RegisteredResourceName",
  "RowSourcePath",
  "SortPayload",
  "SourcePath",
  "SourceProp",
  "TranslateFor",
];

/** A whole word, so `RowSourcePath` is no `SourcePath` and `AnySourcePathOf` is no `AnySourcePath`. */
const names = (text: string, name: string): boolean => {
  const word = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9_$])${word}(?![A-Za-z0-9_$])`).test(text);
};

const exported = (index: string, name: string) =>
  new RegExp(`export (?:type )?\\{[^}]*\\b${name}\\b`).test(index) ||
  new RegExp(`export (?:function|const) ${name}\\b`).test(index);

/** Each `twoslash` fence on the page, with its meta line and its code. */
const twoslashFences = (): { meta: string; code: string }[] =>
  [...page.matchAll(/```(\w+)([^\n]*)\n([\s\S]*?)```/g)]
    .filter(([, , meta]) => /\btwoslash\b/.test(meta))
    .map(([, , meta, code]) => ({ meta, code }));

it("the page documents every widening type core exports", () => {
  for (const name of WIDENING_TYPES) {
    expect(names(page, name), `${name} on the widening page`).toBe(true);
    expect(exported(coreIndex, name), `${name} in @chelone/core`).toBe(true);
  }
});

it("every docs link on the widening page resolves", () => {
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("the widening page links the Type Safety pages it stands on", () => {
  for (const slug of [
    "registering-your-app",
    "resource-registry-and-codegen",
    "typed-components",
    "sources-filters-and-sort",
    "translations-and-permissions",
  ]) {
    expect(page, `/docs/type-safety/${slug}`).toContain(
      `/docs/type-safety/${slug}`,
    );
  }
});

it("the page carries every twoslash block it promises", () => {
  for (const snippet of [
    // Nothing registered: an invented sort field compiles.
    'const sort: SortPayload = { field: "made_up_column", order: "ASC" };',
    // A registered app with one schemaless resource.
    "comments: {},",
    'const sort: SortPayload<PostRecord> = { field: "titel", order: "ASC" };',
    // The same map with `comments` registered, and a typed component that rejects it.
    'const typed: SourceProp<PostRecord> = "body";',
    // A loose record field is `unknown`.
    "const title = row.title.toUpperCase();",
    // An open record: paths under an index signature, an `any` field and open rows.
    'const extra: OpenSource = "extra.anything";',
    'const underAny: OpenSource = "any.anything";',
    'const underRow: OpenSource = "rows[0].anything";',
    // The 8 level bound.
    'const eight: SourcePath<Deep> = "a.b.c.d.e.f.g.h";',
    'const past: SourcePath<Deep> = "a.b.c.d.e.f.g.h.i";',
    // The `*Of` variants with no augmentation in the file.
    "type Paths = AnySourcePathOf<typeof resources>;",
    "type FilterKeys = AnyFilterSourceKeyOf<typeof resources>;",
  ]) {
    expect(page, snippet).toContain(snippet);
  }

  const fences = twoslashFences();
  expect(fences.length).toBe(7);
  for (const { code } of fences) {
    for (const line of code.split("\n")) {
      if (!line.trimStart().startsWith("// @errors:")) continue;
      expect(line, `// @errors line ${line}`).toMatch(
        /^\/\/ @errors: \d+(?: \d+)*$/,
      );
    }
  }
});

it("the page names the type cost tooling and gives no figure", () => {
  const cost = page.slice(page.indexOf("## Editor performance and type cost"));
  expect(cost.length).toBeGreaterThan(0);
  for (const text of [
    "type-cost-budget.json",
    "pnpm check:type-cost",
    "tsc --noEmit --extendedDiagnostics",
    "tsc --generateTrace",
    "vue-tsc --noEmit --extendedDiagnostics",
    "Instantiations",
    "Types",
  ]) {
    expect(cost, text).toContain(text);
  }
  // A figure goes stale, so the page says what to measure and never what to expect.
  expect(cost).not.toMatch(/\d/);
});

it("the page states the two path bounds the types enforce", () => {
  // Prose wraps in the source, so the bounds are read with their line breaks folded.
  const prose = page.replace(/\s+/g, " ");
  expect(prose).toContain("8 object levels");
  expect(prose).toContain("array nesting 3 deep");
});
