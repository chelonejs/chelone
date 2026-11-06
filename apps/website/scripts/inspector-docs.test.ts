// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const fieldsSelector = read(
  "../src/docs/content/viewing/fields-selector/index.mdx",
);
const inspector = read("../src/docs/content/ui-layout/inspector/index.mdx");
const configurableInputs = read(
  "../src/docs/content/editing/configurable-inputs/index.mdx",
);
const pages = [fieldsSelector, inspector, configurableInputs];

// The add-on ships from the `/inspector` subpath in both adapters, so its names
// are not in either barrel.
const reactEntry = read("../../../packages/react/src/inspector.ts");
const vueEntry = read("../../../packages/vue/src/inspector.ts");
const reactBarrel = read("../../../packages/react/src/index.ts");
const vueComponentsIndex = read(
  "../../../packages/vue/src/components/index.ts",
);

/** Every `<PropsTable name="X" />` on a page, which must have a props JSON. */
function propsTableNames(mdx: string): string[] {
  return [...mdx.matchAll(/<PropsTable name="([\w.]+)" \/>/g)].map(
    (match) => match[1],
  );
}

it("the FieldsSelector page is a generated stub with its registry item and props file", () => {
  expect(fieldsSelector).toMatch(/^title: "FieldsSelector"$/m);
  expect(fieldsSelector).toMatch(/^registry: "fields-selector"$/m);
  expect(fieldsSelector).toContain("{/* generated:gen-component-stubs */}");
  expect(fieldsSelector).toContain("listAs");
  expect(fieldsSelector).toContain("rowAs");
  expect(reactBarrel).toMatch(/\bFieldsSelector\b/);
  expect(vueComponentsIndex).toMatch(/\bFieldsSelector\b/);
});

it("the inspector page names the add-on entry, the peer and its four components", () => {
  expect(inspector).toMatch(/^title: "Inspector"$/m);
  expect(inspector).toMatch(/^registry: "inspector"$/m);
  for (const name of [
    "Inspector",
    "InspectorButton",
    "Configurable",
    "SortableFieldsSelector",
  ]) {
    expect(inspector, `${name} on the page`).toMatch(
      new RegExp(`\`<?${name}\\b`),
    );
    expect(reactEntry, `${name} in React`).toMatch(new RegExp(`\\b${name}\\b`));
    expect(vueEntry, `${name} in Vue`).toMatch(new RegExp(`\\b${name}\\b`));
  }
  for (const text of [
    "@chelone/react/inspector",
    "@chelone/vue/inspector",
    "@dnd-kit/react",
    "@dnd-kit/vue",
  ]) {
    expect(inspector, text).toContain(text);
  }
});

it("the ConfigurableInputs page names its component and its store keys", () => {
  expect(configurableInputs).toMatch(/^title: "ConfigurableInputs"$/m);
  expect(configurableInputs).toMatch(/^registry: "inspector"$/m);
  expect(propsTableNames(configurableInputs)).toEqual(["ConfigurableInputs"]);
  expect(reactEntry).toMatch(/\bConfigurableInputs\b/);
  expect(vueEntry).toMatch(/\bConfigurableInputs\b/);
  expect(configurableInputs).toContain("`<resource>.inputs`");
  expect(configurableInputs).toContain("_columnOrder");
});

it("every props table on the new pages has a props file", () => {
  for (const mdx of pages) {
    for (const name of propsTableNames(mdx)) {
      expect(
        existsSync(
          new URL(`../src/docs/content/props/${name}.json`, import.meta.url),
        ),
        `${name} props file`,
      ).toBe(true);
    }
  }
});

it("every docs link on the new pages resolves to a page", () => {
  for (const mdx of pages) {
    expect(unresolvedDocLinks(mdx)).toEqual([]);
  }
});
