// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read(
  "../src/docs/content/type-safety/translations-and-permissions.mdx",
);
const translationPage = read("../src/docs/content/app-config/translation.mdx");
const securityPage = read("../src/docs/content/app-config/security.mdx");
const coreIndex = read("../../../packages/core/src/index.ts");

const PAGE_LINK = "/docs/type-safety/translations-and-permissions";

/** Every name `@chelone/core`'s entry exports, from its `export` statements. */
function coreExports(source: string): Set<string> {
  const names = new Set<string>();
  for (const match of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const entry of match[1].split(",")) {
      const name = entry
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

/** Whether `text` names `name` as a whole word, `RegisteredMessages` being no `Message`. */
function names(text: string, name: string): boolean {
  const word = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9_$])${word}(?![A-Za-z0-9_$])`).test(text);
}

/** The translation and permissions types core exports and this page owns. */
const CORE_TYPES = [
  "AnyCheloneI18n",
  "AuthProvider",
  "ExtractParams",
  "HasLiteralMessages",
  "I18nProvider",
  "LocaleMessages",
  "MessageCatalog",
  "MessageKey",
  "MessageValue",
  "PluralMessage",
  "RegisteredLiteralMessages",
  "RegisteredMessages",
  "RegisteredPermissions",
  "RegisteredTranslate",
  "TranslateFor",
  "TranslateParamValues",
  "TranslateParams",
  "asRegisteredTranslate",
  "createI18n",
  "defineLocale",
  "defineMessages",
];

/** The adapter and add-on names the page leans on, none of them core exports. */
const ADAPTER_NAMES = [
  "createI18nextProvider",
  "useCanAccess",
  "usePermissions",
  "useTranslate",
];

const SECTIONS = [
  "Typed keys and params",
  "Registering the catalog",
  "Literal text",
  "Checking a locale",
  "Any engine",
  "Permissions",
  "Vue",
];

/** rehype-slug's heading id: lowercased, punctuation dropped, spaces to hyphens. */
function headingIds(mdx: string): Set<string> {
  const ids = new Set<string>();
  for (const match of mdx.matchAll(/^#{2,3} (.+)$/gm)) {
    const id = match[1]
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .trim()
      .replace(/ +/g, "-");
    ids.add(id);
  }
  return ids;
}

it("the page has its frontmatter and its sections in order", () => {
  expect(page.startsWith('---\ntitle: "Translations and permissions"\n')).toBe(
    true,
  );
  expect(page).toMatch(/^description: ".+"$/m);

  const headings = [...page.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  const owned = SECTIONS.filter((section) => headings.includes(section));
  expect(owned).toEqual(SECTIONS);
  expect(
    headings
      .slice(headings.indexOf("Typed keys and params"))
      .slice(0, SECTIONS.length),
  ).toEqual(SECTIONS);
});

it("the page documents every translation and permissions type core exports", () => {
  const exported = coreExports(coreIndex);
  for (const name of CORE_TYPES) {
    const exportedName = exported.has(name);
    expect(
      exportedName,
      `${name} is not exported from packages/core/src/index.ts`,
    ).toBe(true);
    expect(names(page, name), `the page never names ${name}`).toBe(true);
  }
  for (const name of ADAPTER_NAMES) {
    expect(names(page, name), `the page never names ${name}`).toBe(true);
  }
});

it("every docs link on the translations page resolves", () => {
  expect(page).toContain("](/docs/");
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("the page holds no em dash and no bold", () => {
  expect(page).not.toMatch(/[—–]/);
  expect(page).not.toMatch(/\*\*[^*\n]+\*\*/);
});

it("translation.mdx and security.mdx link to the page and no longer hold the Register snippets", () => {
  for (const [name, text] of [
    ["translation", translationPage],
    ["security", securityPage],
  ]) {
    expect(text, `${name}.mdx`).toContain(`](${PAGE_LINK}`);
    expect(text, `${name}.mdx`).toContain(
      "](/docs/type-safety/registering-your-app",
    );
    expect(
      text.match(/declare module "@chelone\/core"/g),
      `${name}.mdx`,
    ).toBeNull();
    expect(text.match(/interface Register \{/g), `${name}.mdx`).toBeNull();
    for (const snippet of [
      "RegisteredTranslate",
      "RegisteredLiteralMessages",
      "TranslateFor",
      "LocaleMessages",
      "asRegisteredTranslate",
    ]) {
      expect(names(text, snippet), `${name}.mdx still names ${snippet}`).toBe(
        false,
      );
    }
  }
});

it("no page this pull request touches repeats a section heading", () => {
  for (const [name, text] of [
    ["translations-and-permissions", page],
    ["translation", translationPage],
    ["security", securityPage],
  ]) {
    const headings = [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    const repeated = headings.filter(
      (heading, index) => headings.indexOf(heading) !== index,
    );
    expect(repeated, `${name}.mdx repeats a ## heading`).toEqual([]);
  }
});

it("no link in translation.mdx or security.mdx points at a heading that is gone", () => {
  for (const [name, text] of [
    ["translation", translationPage],
    ["security", securityPage],
  ]) {
    const headings = headingIds(text);
    for (const match of text.matchAll(/\]\((#[^)\s]*)\)/g)) {
      const id = match[1].slice(1);
      expect(headings.has(id), `${name}.mdx links ${match[1]}`).toBe(true);
    }
  }
});
