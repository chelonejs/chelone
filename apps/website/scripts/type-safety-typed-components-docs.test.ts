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

/** Each fenced block on the page, with its language, meta line and code. */
const fences = (): { lang: string; meta: string; code: string }[] =>
  [...page.matchAll(/```(\w+)([^\n]*)\n([\s\S]*?)```/g)].map(
    ([, lang, meta, code]) => ({ lang, meta, code }),
  );

/** The text of the `## <heading>` section, up to the next `##`. */
function section(heading: string): string {
  const start = page.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`no "## ${heading}" on the page`);
  const next = page.indexOf("\n## ", start + 1);
  return page.slice(start, next === -1 ? page.length : next);
}

it("the section headings are in the order the issue lays them out", () => {
  const headings = [...page.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  for (const heading of [
    "How source narrows",
    "Reference components",
    "Forms with their own values",
  ]) {
    expect(headings, heading).toContain(heading);
  }
  // `Reference components` sits directly after the section on `source`.
  expect(headings.indexOf("Reference components")).toBe(
    headings.indexOf("How source narrows") + 1,
  );
  expect(
    headings.indexOf("Forms with their own values"),
    "after the reference components",
  ).toBeGreaterThan(headings.indexOf("Reference components"));
});

it("the reference components section names every reference component and both checked props", () => {
  const text = section("Reference components");
  for (const name of [
    "ReferenceField",
    "ReferenceOneField",
    "ReferenceManyField",
    "ReferenceArrayField",
    "ReferenceInput",
    "ReferenceArrayInput",
  ]) {
    expect(text, name).toContain(`\`${name}\``);
    // Each is a member of the bundle in both adapters.
    expect(hasKey(reactComponents, name), `React components: ${name}`).toBe(
      true,
    );
    expect(hasKey(vueSourceMembers, name), `Vue sourceMembers: ${name}`).toBe(
      true,
    );
  }
  expect(text).toContain("`reference`");
  expect(text).toContain("`target`");
  expect(text).toContain("ReferenceTargetOf");
});

/**
 * Each typo line in `code` with the `// @errors:` line directly above it, a
 * prose comment being allowed between the two.
 */
function typoLines(
  code: string,
  typos: string[],
): { typo: string; errors: string }[] {
  const lines = code.split("\n");
  return typos.map((typo) => {
    const index = lines.findIndex((line) => line.includes(typo));
    expect(index, typo).toBeGreaterThan(-1);
    for (let back = index - 1; back >= 0 && back >= index - 3; back--) {
      const match = /^\/\/ @errors: (\d+(?: \d+)*)$/.exec(lines[back] ?? "");
      if (match) return { typo, errors: match[1] };
    }
    throw new Error(`no // @errors: line above ${typo}`);
  });
}

it("the reference components fence fails a misspelt reference and a wrong target", () => {
  const text = section("Reference components");
  const fence = fences().find(
    ({ code }) =>
      text.includes(code) &&
      /reference="coments"/.test(code) &&
      /target="postid"/.test(code),
  );
  expect(fence, "a fence with both typos").toBeDefined();
  expect(fence?.meta).toMatch(/\btwoslash\b/);
  expect(
    typoLines(fence?.code ?? "", ['reference="coments"', 'target="postid"']),
  ).toEqual([
    { typo: 'reference="coments"', errors: "2820" },
    { typo: 'target="postid"', errors: "2820" },
  ]);
});

/** One adapter's reference input source. */
const inputSource = (adapter: "react" | "vue", file: string) =>
  read(
    `../../../packages/${adapter}/src/components/admin/inputs/${file}.${adapter === "react" ? "tsx" : "vue"}`,
  );

/** Whether a component declares a `lookupKey` prop. */
const hasLookupKey = (source: string) => /^\s+lookupKey\?:/m.test(source);

it("the lookupKey sentence matches the props each input declares", () => {
  const text = section("Reference components").replace(/\s+/g, " ");
  expect(
    hasLookupKey(inputSource("react", "reference-input")),
    "React ReferenceInput",
  ).toBe(true);
  expect(
    hasLookupKey(inputSource("react", "reference-array-input")),
    "React ReferenceArrayInput",
  ).toBe(true);
  expect(
    hasLookupKey(inputSource("vue", "reference-array-input")),
    "Vue ReferenceArrayInput",
  ).toBe(true);
  // Vue's `ReferenceInput` keys its choices by `id` and takes no `lookupKey`.
  expect(
    hasLookupKey(inputSource("vue", "reference-input")),
    "Vue ReferenceInput",
  ).toBe(false);
  // The page names which side has it, so no Vue reader writes a prop vue-tsc rejects.
  expect(text).toContain(
    "Vue has it on `ReferenceArrayInput` and not on `ReferenceInput`",
  );
});

it("the runtime-string escape names a component that carries both props it loosens", () => {
  const text = section("Reference components").replace(/\s+/g, " ");
  const match =
    /`(\w+)<LooseRecord, ResourceMap>` puts `string` back on (?:that component's|its) `reference` and `target`/.exec(
      text,
    );
  expect(
    match,
    "an escape that loosens `reference` and `target`",
  ).not.toBeNull();
  const name = match?.[1] ?? "";
  const file = name
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/^-/, "");
  // Only a component with a `target` prop can stand for both.
  for (const adapter of ["react", "vue"] as const) {
    const source = read(
      `../../../packages/${adapter}/src/components/admin/fields/${file}.${adapter === "react" ? "tsx" : "vue"}`,
    );
    expect(/^\s+target:/m.test(source), `${name} in ${adapter}`).toBe(true);
  }
});

it("the forms section types a form's inputs at its own values in both adapters", () => {
  const text = section("Forms with their own values");
  expect(text).toContain('<TextInput<LoginValues> source="email" />');
  expect(text).toContain("const CredentialInput = TextInput<LoginValues>;");
  expect(text).toMatch(/\blogin\b/i);

  const react = fences().find(
    ({ lang, code }) =>
      lang === "tsx" &&
      text.includes(code) &&
      /<TextInput<LoginValues>/.test(code),
  );
  const vue = fences().find(
    ({ lang, code }) =>
      lang === "vue" &&
      text.includes(code) &&
      /TextInput<LoginValues>/.test(code),
  );
  for (const fence of [react, vue]) {
    expect(fence, "one fence per adapter").toBeDefined();
    expect(fence?.meta).toMatch(/\btwoslash\b/);
    expect(typoLines(fence?.code ?? "", ['"emial"'])).toEqual([
      { typo: '"emial"', errors: "2820" },
    ]);
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
