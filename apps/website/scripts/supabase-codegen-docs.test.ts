// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const supabasePage = read("../src/docs/content/app-config/supabase.mdx");
const guessersPage = read("../src/docs/content/app-config/guessers.mdx");
const cli = read("../../../packages/supabase/src/codegen/cli.ts");

// The flags `runGen` accepts are the keys of its `parseArgs` options.
const optionsBlock = cli.match(/const options = \{([\s\S]*?)\n\} as const;/);
const acceptedFlags = [
  ...(optionsBlock?.[1] ?? "").matchAll(/^ {2}"?([a-z-]+)"?: \{/gm),
].map((match) => `--${match[1]}`);

const section = supabasePage.slice(
  supabasePage.indexOf("## Generating resources"),
);
const generating = section.slice(0, section.indexOf("\n## ", 3));

it("the flags the Supabase page uses are the ones chelone-supabase gen accepts", () => {
  expect(acceptedFlags).toEqual(
    expect.arrayContaining(["--input", "--out-dir", "--schema", "--scaffold"]),
  );
  expect(generating).toContain("chelone-supabase gen");
  const genLines = generating
    .split("\n")
    .filter((line) => line.includes("chelone-supabase gen"));
  const used = new Set(genLines.join("\n").match(/(?<=\s)--[a-z-]+/g));
  expect(used.size).toBeGreaterThan(0);
  for (const flag of used) {
    expect(acceptedFlags, `${flag} on the page`).toContain(flag);
  }
  for (const flag of ["--input", "--out-dir", "--scaffold"]) {
    expect(used, `${flag} on the page`).toContain(flag);
  }
});

it("every docs link on the Supabase and guessers pages resolves", () => {
  expect(unresolvedDocLinks(supabasePage)).toEqual([]);
  expect(unresolvedDocLinks(guessersPage)).toEqual([]);
});

it("the Supabase page no longer lists guessers as not supported", () => {
  const unsupported = supabasePage.slice(
    supabasePage.indexOf("## What is not supported"),
  );
  expect(unsupported).not.toMatch(/Guessers/);
});

it("the guessers page links to the generating section", () => {
  expect(guessersPage).toContain(
    "](/docs/app-config/supabase#generating-resources)",
  );
});

it("the page links to anchors that exist exactly once", () => {
  const headings = [...supabasePage.matchAll(/^#{2,3} (.+)$/gm)].map((match) =>
    match[1]
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/ /g, "-"),
  );
  for (const [, anchor] of generating.matchAll(/\]\(#([a-z0-9-]+)\)/g)) {
    expect(
      headings.filter((heading) => heading === anchor),
      `#${anchor}`,
    ).toHaveLength(1);
  }
});

it("the commands run the bin through the package manager", () => {
  for (const line of generating.split("\n")) {
    if (line.includes("chelone-supabase gen --")) {
      expect(line).toMatch(/^pnpm exec chelone-supabase gen /);
    }
  }
});
