// @vitest-environment node
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Element, ElementContent, Root } from "hast";
import { codeToHast } from "shiki";
import { expect, it } from "vitest";
import { SHIKI_THEME } from "../src/lib/shiki-theme";
import {
  rehypeTwoslashAssert,
  remarkTwoslash,
  twoslashTransformer,
} from "./twoslash.mjs";

/**
 * The transformer as `vite.config.ts` hands it to rehype-pretty-code: a fence
 * runs twoslash only when its meta says `twoslash`.
 */
function highlight(code: string, lang: string, meta?: string) {
  return codeToHast(code, {
    lang,
    themes: { ...SHIKI_THEME },
    defaultColor: false,
    meta: { __raw: meta },
    transformers: [twoslashTransformer],
  });
}

/** The page the two plugins name in their error, as the build hands it over. */
const pageFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/docs/content/type-safety/overview.mdx",
);
const page = "apps/website/src/docs/content/type-safety/overview.mdx";

/**
 * `highlight` stands for rehype-pretty-code, which swallows what the transformer
 * throws. `assertPage` is the plugin `vite.config.ts` runs after it, which
 * raises what was swallowed.
 */
function assertPage(): void {
  rehypeTwoslashAssert()({ type: "root", children: [] }, { path: pageFile });
}

/**
 * The classes on an element. hast's own name is `className`; the twoslash
 * renderer writes `class`, so both are read.
 */
function classesOf(element: Element): string[] {
  const { className } = element.properties;
  if (className) return className;
  if (
    "class" in element.properties &&
    typeof element.properties.class === "string"
  ) {
    return element.properties.class.split(" ");
  }
  return [];
}

function hasClass(element: Element, className: string): boolean {
  return classesOf(element).includes(className);
}

function textOf(node: Element | ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return "";
  return node.children.map(textOf).join("");
}

/** Every element under `tree` carrying `className`, as the renderer marks them. */
function collect(tree: Root, className: string): Element[] {
  const found: Element[] = [];
  const walk = (node: ElementContent) => {
    if (node.type !== "element") return;
    if (hasClass(node, className)) found.push(node);
    for (const child of node.children) walk(child);
  };
  for (const child of tree.children) walk(child);
  return found;
}

/** A registered app, and a `source` the registry has no record of. */
const registeredApp = [
  'import { defineResources } from "@chelone/core";',
  'import { createResourceComponents } from "@chelone/react";',
  'import { z } from "zod";',
  "",
  "const resources = defineResources({",
  "  posts: { schema: z.object({ id: z.number(), title: z.string() }) },",
  "});",
  "",
  'declare module "@chelone/core" {',
  "  interface Register {",
  "    resources: typeof resources;",
  "  }",
  "}",
  "",
  'const { TextField } = createResourceComponents("posts");',
  "",
].join("\n");

const badSource = 'const field = <TextField source="name" />;';

const registeredSnippet = `${registeredApp}// @errors: 2322\n${badSource}\n`;

/**
 * CPU the process spent since `started`, in ms.
 *
 * The clock bills a fence for every moment it was not running, so it measures
 * the machine and not the work: CI runs every package's suite at once, and a
 * fence that costs 0.2s of CPU there took 2.7s on the clock. `process.cpuUsage`
 * counts only the CPU the process actually spent, so waiting for a core is not
 * charged to the fence.
 */
function cpuMsOf(started: NodeJS.CpuUsage): number {
  const { user, system } = process.cpuUsage(started);
  return (user + system) / 1000;
}

/**
 * What a snippet costs, against the 2 second budget the issue assumes.
 *
 * The process's first snippet pays for more than itself: the language service
 * boot, TypeScript's lib files, shiki's grammars, and the first bind of the
 * `@chelone/react` source graph. That is one-time per build, so it gets a
 * ceiling rather than the 2 second bound.
 *
 * The bound belongs on a fence's own cost, which is what a build pays once per
 * fence, and on the cached run, which proves the gate and the render share one
 * type-check. Both are read in CPU for the same reason the boot gets a ceiling:
 * the number that moves with the machine is the clock, and the number that says
 * something about a fence is the CPU it burned.
 */
it("type-checks a snippet once and reuses that run", async () => {
  const timings: string[] = [];
  const timed = async (label: string, code: string, lang: string) => {
    const started = process.cpuUsage();
    const clock = performance.now();
    await highlight(code, lang, "twoslash");
    const cpu = cpuMsOf(started);
    timings.push(
      `${label} ${lang}: cpu ${cpu.toFixed(0)}ms, clock ${(performance.now() - clock).toFixed(0)}ms`,
    );
    return cpu;
  };

  const first = await timed("first fence", registeredSnippet, "tsx");
  const next = await timed(
    "next fence",
    `${registeredApp}const field = <TextField source="title" />;\n`,
    "tsx",
  );
  const cached = await timed("cached fence", registeredSnippet, "tsx");

  expect(next).toBeLessThan(2_000);
  expect(cached).toBeLessThan(next / 2);
  expect(first).toBeLessThan(10_000);

  process.stdout.write(`twoslash snippet cost\n${timings.join("\n")}\n`);
});

it("renders the error a `// @errors` line names", async () => {
  const tree = await highlight(registeredSnippet, "tsx", "twoslash");

  const lines = collect(tree, "twoslash-error-line");
  expect(lines).toHaveLength(1);
  expect(textOf(lines[0])).toContain(`"name"`);
  expect(textOf(lines[0])).toContain("not assignable");
  expect(collect(tree, "twoslash-error").length).toBeGreaterThan(0);
});

it("fails the build when a snippet raises an error no `// @errors` line names", async () => {
  await highlight(`${registeredApp}${badSource}\n`, "tsx", "twoslash");
  expect(assertPage).toThrow(/not included in an error tag/);
});

it("fails the build when a `// @errors` line names an error the snippet never raises", async () => {
  await highlight(
    `${registeredApp}// @errors: 2322\nconst field = <TextField source="title" />;\n`,
    "tsx",
    "twoslash",
  );
  expect(assertPage).toThrow(/@errors: 2322 names TS2322/);
});

it("names the page in the gate's own error", () => {
  const fence = {
    type: "code",
    lang: "tsx",
    meta: "twoslash",
    value: `${registeredApp}${badSource}\n`,
  };

  expect(() =>
    remarkTwoslash()({ type: "root", children: [fence] }, { path: pageFile }),
  ).toThrow(`twoslash failed in ${page} (tsx fence)`);
});

it("fails the build for a `// @include:` fence the gate cannot run", async () => {
  await highlight(
    "const base = { id: 1 };\n",
    "ts",
    "twoslash include drifted",
  );
  await highlight(
    "// @include: drifted\nconst wrong: string = base;\n",
    "ts",
    "twoslash",
  );

  expect(assertPage).toThrow(/not included in an error tag/);
});

it("leaves a clean `// @include:` pair alone", async () => {
  await highlight("const base = { id: 1 };\n", "ts", "twoslash include clean");
  await highlight(
    "// @include: clean\nconst ok: number = base.id;\n",
    "ts",
    "twoslash",
  );

  expect(assertPage).not.toThrow();
});

it("renders the inferred type a `// ^?` asks for", async () => {
  const tree = await highlight(
    [
      'import { defineResources } from "@chelone/core";',
      'import { z } from "zod";',
      "",
      "const posts = defineResources({ posts: { schema: z.object({ title: z.string() }) } });",
      "//    ^?",
      "",
    ].join("\n"),
    "ts",
    "twoslash",
  );

  const queries = collect(tree, "twoslash-query-persisted");
  expect(queries.length).toBe(1);
  expect(textOf(queries[0])).toContain("posts");
});

it("leaves a fence with no `twoslash` in its meta as plain highlighted code", async () => {
  const tree = await highlight(`${registeredApp}${badSource}\n`, "tsx");

  expect(collect(tree, "twoslash")).toEqual([]);
  expect(collect(tree, "twoslash-error-line")).toEqual([]);
  expect(textOf(tree.children[0])).toContain('source="name"');
});

it("renders the error a Vue template raises against a typed prop", async () => {
  const tree = await highlight(
    [
      '<script setup lang="ts">',
      'import { defineResources } from "@chelone/core";',
      'import { createResourceComponents } from "@chelone/vue";',
      'import { z } from "zod";',
      "",
      "const resources = defineResources({",
      "  posts: { schema: z.object({ id: z.number(), title: z.string() }) },",
      "});",
      "",
      'declare module "@chelone/core" {',
      "  interface Register {",
      "    resources: typeof resources;",
      "  }",
      "}",
      "",
      'const { TextField } = createResourceComponents("posts");',
      "// @errors: 2322",
      "</script>",
      "",
      "<template>",
      '  <TextField source="name" />',
      "</template>",
      "",
    ].join("\n"),
    "vue",
    "twoslash",
  );

  const lines = collect(tree, "twoslash-error-line");
  expect(lines).toHaveLength(1);
  expect(textOf(lines[0])).toContain("name");
  expect(textOf(lines[0])).toContain("not assignable");
});
