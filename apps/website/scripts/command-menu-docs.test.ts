// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/docs/content/ui-layout/command-menu/index.mdx");
const reactIndex = read("../../../packages/react/src/index.ts");
const vueIndex = read("../../../packages/vue/src/index.ts");
const vueComponentsIndex = read(
  "../../../packages/vue/src/components/index.ts",
);

it("the page names the props file, the registry item and its links resolve", () => {
  expect(page).toMatch(/^title: "CommandMenu"$/m);
  expect(page).toMatch(/^registry: "command-menu"$/m);
  expect(page).toContain('<PropsTable name="CommandMenu" />');
  expect(
    existsSync(
      new URL("../src/docs/content/props/CommandMenu.json", import.meta.url),
    ),
  ).toBe(true);
  expect(unresolvedDocLinks(page)).toEqual([]);
});

it("the names the page uses are exported by both adapters", () => {
  for (const name of ["CommandMenu", "useCommandMenu", "useRegisterCommand"]) {
    expect(page, `${name} on the page`).toContain(`\`${name}\``);
    expect(reactIndex, `${name} in React`).toMatch(new RegExp(`\\b${name}\\b`));
    expect(`${vueIndex}\n${vueComponentsIndex}`, `${name} in Vue`).toMatch(
      new RegExp(`\\b${name}\\b`),
    );
  }
});

it("the page documents the hotkey bindings and the Vue differences", () => {
  for (const text of [
    '"mod+k"',
    '"mod+shift+p"',
    '"alt+/"',
    "hotkey={false}",
    "{ q: query }",
    "searchFields",
    "perResourceLimit",
    "chelone.command_menu.title",
    "<kbd>",
  ]) {
    expect(page, text).toContain(text);
  }
});
