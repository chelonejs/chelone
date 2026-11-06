// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const reactInspectorDir = new URL(
  "../../../packages/react/src/components/inspector/",
  import.meta.url,
);
const vueInspectorDir = new URL(
  "../../../packages/vue/src/components/inspector/",
  import.meta.url,
);

/** Every `chelone.inspector.*` key the add-on's components translate. */
function addOnTranslateKeys(dir: URL): string[] {
  const keys = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!/\.(tsx|vue)$/.test(file) || file.includes(".test.")) continue;
    for (const match of readFileSync(new URL(file, dir), "utf8").matchAll(
      /["'](chelone\.inspector\.[a-z_]+)["']/g,
    )) {
      keys.add(match[1]);
    }
  }
  return [...keys];
}

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

it("the inspector page's translation table names every key the add-on translates", () => {
  const keys = new Set([
    ...addOnTranslateKeys(reactInspectorDir),
    ...addOnTranslateKeys(vueInspectorDir),
  ]);
  // A key the page misses is a string a translator cannot find.
  expect(keys.size).toBeGreaterThan(0);
  for (const key of keys) {
    expect(inspector, `${key} in the table`).toContain(`| \`${key}\` |`);
  }
});

it("the ConfigurableInputs page names the key behind its panel title", () => {
  expect(configurableInputs).toContain("`chelone.inspector.inputs_title`");
});

it("the ConfigurableInputs page counts only elements in input-<index>", () => {
  const flat = configurableInputs.replace(/\s+/g, " ");
  expect(flat).toContain("`index` counts the elements only");
  expect(flat).toContain("is `input-1`, not `input-2`");
  expect(flat).not.toContain("position among the children");
});
