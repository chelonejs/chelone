// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/docs/content/type-safety/typed-components.mdx");
const reactFactory = read(
  "../../../packages/react/src/resource/create-resource-components.tsx",
);
const vueFactory = read(
  "../../../packages/vue/src/create-resource-components.ts",
);
const reactIndex = read("../../../packages/react/src/index.ts");
const vueIndex = read("../../../packages/vue/src/index.ts");
const coreIndex = read("../../../packages/core/src/index.ts");

/** The text of the first `{ ... }` block opened by `opener`, up to its closing `};`. */
function block(source: string, opener: string): string {
  const start = source.indexOf(opener);
  if (start === -1) throw new Error(`no ${opener} in the source`);
  const end = source.indexOf("\n};", start);
  return source.slice(start, end);
}

const reactComponents = block(reactFactory, "const components = {");
const vueSourceMembers = block(vueFactory, "const sourceMembers = {");
const vueTypedMembers = `${block(vueFactory, "type TypedFieldMembers<TRecord> = {")}\n${block(vueFactory, "type TypedInputMembers<TRecord> = {")}`;

const VIEWS = new Set(["Edit", "Create", "Show", "List"]);

/** Whether `name` is a key of the object or type body `text`. */
const hasKey = (text: string, name: string) =>
  new RegExp(`^\\s+${name}\\b`, "m").test(text);

it("every component the page names as a member is in the React components object and the Vue sourceMembers", () => {
  const named = new Set(
    [...page.matchAll(/\bposts\.([A-Z]\w+)/g)].map((match) => match[1]),
  );
  const members = [...named].filter((name) => !VIEWS.has(name));
  expect(members).toEqual(
    expect.arrayContaining(["TextInput", "TextField", "NumberInput"]),
  );
  for (const name of members) {
    expect(hasKey(reactComponents, name), `React components: ${name}`).toBe(
      true,
    );
    expect(hasKey(vueSourceMembers, name), `Vue sourceMembers: ${name}`).toBe(
      true,
    );
  }
  for (const view of VIEWS) expect(named).toContain(view);
});

it("the generic Vue components the page says are not members are in sourceMembers and in neither typed-member type", () => {
  const section = page.slice(page.indexOf("## Vue differences"));
  expect(section.length).toBeGreaterThan(0);
  for (const name of ["RecordField", "SelectInput"]) {
    expect(section, name).toContain(`\`${name}\``);
    expect(hasKey(vueSourceMembers, name), `Vue sourceMembers: ${name}`).toBe(
      true,
    );
    expect(hasKey(vueTypedMembers, name), `typed members: ${name}`).toBe(false);
  }
});

it("every docs link on the page resolves", () => {
  expect(page).toMatch(/\]\(\/docs\/type-safety\//);
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("every export the page documents is exported by its package index", () => {
  const exported = (index: string, name: string) =>
    new RegExp(`\\b${name}\\b`).test(index);
  for (const name of [
    "createResourceComponents",
    "createResourceComponentsOf",
    "ResourceComponents",
  ]) {
    expect(page, name).toContain(`\`${name}\``);
    expect(exported(reactIndex, name), `@chelone/react: ${name}`).toBe(true);
    expect(exported(vueIndex, name), `@chelone/vue: ${name}`).toBe(true);
  }
  for (const name of ["SourceProp", "SourceValue", "AnySourcePath"]) {
    expect(page, name).toContain(`\`${name}\``);
    expect(exported(coreIndex, name), `@chelone/core: ${name}`).toBe(true);
  }
});

it("the page has a title and description, and holds the five twoslash examples", () => {
  expect(page).toMatch(/^title: "Typed components"$/m);
  expect(page).toMatch(/^description: ".+"$/m);
  expect(page.match(/^\s*\/\/\s*\^\?/gm)?.length).toBeGreaterThanOrEqual(2);
  expect(page.match(/^\s*\/\/ @errors:/gm)?.length).toBeGreaterThanOrEqual(3);
  expect(page).toContain('Parameters<typeof posts.TextInput>[0]["source"]');
  expect(page).toContain('source="titel"');
  expect(page).toContain('createResourceComponents("comments")');
  expect(page).toContain("```vue");
});

it("the page holds no em dash and no bold", () => {
  expect(page).not.toMatch(/[—–]/);
  expect(page).not.toContain("**");
  expect(page).not.toMatch(/(^|[^\w])__\w/);
});
