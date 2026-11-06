// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import editingMeta from "../src/docs/content/editing/_meta";
import viewingMeta from "../src/docs/content/viewing/_meta";
import { installFor, vueInstallFor } from "../src/docs/registry";
import type { MetaEntry } from "../src/docs/types";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const inputPage = read(
  "../src/docs/content/editing/block-editor-input/index.mdx",
);
const fieldPage = read("../src/docs/content/viewing/block-doc-field/index.mdx");
const editingIndex = read("../src/docs/content/editing/index.mdx");
const viewingIndex = read("../src/docs/content/viewing/index.mdx");
const differences = read("../src/docs/content/vue/differences.mdx");
const reactReadme = read("../../../packages/react/README.md");
const vueReadme = read("../../../packages/vue/README.md");
const roadmap = read("../../../docs/roadmap.md");

const pages: [string, string][] = [
  ["BlockEditorInput", inputPage],
  ["BlockDocField", fieldPage],
];

/** The category a slug sits under in a section's `_meta.ts`. */
function categoryOf(meta: MetaEntry[], slug: string): string | undefined {
  for (const entry of meta) {
    if ("category" in entry && entry.slugs.includes(slug))
      return entry.category;
  }
  return undefined;
}

/** The slugs of one category, in the order `_meta.ts` lists them. */
function slugsOf(meta: MetaEntry[], category: string): string[] {
  for (const entry of meta) {
    if ("category" in entry && entry.category === category) return entry.slugs;
  }
  throw new Error(`no ${category} category`);
}

/** One `- ` bullet of a landing page, naming `needle`. */
function bullet(mdx: string, needle: string): string {
  const item = mdx.split(/\n(?=- )/).find((b) => b.includes(needle));
  if (!item) throw new Error(`no bullet naming ${needle}`);
  return item;
}

/** The body of every fenced code block. */
function fences(mdx: string): string[] {
  return [...mdx.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
}

it.each(pages)(
  "the %s page is hand-written and carries the block-editor registry",
  (name, mdx) => {
    expect(mdx).toContain(`title: "${name}"`);
    expect(mdx).toMatch(/^description: ".+"$/m);
    expect(mdx).toContain('registry: "block-editor"');
    // A generated stub page carries a marker; these pages are written by hand.
    expect(mdx).not.toContain("generated:");
    expect(mdx).toContain(`<PropsTable name="${name}" />`);
  },
);

it("both pages render an install block for @chelone/block-editor", () => {
  expect(installFor("block-editor")?.pnpm).toBe(
    "pnpm dlx shadcn@latest add @chelone/block-editor",
  );
  expect(vueInstallFor("block-editor")?.pnpm).toBe(
    "pnpm dlx shadcn-vue@latest add @chelone/block-editor",
  );
  expect(inputPage).toContain("npx shadcn add @chelone/block-editor");
  expect(inputPage).toContain("@chelone/react/block-editor");
  expect(inputPage).toContain("@chelone/vue/block-editor");
  expect(inputPage).toContain("@tiptap/");
  expect(fieldPage).toContain("@chelone/block-editor");
});

it.each(pages)("every docs link on the %s page resolves", (_name, mdx) => {
  expect(unresolvedDocLinks(mdx)).toEqual([]);
});

it("the input page says when to use it beside RichTextInput", () => {
  expect(inputPage).toContain("## When to use it");
  expect(inputPage).toContain("`<RichTextInput>`");
  expect(inputPage).toContain("](/docs/editing/mdx-input)");
  expect(inputPage).toContain("](/docs/viewing/block-doc-field)");
});

it("the input page gives the value contract: tiptap JSON, null when empty", () => {
  const flat = inputPage.replace(/\s+/g, " ");
  expect(inputPage).toContain("## Value contract");
  expect(flat).toMatch(/tiptap JSON/);
  expect(flat).toMatch(/stored as `null`/);
  expect(flat).toMatch(/`required\(\)`/);
});

it("the input page covers the slash picker and the block bar", () => {
  const flat = inputPage.replace(/\s+/g, " ");
  expect(inputPage).toMatch(/^## .*slash picker.*block bar.*$/m);
  expect(flat).toMatch(/Add block/);
  expect(flat).toMatch(/Configure/);
  expect(flat).toMatch(/Duplicate/);
  expect(flat).toMatch(/Move up/);
  expect(flat).toMatch(/Delete/);
});

it("the input page gives one defineBlock example per adapter", () => {
  const blockFences = fences(inputPage).filter((code) =>
    code.includes("defineBlock({"),
  );
  const adapters = blockFences.map((code) =>
    code.includes("@/components/block-editor/block-nodes") &&
    code.includes("<figure>")
      ? "react"
      : code.includes("h(")
        ? "vue"
        : "other",
  );
  expect(adapters).toEqual(["react", "vue"]);
  for (const code of blockFences) {
    expect(code).toContain("z.object");
    expect(code).toContain('config: "auto"');
  }
});

it("the input page says what describeBlockAttrs turns into a control", () => {
  const flat = inputPage.replace(/\s+/g, " ");
  expect(inputPage).toContain("describeBlockAttrs");
  expect(inputPage).toContain('`config: "auto"`');
  expect(flat).toMatch(/switch/i);
  expect(flat).toMatch(/native select|select/i);
  expect(flat).toMatch(/no control/);
});

it("the input page says an unknown block is kept on save", () => {
  const flat = inputPage.replace(/\s+/g, " ");
  expect(flat).toMatch(/unknown block/i);
  expect(flat).toMatch(/kept on save|kept as it is/i);
});

it("the input page has a Stored content section on images, embeds and the server", () => {
  expect(inputPage).toContain("## Stored content");
  const flat = inputPage.replace(/\s+/g, " ");
  expect(flat).toMatch(/safe source/);
  expect(flat).toMatch(/YouTube or Vimeo/);
  expect(flat).toMatch(/sandboxed iframe/);
  expect(flat).toMatch(/validate the document on the server/i);
});

it("the input page covers the data blocks, their caps and their read access", () => {
  expect(inputPage).toContain("## Data blocks");
  const flat = inputPage.replace(/\s+/g, " ");
  expect(inputPage).toContain("blocks={[...defaultBlocks, ...dataBlocks]}");
  expect(flat).toContain("`dataBlocks`");
  for (const name of ["referenceRecord", "recordList", "chart"]) {
    expect(flat, name).toContain(`\`${name}\``);
  }
  // The record list is capped at 50 rows and the chart at 1000, read at 100.
  expect(flat).toMatch(/1 to 50/);
  expect(flat).toMatch(/1000 at most/);
  expect(flat).toMatch(/100 by default/);
  // A data block is a data provider read, so it is gated by that resource's access.
  expect(flat).toMatch(/data provider/);
  expect(flat).toMatch(/error state/);
});

it("the input page draws a chart with the /charts components of each adapter", () => {
  const flat = inputPage.replace(/\s+/g, " ");
  expect(flat).toMatch(/`\/charts` components/);
  expect(flat).toContain("`<TrendChart>`");
  expect(flat).toContain("`<BarChart>`");
  expect(flat).toContain("`<DonutChart>`");
  expect(flat).toMatch(/recharts and\s+Vue with unovis/);
  for (const slug of ["trend-chart", "bar-chart", "donut-chart"]) {
    expect(inputPage, slug).toContain(`](/docs/ui-layout/${slug})`);
  }
});

it("the data blocks sample imports the file the registry writes", () => {
  const sample = fences(inputPage).find((code) =>
    code.includes("[...defaultBlocks, ...dataBlocks]"),
  );
  expect(sample).toBeDefined();
  expect(sample).toContain(
    'import { dataBlocks } from "@/components/block-editor/data-blocks";',
  );
});

it("the input page covers the drag handle and the keyboard path", () => {
  expect(inputPage).toContain("## Moving blocks");
  const flat = inputPage.replace(/\s+/g, " ");
  expect(flat).toContain("`@dnd-kit/react`");
  expect(flat).toContain("`@dnd-kit/vue`");
  expect(flat).toMatch(/Move up and Move down are the keyboard path/);
  expect(flat).toMatch(/not in\s+the tab order/);
  expect(inputPage).toContain("](#moving-blocks)");
});

it("the input page links to anchors that exist exactly once", () => {
  const headings = [...inputPage.matchAll(/^#{2,3} (.+)$/gm)].map((match) =>
    match[1]
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/ /g, "-"),
  );
  for (const [, anchor] of inputPage.matchAll(/\]\(#([a-z0-9-]+)\)/g)) {
    expect(
      headings.filter((heading) => heading === anchor),
      `#${anchor}`,
    ).toHaveLength(1);
  }
});

it("the field page says a data block reads its resource when the field renders", () => {
  expect(fieldPage).toContain("## Data blocks read live data");
  const flat = fieldPage.replace(/\s+/g, " ");
  expect(flat).toContain("`useGetOne`");
  expect(flat).toContain("`useGetList`");
  expect(flat).toMatch(/error state/);
  expect(fieldPage).toContain(
    "](/docs/editing/block-editor-input#data-blocks)",
  );
});

it("the differences page says the chart block draws with each adapter's /charts components", () => {
  const addons = differences.slice(differences.indexOf("## Add-ons"));
  const flat = addons.replace(/\s+/g, " ");
  expect(flat).toContain("`@chelone/vue/charts`");
  expect(flat).toContain("`@chelone/react/charts`");
  expect(flat).toContain("`recharts`");
  expect(flat).toContain("`@unovis/vue`");
  expect(flat).toContain("`@dnd-kit/vue`");
  expect(flat).toContain("`@dnd-kit/dom`");
  expect(flat).toMatch(/Both entries ship the four default blocks/);
});

it("both READMEs name the drag and chart peers the block-editor entry shares with /charts", () => {
  const reactRow = reactReadme
    .split("\n")
    .find((l) => l.includes("`@chelone/react/block-editor`"));
  expect(reactRow).toContain("@dnd-kit/react");
  expect(reactRow).toContain("@dnd-kit/dom");
  expect(reactRow).toContain("recharts");
  const vueRow = vueReadme
    .split("\n")
    .find((l) => l.includes("`@chelone/vue/block-editor`"));
  expect(vueRow).toContain("@dnd-kit/vue");
  expect(vueRow).toContain("@dnd-kit/dom");
  expect(vueRow).toContain("@unovis/vue");
  expect(vueRow).toContain("@unovis/ts");
});

it("the roadmap names the data blocks and the drag handle as built", () => {
  const line = roadmap
    .split("\n")
    .find((l) => l.includes("Block editor") && l.includes("block-editor"));
  expect(line).toContain("**Block editor** (built)");
  expect(line).toContain("data blocks");
  expect(line).toContain("drag handle");
  expect(line).toContain("`@dnd-kit/react`");
  expect(line).toContain("`@dnd-kit/vue`");
  expect(line).toContain("#927");
});

it("the field page shows a show view, blocks and empty, and links to the input", () => {
  expect(fieldPage).toContain("## In a show view");
  expect(fieldPage).toContain("](/docs/editing/block-editor-input)");
  const flat = fieldPage.replace(/\s+/g, " ");
  expect(flat).toMatch(/`blocks`/);
  expect(flat).toMatch(/`empty`/);
  expect(fieldPage).toContain("@/components/block-editor/block-doc-field");
});

it("the new slugs sit beside the rich text pages in each section's _meta", () => {
  const editing = slugsOf(editingMeta, "Rich & structured inputs");
  expect(categoryOf(editingMeta, "block-editor-input")).toBe(
    "Rich & structured inputs",
  );
  expect(editing.indexOf("block-editor-input")).toBe(
    editing.indexOf("mdx-input") + 1,
  );
  const viewing = slugsOf(viewingMeta, "Rich & structured fields");
  expect(categoryOf(viewingMeta, "block-doc-field")).toBe(
    "Rich & structured fields",
  );
  expect(viewing.indexOf("block-doc-field")).toBe(
    viewing.indexOf("mdx-field") + 1,
  );
});

it("each section landing says the block components are an add-on", () => {
  expect(bullet(editingIndex, "<BlockEditorInput>")).toContain("add-on");
  expect(bullet(viewingIndex, "<BlockDocField>")).toContain("add-on");
});

it("the Vue differences page names the block editor subpath, change and #empty", () => {
  const addons = differences.slice(differences.indexOf("## Add-ons"));
  const flat = addons.replace(/\s+/g, " ");
  expect(flat).toContain("`@chelone/vue/block-editor`");
  expect(flat).toContain("`change`");
  expect(flat).toContain("`#empty`");
  expect(differences).toContain("](/docs/editing/block-editor-input)");
  expect(differences).toContain("](/docs/viewing/block-doc-field)");
  expect(unresolvedDocLinks(differences)).toEqual([]);
});

it("both READMEs list the block-editor entry and its packages", () => {
  const reactRow = reactReadme
    .split("\n")
    .find((l) => l.includes("`@chelone/react/block-editor`"));
  expect(reactRow).toBeDefined();
  expect(reactRow).toContain("@tiptap/react");
  expect(reactRow).toContain("@tiptap/suggestion");
  const vueRow = vueReadme
    .split("\n")
    .find((l) => l.includes("`@chelone/vue/block-editor`"));
  expect(vueRow).toBeDefined();
  expect(vueRow).toContain("@tiptap/vue-3");
  expect(vueRow).toContain("@tiptap/suggestion");
});

it("the roadmap names both components, the subpath and the parent's issues", () => {
  const line = roadmap
    .split("\n")
    .find((l) => l.includes("Block editor") && l.includes("block-editor"));
  expect(line).toBeDefined();
  expect(line).toContain("`BlockEditorInput`");
  expect(line).toContain("`BlockDocField`");
  expect(line).toContain("`/block-editor`");
  expect(line).toContain("#914");
  expect(line).toContain("#920");
});
