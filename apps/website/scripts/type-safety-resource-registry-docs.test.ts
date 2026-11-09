// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read(
  "../src/docs/content/type-safety/resource-registry-and-codegen.mdx",
);
const coreIndex = read("../../../packages/core/src/index.ts");

// The prose and fences outside frontmatter.
const body = page.replace(/^---\n[\s\S]*?\n---\n/, "");

const fences = [...body.matchAll(/^```(\S*)([^\n]*)\n([\s\S]*?)^```/gm)].map(
  ([, lang, meta, code]) => ({ lang, meta, code }),
);

/** Names core's index exports, from its `export { … }` and `export type { … }` blocks. */
const coreExports = new Set(
  [...coreIndex.matchAll(/^export (?:type )?\{([^}]*)\}/gm)].flatMap(
    ([, names]) =>
      names
        .split(",")
        .map((name) =>
          name
            .trim()
            .replace(/^type /, "")
            .replace(/ as .*$/, ""),
        )
        .filter(Boolean),
  ),
);

it("the page links to the Supabase generating section and holds no chelone-supabase gen command", () => {
  expect(page).toContain("](/docs/app-config/supabase#generating-resources)");
  expect(page).not.toContain("chelone-supabase gen");
});

it("every docs link on the page resolves", () => {
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("every export the page documents is exported by packages/core/src/index.ts", () => {
  const documented = [
    "defineResources",
    "ResourceConfig",
    "ResourceMap",
    "RecordOf",
    "RecordResources",
  ];
  for (const name of documented) {
    expect(body, `${name} on the page`).toMatch(
      new RegExp(`(?<![\\w$])${name}(?![\\w$])`),
    );
  }
  const imported = fences
    .filter(({ code }) => /from "@chelone\/core"/.test(code))
    .flatMap(({ code }) => [
      ...code.matchAll(/import (?:type )?\{([^}]*)\} from "@chelone\/core"/g),
    ])
    .flatMap(([, names]) =>
      names
        .split(",")
        .map((name) => name.trim().replace(/^type /, ""))
        .filter(Boolean),
    );
  for (const name of [...documented, ...imported]) {
    expect(coreExports, `${name} in core's index`).toContain(name);
  }
});

it("the page holds no em dash and no bold", () => {
  expect(page).not.toMatch(/[—–]/);
  expect(page).not.toMatch(/\*\*[^*\n]+\*\*/);
  expect(page).not.toMatch(/__[^_\n]+__/);
});

it("the page holds the three inferred-type queries and the two rejected references", () => {
  const twoslash = fences.filter(({ meta }) => /\btwoslash\b/.test(meta));
  const queries = twoslash.flatMap(({ code }) =>
    code.split("\n").filter((line) => /^\s*\/\/\s*\^\?/.test(line)),
  );
  expect(queries.length).toBeGreaterThanOrEqual(3);
  const queried = twoslash.map(({ code }) => code).join("\n");
  expect(queried).toMatch(/RecordOf<typeof resources, "posts">/);
  expect(queried).toMatch(/RecordOf<RecordResources<Post>, string>/);
  expect(queried).toMatch(/RecordOf<typeof resources, "comments">/);
  const errored = twoslash.filter(({ code }) => /\/\/ @errors:/.test(code));
  expect(errored.some(({ code }) => code.includes("authorid"))).toBe(true);
  expect(errored.some(({ code }) => code.includes('"writers"'))).toBe(true);
});
