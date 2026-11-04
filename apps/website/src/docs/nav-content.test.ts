import { readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import meta from "./content/ui-layout/_meta";
import { buildNavTree } from "./nav";

// Reads the folder instead of importing nav-content: that module globs the
// .mdx pages, which vitest cannot transform. Slugs follow nav-content's toSlug,
// so a flat `foo.mdx` counts as a page like `foo/index.mdx`. The section's own
// index.mdx is its landing, not a page.
const dir = path.resolve(__dirname, "content/ui-layout");
const slugs = readdirSync(dir, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, "").replace(/(^|\/)index$/, ""))
  .filter((s) => s !== "")
  .map((s) => `ui-layout/${s}`);

test("every UI & Layout page sits under a category", () => {
  const [section] = buildNavTree(
    slugs,
    { "": [{ dir: "ui-layout" }], "ui-layout": meta },
    (s) => s,
  );
  const uncategorised = section.children
    .filter((c) => c.kind !== "leaf" || !c.category)
    .map((c) => (c.kind === "leaf" ? c.slug : c.dir));
  expect(uncategorised).toEqual([]);
  expect(section.children).toHaveLength(slugs.length);
});
