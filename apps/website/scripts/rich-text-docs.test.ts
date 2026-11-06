// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const inputPage = read("../src/docs/content/editing/rich-text-input/index.mdx");
const fieldPage = read("../src/docs/content/viewing/rich-text-field/index.mdx");
const reactReadme = read("../../../packages/react/README.md");
const vueReadme = read("../../../packages/vue/README.md");
const roadmap = read("../../../docs/roadmap.md");

// Prose phrases are matched on one line, however the page wraps them.
const flat = (mdx: string) => mdx.replace(/\s+/g, " ");

/** The body of `## <heading>`, up to the next `## `. */
function section(mdx: string, heading: string): string {
  const body = mdx.split(/^## /m).find((part) => part.startsWith(heading));
  if (body === undefined) throw new Error(`no ## ${heading} section`);
  return body;
}

/** The body of every fenced code block. */
function fences(mdx: string): string[] {
  return [...mdx.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(
    (match) => match[1],
  );
}

const pages: [string, string][] = [
  ["RichTextInput", inputPage],
  ["RichTextField", fieldPage],
];

it.each(pages)("every docs link on the %s page resolves", (_name, mdx) => {
  expect(unresolvedDocLinks(mdx)).toEqual([]);
});

it("the input page has Images, Text color and Code blocks sections", () => {
  expect(inputPage).toMatch(/^## Images$/m);
  expect(inputPage).toMatch(/^## Text color$/m);
  expect(inputPage).toMatch(/^## Code blocks$/m);
});

it("the Toolbar section gates only images and colors on the toolbar", () => {
  const text = flat(section(inputPage, "Toolbar"));
  expect(text).toMatch(
    /`images` and `colors` decide whether the Image and Text color buttons are in the toolbar/,
  );
  expect(text).toMatch(/`codeHighlight` keeps the Code block button/);
  expect(text).not.toMatch(/three props decide/i);
});

it("the Images section covers the images prop, its file rules and its callbacks", () => {
  const images = section(inputPage, "Images");
  const text = flat(images);
  expect(images).toContain("`images`");
  for (const option of [
    "allowedMimeTypes",
    "maxFileSize",
    "allowBase64",
    "uploadFn",
    "onImageError",
  ]) {
    expect(images, option).toContain(`\`${option}\``);
  }
  expect(text).toMatch(/`false` leaves out the image extension/);
  expect(text).toMatch(/5 MB/);
  expect(text).toMatch(/SVG/);
  expect(text).toMatch(/`"type"`, `"size"`, `"src"` or `"upload"`/);
});

it("the Images section gives an uploadFn example that returns a URL", () => {
  const examples = fences(inputPage).filter((code) =>
    code.includes("uploadFn"),
  );
  expect(examples).toHaveLength(1);
  const [example] = examples;
  expect(example).toContain("<RichTextInput");
  expect(example).toContain("images={{");
  expect(example).toMatch(/return .*https:\/\//);
  expect(example).toContain("onImageError");
});

it("the Images section says what the data URL fallback stores", () => {
  const text = flat(section(inputPage, "Images"));
  expect(text).toMatch(/Without `uploadFn`/);
  expect(text).toMatch(/data URL/);
  expect(text).toMatch(/`allowBase64`/);
});

it("the Images section covers inserting, the upload state, resizing and the image actions", () => {
  const text = flat(section(inputPage, "Images"));
  expect(text).toMatch(/`blob:`/);
  expect(text).toMatch(/never stored|is left out/);
  expect(text).toMatch(/Resize|resize/);
  expect(text).toMatch(/Arrow Left|ArrowRight/);
  expect(text).toMatch(/60 px/);
  for (const action of [
    "View image",
    "Download image",
    "Copy image",
    "Copy link",
    "Remove image",
  ]) {
    expect(text, action).toContain(action);
  }
});

it("the Text color section covers colors, the palette and the CSS variables", () => {
  const colors = section(inputPage, "Text color");
  const text = flat(colors);
  expect(colors).toContain("`colors`");
  expect(text).toMatch(/`false` leaves out the color extension/);
  expect(text).toMatch(/Bright/);
  expect(text).toMatch(/Soft/);
  expect(text).toMatch(/Muted/);
  expect(text).toMatch(/--rich-text-color-bright-red/);
  expect(text).toMatch(/one `color` declaration/);
  const css = fences(inputPage).filter((code) =>
    code.includes("--rich-text-color-"),
  );
  expect(css.length).toBeGreaterThan(0);
});

it("the Code blocks section covers codeHighlight, lowlight and the stored HTML", () => {
  const code = section(inputPage, "Code blocks");
  const text = flat(code);
  expect(code).toContain("`codeHighlight`");
  expect(text).toMatch(
    /The Code block button is in the toolbar whatever `codeHighlight` is/,
  );
  expect(text).toMatch(/lowlight/);
  expect(text).toMatch(/<pre><code class="language-/);
  expect(text).toMatch(/no highlight markup|not stored/i);
});

it("the Stored HTML section names the safe image source, the single color declaration and plain code", () => {
  const text = flat(section(inputPage, "Stored HTML"));
  expect(text).toMatch(/img/);
  expect(text).toMatch(/safe source/);
  expect(text).toMatch(/one `color` declaration/);
  expect(text).toMatch(/no highlight markup|without highlighting|plain/i);
});

it("the field page says images and colors survive sanitizing", () => {
  const text = flat(fieldPage);
  expect(text).toMatch(/images? .*color/i);
  expect(text).toMatch(/safe source|`src` is unsafe/);
  expect(fieldPage).toContain("](/docs/editing/rich-text-input#images)");
  expect(fieldPage).toContain("](/docs/editing/rich-text-input#text-color)");
});

it("both READMEs name the rich text peers the new features need", () => {
  for (const [adapter, readme] of [
    ["react", reactReadme],
    ["vue", vueReadme],
  ] as const) {
    const row = readme
      .split("\n")
      .find((line) => line.includes(`\`@chelone/${adapter}/rich-text-input\``));
    expect(row, adapter).toBeDefined();
    for (const peer of [
      "@tiptap/extension-image",
      "@tiptap/extension-text-style",
      "@tiptap/extension-code-block",
      "@tiptap/extension-code-block-lowlight",
      "lowlight",
      "highlight.js",
      "dompurify",
    ]) {
      expect(row, peer).toContain(peer);
    }
  }
});

it("the roadmap names images, text color and code highlighting as built", () => {
  const line = roadmap
    .split("\n")
    .find(
      (l) => l.includes("Tiptap rich text") && l.includes("rich-text-input"),
    );
  expect(line).toBeDefined();
  expect(line).toContain("images");
  expect(line).toContain("color");
  expect(line).toContain("code highlighting");
  expect(line).toContain("#913");
});
