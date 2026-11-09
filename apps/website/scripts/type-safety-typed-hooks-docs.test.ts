// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";
import { remarkTwoslash } from "./twoslash.mjs";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const pagePath = "../src/docs/content/type-safety/typed-hooks.mdx";
const pageUrl = new URL(pagePath, import.meta.url);
const page = read(pagePath);
const meta = read("../src/docs/content/type-safety/_meta.ts");
const reactFactory = read("../../../packages/react/src/hooks.ts");
const vueFactory = read(
  "../../../packages/vue/src/data/create-chelone-hooks.ts",
);
const reactIndex = read("../../../packages/react/src/index.ts");
const vueIndex = read("../../../packages/vue/src/index.ts");
const coreIndex = read("../../../packages/core/src/index.ts");

/** The section's text between `heading` and the next `## `, or `""` without it. */
function section(heading: string): string {
  const start = page.indexOf(heading);
  if (start === -1) return "";
  const rest = page.slice(start + heading.length);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

/** The keys of the object literal `createCheloneHooks` returns. */
function factoryMembers(source: string): string[] {
  const start = source.indexOf("export function createCheloneHooks");
  if (start === -1)
    throw new Error("no createCheloneHooks in the factory source");
  const body = source.slice(
    source.indexOf("return {", start),
    source.indexOf("\n  };", start),
  );
  return [...body.matchAll(/^ {4}(\w+):/gm)].map((match) => match[1]);
}

/** Each row of the page's member table, as `[name, in React, in Vue]`. */
function memberTable(): [string, boolean, boolean][] {
  const text = section("## What the factory returns");
  if (text === "")
    throw new Error("the page has no `## What the factory returns`");
  return [...text.matchAll(/^\| `(\w+)` \| (yes|no) \| (yes|no) \|$/gm)].map(
    (match) => [match[1], match[2] === "yes", match[3] === "yes"],
  );
}

/** Whether `name` sits in `index` as an export. */
const exported = (index: string, name: string) =>
  new RegExp(`\\b${name}\\b`).test(index);

/** A whole word, so `useGetOneLive` is no `useGetOne`, as `check:type-docs` reads it. */
function names(text: string, name: string): boolean {
  const word = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9_$])${word}(?![A-Za-z0-9_$])`).test(text);
}

/** Each `twoslash` fence on the page, as the `code` node the build gate walks. */
const twoslashFences = () =>
  [...page.matchAll(/```(\w+)([^\n]*)\n([\s\S]*?)```/g)]
    .filter(([, , meta]) => /\btwoslash\b/.test(meta))
    .map(([, lang, meta, code]) => ({
      type: "code" as const,
      lang,
      meta,
      value: code,
    }));

/** `[package, export]` for every hook and type the page documents. */
const DOCUMENTED: ["core" | "react" | "vue", string][] = [
  ["core", "LooseRecord"],
  ["core", "RecordOf"],
  ["core", "RegisteredRecord"],
  ["core", "RegisteredResources"],
  ["core", "ResourceNameArg"],
  ["core", "ResourceRecordArg"],
  ["react", "RecordContextValue"],
  ["react", "createCheloneHooks"],
  ["react", "useCreate"],
  ["react", "useCreateContext"],
  ["react", "useDelete"],
  ["react", "useEditContext"],
  ["react", "useFieldValue"],
  ["react", "useGetList"],
  ["react", "useGetListLive"],
  ["react", "useGetMany"],
  ["react", "useGetManyAggregate"],
  ["react", "useGetManyLive"],
  ["react", "useGetManyReference"],
  ["react", "useGetOne"],
  ["react", "useGetOneLive"],
  ["react", "useInfiniteGetList"],
  ["react", "useListContext"],
  ["react", "useRecordContext"],
  ["react", "useShowContext"],
  ["react", "useUpdate"],
  ["vue", "RecordValue"],
  ["vue", "createCheloneHooks"],
  ["vue", "useCreate"],
  ["vue", "useDelete"],
  ["vue", "useDeleteMany"],
  ["vue", "useFieldValue"],
  ["vue", "useGetList"],
  ["vue", "useGetListLive"],
  ["vue", "useGetMany"],
  ["vue", "useGetManyAggregate"],
  ["vue", "useGetManyLive"],
  ["vue", "useGetManyReference"],
  ["vue", "useGetOne"],
  ["vue", "useGetOneLive"],
  ["vue", "useInfiniteGetList"],
  ["vue", "useListContext"],
  ["vue", "useRecordContext"],
  ["vue", "useRecordContextRef"],
  ["vue", "useUpdate"],
  ["vue", "useUpdateMany"],
];

/** The exports one adapter has and the other lacks, so the page must say which. */
const ONE_SIDED: [string, "react", "vue"][] = [
  ["useEditContext", "react", "vue"],
  ["useShowContext", "react", "vue"],
  ["useCreateContext", "react", "vue"],
  ["useRecordContextRef", "vue", "react"],
  ["useUpdateMany", "vue", "react"],
  ["useDeleteMany", "vue", "react"],
];

it("the page has frontmatter and sits in the Type Safety sidebar", () => {
  expect(page).toMatch(/^title: "Typed hooks"$/m);
  expect(page).toMatch(/^description: ".+"$/m);
  expect(meta).toContain('slug: "typed-hooks"');
});

it("the members the page lists for each adapter are the keys createCheloneHooks returns", () => {
  const rows = memberTable();
  const listed = (side: 1 | 2) =>
    rows
      .filter((row) => row[side])
      .map((row) => row[0])
      .sort();

  expect(rows.length).toBeGreaterThan(0);
  expect(listed(1)).toEqual(factoryMembers(reactFactory).sort());
  expect(listed(2)).toEqual(factoryMembers(vueFactory).sort());

  // The two bulk mutations are Vue's alone, and the table says so.
  for (const name of ["useUpdateMany", "useDeleteMany"]) {
    const row = rows.find((each) => each[0] === name);
    expect(row, name).toBeDefined();
    expect([row?.[1], row?.[2]], name).toEqual([false, true]);
  }

  // `useInfiniteGetList` is exported by both adapters and is no member of either.
  for (const factory of [reactFactory, vueFactory]) {
    expect(factoryMembers(factory)).not.toContain("useInfiniteGetList");
  }
  expect(page).toContain("`useInfiniteGetList`");
});

it("every docs link on the page resolves", () => {
  expect(page).toMatch(/\]\(\/docs\/type-safety\//);
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("every hook the page documents is exported by its package index", () => {
  const indexes = { core: coreIndex, react: reactIndex, vue: vueIndex };
  for (const [pkg, name] of DOCUMENTED) {
    expect(page, name).toMatch(
      new RegExp(`(?<![A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`),
    );
    expect(exported(indexes[pkg], name), `@chelone/${pkg}: ${name}`).toBe(true);
  }
  for (const [name, has, lacks] of ONE_SIDED) {
    expect(exported(indexes[has], name), `${name} in @chelone/${has}`).toBe(
      true,
    );
    expect(
      exported(indexes[lacks], name),
      `${name} not in @chelone/${lacks}`,
    ).toBe(false);
  }
});

it("the page holds the five twoslash examples", () => {
  for (const snippet of [
    // A plain hook, typed with no factory.
    'const list = useGetList("posts");',
    // A name the caller cannot pin keeps the loose arm.
    "const loose = useGetList(fromContext);",
    // The same call through the bound factory.
    "const hooks = createCheloneHooks<typeof resources>();",
    'const bound = hooks.useGetList("posts");',
    // A context hook, with the record named by its caller.
    'useRecordContext<RegisteredRecord<"posts">>()',
    // A name the registry lacks.
    'hooks.useGetList("nope");',
    // A field the record has no number in.
    'hooks.useUpdate("posts")',
  ]) {
    expect(page, snippet).toContain(snippet);
  }
  expect(page.match(/^\s*\/\/\s*\^\?/gm)?.length).toBeGreaterThanOrEqual(5);
  expect(
    page.match(/^\s*\/\/ @errors: \d+(?: \d+)*$/gm)?.length,
  ).toBeGreaterThanOrEqual(2);
  expect(page).toContain("```vue");
});

it("every twoslash fence on the page type-checks", () => {
  const fences = twoslashFences();
  expect(fences.length).toBeGreaterThanOrEqual(5);
  expect(() =>
    remarkTwoslash()(
      { type: "root", children: fences },
      { path: pageUrl.pathname },
    ),
  ).not.toThrow();
});

it("the page says the context hooks read no registry, and marks the read-back", () => {
  const context = section("## The record context hooks");
  expect(context.length).toBeGreaterThan(0);
  expect(context).toContain("Register");
  expect(context).toContain("type-escape");
  expect(context).toContain("LooseRecord");
});

it("the page holds no em dash and no bold", () => {
  expect(page).not.toMatch(/[—–]/);
  expect(page).not.toContain("**");
  expect(page).not.toMatch(/(^|[^\w])__\w/);
});
