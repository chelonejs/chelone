import { readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import editingMeta from "./content/editing/_meta";
import uiLayoutMeta from "./content/ui-layout/_meta";
import viewingMeta from "./content/viewing/_meta";
import { buildNavTree } from "./nav";
import type { MetaEntry } from "./types";

// Reads the folder instead of importing nav-content: that module globs the
// .mdx pages, which vitest cannot transform. Slugs follow nav-content's toSlug,
// so a flat `foo.mdx` counts as a page like `foo/index.mdx`. The section's own
// index.mdx is its landing, not a page.
function sectionSlugs(section: string): string[] {
  const dir = path.resolve(__dirname, "content", section);
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, "").replace(/(^|\/)index$/, ""))
    .filter((s) => s !== "")
    .map((s) => `${section}/${s}`);
}

/** The section as the sidebar builds it: its nodes plus the slugs they came from. */
function sectionTree(section: string, meta: MetaEntry[]) {
  const slugs = sectionSlugs(section);
  const [root] = buildNavTree(
    slugs,
    { "": [{ dir: section }], [section]: meta },
    (s) => s,
  );
  return { root, slugs };
}

function expectEveryPageCategorised(section: string, meta: MetaEntry[]) {
  const { root, slugs } = sectionTree(section, meta);
  const uncategorised = root.children
    .filter((c) => c.kind !== "leaf" || !c.category)
    .map((c) => (c.kind === "leaf" ? c.slug : c.dir));
  expect(uncategorised).toEqual([]);
  expect(root.children).toHaveLength(slugs.length);
}

test("every UI & Layout page sits under a category", () => {
  expectEveryPageCategorised("ui-layout", uiLayoutMeta);
});

test("every Viewing page sits under a category", () => {
  expectEveryPageCategorised("viewing", viewingMeta);
});

test("every Editing page sits under a category", () => {
  expectEveryPageCategorised("editing", editingMeta);
});

test("Editing's categories run in the order its _meta lists them", () => {
  const { root } = sectionTree("editing", editingMeta);
  const categories = root.children.flatMap((c) =>
    c.kind === "leaf" && c.category ? [c.category] : [],
  );
  expect([...new Set(categories)]).toEqual([
    "Text & number inputs",
    "Date & time inputs",
    "Choices & references",
    "Rich & structured inputs",
    "Forms",
    "Buttons",
    "Bulk actions",
  ]);
});
