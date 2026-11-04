import { readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import editingMeta from "./content/editing/_meta";
import uiLayoutMeta from "./content/ui-layout/_meta";
import { buildNavTree } from "./nav";
import type { MetaEntry } from "./types";

// Reads the folder instead of importing nav-content: that module globs the
// .mdx pages, which vitest cannot transform. Slugs follow nav-content's toSlug,
// so a flat `foo.mdx` counts as a page like `foo/index.mdx`. The section's own
// index.mdx is its landing, not a page.
function sectionSlugs(dir: string): string[] {
  return readdirSync(path.resolve(__dirname, "content", dir), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, "").replace(/(^|\/)index$/, ""))
    .filter((s) => s !== "")
    .map((s) => `${dir}/${s}`);
}

/** The section as the sidebar builds it: its pages plus the slugs they came from. */
function buildSection(dir: string, meta: MetaEntry[]) {
  const slugs = sectionSlugs(dir);
  const [section] = buildNavTree(
    slugs,
    { "": [{ dir }], [dir]: meta },
    (s) => s,
  );
  return { section, slugs };
}

/** Pages the section's `_meta.ts` left under no heading. */
function uncategorised(section: ReturnType<typeof buildSection>["section"]) {
  return section.children
    .filter((c) => c.kind !== "leaf" || !c.category)
    .map((c) => (c.kind === "leaf" ? c.slug : c.dir));
}

test("every UI & Layout page sits under a category", () => {
  const { section, slugs } = buildSection("ui-layout", uiLayoutMeta);
  expect(uncategorised(section)).toEqual([]);
  expect(section.children).toHaveLength(slugs.length);
});

test("every Editing page sits under a category", () => {
  const { section, slugs } = buildSection("editing", editingMeta);
  expect(uncategorised(section)).toEqual([]);
  expect(section.children).toHaveLength(slugs.length);
});

test("Editing's categories run in the order its _meta lists them", () => {
  const { section } = buildSection("editing", editingMeta);
  const categories = section.children.flatMap((c) =>
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
