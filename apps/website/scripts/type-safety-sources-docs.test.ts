// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { pageMentions } from "../../../scripts/check-type-docs.mjs";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read(
  "../src/docs/content/type-safety/sources-filters-and-sort.mdx",
);
const dataProvidersPage = read(
  "../src/docs/content/app-config/data-providers.mdx",
);
const coreIndex = read("../../../packages/core/src/index.ts");

/** `type-docs.json` and its baseline: a page slug to the rows it carries. */
type RowsByPage = Record<string, string[]>;

/**
 * Every source, filter and sort type the page documents, in the order its
 * sections reach them. Each one must also be a real export of core, so a type
 * that moves or is renamed fails here rather than leaving a stale hover behind.
 */
const DOCUMENTED = [
  "SourcePath",
  "SourceProp",
  "AnySourcePath",
  "AnySourcePathOf",
  "RowSourcePath",
  "SourceValue",
  "SourceTransformValue",
  "SourceKey",
  "ReferenceTargetOf",
  "FilterSourceKey",
  "RecordFilterKey",
  "FilterPayload",
  "DisplayedFilters",
  "AnyFilterSourceKey",
  "AnyFilterSourceKeyOf",
  "calendarRangeFilter",
  "SortPayload",
  "LooseSortPayload",
  "LooseFilterPayload",
  "LooseDisplayedFilters",
  "LooseRecord",
] as const;

/** The section headings, in the order the issue lays them out. */
const SECTIONS = [
  "Source paths",
  "What a `source` prop takes",
  "Row paths",
  "Values",
  "Flat keys",
  "Filters",
  "Sort",
  "What stays loose on purpose",
  "Vue",
];

/** Each name core's entry exports, `type` and value exports both. */
function coreExports(source: string): Set<string> {
  const names = new Set<string>();
  const code = source.replace(/\/\/[^\n]*/g, "");
  for (const block of code.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const entry of block[1].split(",")) {
      const name = entry.trim().replace(/^type\s+/, "");
      if (name === "") continue;
      names.add(name.split(/\s+as\s+/).pop() as string);
    }
  }
  for (const direct of code.matchAll(
    /export\s+(?:type|interface|function|const|let|class|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(direct[1]);
  }
  return names;
}

it("the page documents every source, filter and sort type core exports", () => {
  const exported = coreExports(coreIndex);
  const missingFromCore = DOCUMENTED.filter((name) => !exported.has(name));
  const missingFromPage = DOCUMENTED.filter(
    (name) => !pageMentions(page, name),
  );

  expect(exported.has("SourcePath")).toBe(true);
  expect(missingFromCore).toEqual([]);
  expect(missingFromPage).toEqual([]);
});

it("the page's sections are in the order the types build on each other", () => {
  const headings = [...page.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  const at = SECTIONS.map((section) => headings.indexOf(section));

  expect(headings).toEqual(expect.arrayContaining(SECTIONS));
  expect(at.every((index) => index >= 0)).toBe(true);
  expect(at).toEqual([...at].sort((a, b) => a - b));
});

it("the page links the Type Safety pages it leans on and repeats none of them", () => {
  for (const slug of [
    "registering-your-app",
    "resource-registry-and-codegen",
    "typed-components",
    "typed-hooks",
    "when-types-widen",
  ]) {
    expect(page).toContain(`](/docs/type-safety/${slug})`);
  }
  // The factory and the record hooks belong to those pages, not this one.
  expect(pageMentions(page, "createResourceComponents")).toBe(false);
  expect(pageMentions(page, "useGetList")).toBe(false);
});

it("every docs link on the sources page resolves to a page", () => {
  expect(page).toContain("](/docs/editing/array-input)");
  expect(page).toContain("](/docs/editing/filter-form)");
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("every twoslash fence on the page names its errors with `// @errors:`", () => {
  const fences = [...page.matchAll(/```(\w+) twoslash[^\n]*\n([\s\S]*?)```/g)];
  const checked = fences.filter(([, , code]) =>
    /\/\/ @errors: (\d[\d ]*)/.test(code),
  );

  expect(fences.length).toBeGreaterThan(8);
  expect(checked.length).toBeGreaterThan(5);
  for (const [, , code] of checked) {
    const declared = code.match(/\/\/ @errors: ([\d ]+)/)?.[1].trim() ?? "";
    expect(declared.split(" ").every((code) => /^\d{4}$/.test(code))).toBe(
      true,
    );
  }
});

it("the page documents what is on main, with no coming soon note", () => {
  expect(page).not.toMatch(/coming soon|not yet|will cover/i);
});

it("the two map-typed twins map to When types widen, not to this page", () => {
  const docs: RowsByPage = JSON.parse(read("../../../type-docs.json"));
  const baseline: RowsByPage = JSON.parse(
    read("../../../type-docs-baseline.json"),
  );

  for (const name of ["AnySourcePathOf", "AnyFilterSourceKeyOf"]) {
    const row = `@chelone/core:${name}`;
    // #1908's page owns both rows, so this page names them and links there.
    expect(docs["sources-filters-and-sort"]).not.toContain(row);
    const pages = [...Object.entries(docs), ...Object.entries(baseline)]
      .filter(([, rows]) => rows.includes(row))
      .map(([slug]) => slug);
    expect(pages).toEqual(["when-types-widen"]);
  }
});

it("the data providers page names the loose sort payload the contract takes", () => {
  expect(dataProvidersPage).toContain(
    'type LooseSortPayload = { field: string; order: "ASC" | "DESC" };',
  );
  expect(dataProvidersPage).toContain(
    "sort?: LooseSortPayload | LooseSortPayload[]",
  );
  expect(dataProvidersPage).not.toContain("type SortPayload =");
  expect(dataProvidersPage).toContain(
    "](/docs/type-safety/sources-filters-and-sort)",
  );
  expect(unresolvedDocLinks(dataProvidersPage)).toEqual([]);
});
