// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/docs/content/vue/admin-slots.mdx");
const adminSource = read("../../../packages/vue/src/admin/admin.vue");

// The keys of the `defineSlots<{ ... }>()` type in admin.vue.
function declaredSlots(): string[] {
  const block = adminSource.match(/defineSlots<\{([\s\S]*?)\n\}>\(\)/);
  if (!block) throw new Error("admin.vue has no defineSlots block");
  return [...block[1].matchAll(/^ {2}(\w+)\??:/gm)].map((match) => match[1]);
}

it("the admin slots page names every slot Admin declares", () => {
  const slots = declaredSlots();

  expect(slots).toContain("catchAll");
  for (const slot of slots) {
    expect(page, `#${slot}`).toMatch(new RegExp(`#${slot}(?![A-Za-z0-9-])`));
  }
});

it("the admin slots page shows a layout slot that renders router-view", () => {
  expect(page).toMatch(
    /<template #layout>[\s\S]*?<router-view \/>[\s\S]*?<\/template>/,
  );
});

it("the admin slots page gives the error slot's error, info and reset", () => {
  expect(page).toMatch(/#error="\{ error, info, reset \}"/);
});

it("the admin slots page shows customRoutes with noLayout", () => {
  expect(page).toContain("customRoutes");
  expect(page).toMatch(/noLayout: true/);
});

it("every docs link on the admin slots page resolves to a page", () => {
  expect(unresolvedDocLinks(page)).toEqual([]);
});
