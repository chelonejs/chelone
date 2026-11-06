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
