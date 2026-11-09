// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/docs/content/type-safety/registering-your-app.mdx");
const translationPage = read("../src/docs/content/app-config/translation.mdx");
const securityPage = read("../src/docs/content/app-config/security.mdx");
const supabasePage = read("../src/docs/content/app-config/supabase.mdx");
const registerSource = read("../../../packages/core/src/resource/register.ts");

const PAGE_LINK = "/docs/type-safety/registering-your-app";
const AUGMENTATION = /declare module "@chelone\/core"/g;

it("translation and security hold no declare module block, and supabase holds only the generated listing", () => {
  expect(translationPage.match(AUGMENTATION)).toBeNull();
  expect(securityPage.match(AUGMENTATION)).toBeNull();

  const generating = supabasePage.slice(
    supabasePage.indexOf("## Generating resources"),
  );
  const generatingSection = generating.slice(0, generating.indexOf("\n## ", 3));
  expect(supabasePage.match(AUGMENTATION)).toHaveLength(1);
  expect(generatingSection.match(AUGMENTATION)).toHaveLength(1);
});

it("the three app-config pages link to the registering page", () => {
  for (const [name, text] of [
    ["translation", translationPage],
    ["security", securityPage],
    ["supabase", supabasePage],
  ]) {
    expect(text, `${name}.mdx`).toContain(`](${PAGE_LINK}`);
  }
});

it("every Register key the page names is a key register.ts reads", () => {
  const read = [
    ...registerSource.matchAll(/Register extends \{\s*(\w+)\s*:/g),
  ].map((match) => match[1]);
  expect(read).toEqual(
    expect.arrayContaining([
      "resources",
      "permissions",
      "messages",
      "literalMessages",
    ]),
  );

  const named = [
    ...page.matchAll(/interface Register \{([\s\S]*?)\n\s*\}/g),
  ].flatMap((block) =>
    [...block[1].matchAll(/^\s*(\w+)\??\s*:/gm)].map((match) => match[1]),
  );
  expect(named.length).toBeGreaterThan(0);
  for (const key of named) {
    expect(read, `${key} on the page`).toContain(key);
  }
});

it("every docs link on the page resolves", () => {
  expect(page).toContain("](/docs/");
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("the page holds no em dash and no bold", () => {
  expect(page).not.toMatch(/[—–]/);
  expect(page).not.toMatch(/\*\*[^*\n]+\*\*/);
});
