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

/** The text of the `## <heading>` section, up to the next `##`. */
function section(heading: string): string {
  const start = page.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`no "## ${heading}" on the page`);
  const next = page.indexOf("\n## ", start + 1);
  return page.slice(start, next === -1 ? page.length : next);
}

it("the bare components section sends values that are no resource to the forms section", () => {
  const text = section("Bare components");
  expect(text).toContain(
    "](/docs/type-safety/typed-components#forms-with-their-own-values)",
  );
  expect(text.replace(/\s+/g, " ")).toContain("no registered resource");
});

it("the page names the escape for a reference built from a runtime string", () => {
  const text = section("Bare components").replace(/\s+/g, " ");
  expect(text).toContain("runtime string");
  expect(text).toContain("<LooseRecord, ResourceMap>");
  expect(names(page, "ResourceMap"), "ResourceMap on the widening page").toBe(
    true,
  );
});

/** One adapter's component source, named by its file stem. */
const componentSource = (
  adapter: "react" | "vue",
  folder: string,
  file: string,
) =>
  readFileSync(
    new URL(
      `../../../packages/${adapter}/src/components/admin/${folder}/${file}.${adapter === "react" ? "tsx" : "vue"}`,
      import.meta.url,
    ),
    "utf8",
  );

/** Whether a component declares a generic over the record as well as the map. */
const hasRecordGeneric = (source: string) =>
  /RecordType extends ResourceRecord/.test(source);

it("the escape names the type arguments each reference component declares", () => {
  const text = section("Bare components").replace(/\s+/g, " ");
  // A component generic over a record and a map is the one `<LooseRecord, ResourceMap>` fits.
  for (const file of [
    "reference-field",
    "reference-array-field",
    "reference-many-field",
    "reference-one-field",
  ]) {
    for (const adapter of ["react", "vue"] as const) {
      expect(
        hasRecordGeneric(componentSource(adapter, "fields", file)),
        `${file} in ${adapter}`,
      ).toBe(true);
    }
  }
  for (const file of ["reference-input", "reference-array-input"]) {
    expect(
      hasRecordGeneric(componentSource("react", "inputs", file)),
      `React ${file}`,
    ).toBe(true);
  }
  // Vue's two inputs are generic over the map and the name only, so the page
  // must give them `<ResourceMap>`: `<LooseRecord, ResourceMap>` would land
  // `LooseRecord` in the `TResources extends ResourceMap` slot.
  for (const file of ["reference-input", "reference-array-input"]) {
    expect(
      hasRecordGeneric(componentSource("vue", "inputs", file)),
      `Vue ${file}`,
    ).toBe(false);
  }
  expect(text).toContain("<ResourceMap>");
  expect(text).toContain("`ReferenceInput`");
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
