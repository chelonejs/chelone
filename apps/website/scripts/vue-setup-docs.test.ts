// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import rootMeta from "../src/docs/content/_meta";
import vueMeta from "../src/docs/content/vue/_meta";
import { GUIDE_SECTIONS, SECTION_META } from "../src/docs/section-meta";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const setupPage = read("../src/docs/content/vue/setup.mdx");
const installPage = read(
  "../src/docs/content/getting-started/install/index.mdx",
);
const installVueSection = installPage.split("## Install for Vue")[1];

it("the Vue section sits after Getting Started and React and lists setup, admin-slots, forms and differences", () => {
  expect(rootMeta.slice(0, 4)).toEqual([
    { dir: "getting-started", title: "Getting Started" },
    { dir: "type-safety", title: "Type Safety" },
    { dir: "react", title: "React" },
    { dir: "vue", title: "Vue" },
  ]);
  expect(vueMeta).toEqual([
    { slug: "setup", title: "Setup" },
    { slug: "admin-slots", title: "Admin Slots" },
    { slug: "forms", title: "Forms" },
    { slug: "differences", title: "Differences from React" },
  ]);
});

it("the Vue section is a guide section with an icon and a blurb", () => {
  expect(GUIDE_SECTIONS.has("vue")).toBe(true);
  expect(SECTION_META.vue.icon).toBeDefined();
  expect(SECTION_META.vue.blurb.length).toBeGreaterThan(0);
});

it("the setup page wires a router with no routes and leaves deep links to Admin", () => {
  expect(setupPage).toContain("routes: []");
  expect(setupPage).not.toContain("router.isReady()");
});

it("the setup page names registry as the schema registry and resources as the view definitions", () => {
  expect(setupPage).toMatch(/`registry`[^\n]*`defineResources`/);
  expect(setupPage).toMatch(/`resources`[^\n]*view definitions/);
});

it("the install page's Vue section has no re-resolve workaround and links to the setup page", () => {
  expect(installVueSection).toContain("routes: []");
  expect(installVueSection).not.toContain("router.isReady()");
  expect(installVueSection).not.toContain('redirect: "/posts"');
  expect(installVueSection).not.toContain("Vue Query plugin");
  expect(installVueSection).toContain("](/docs/vue/setup)");
});

it("every docs link on the setup and install pages resolves to a page", () => {
  expect(unresolvedDocLinks(setupPage)).toEqual([]);
  expect(unresolvedDocLinks(installPage)).toEqual([]);
});

it("unresolvedDocLinks reports a missing page and accepts a page, a section and an anchor", () => {
  const links = [
    "[a](/docs/vue/setup)",
    "[b](/docs/getting-started/install#install-for-vue)",
    "[c](/docs/getting-started)",
    "[d](/docs/vue/not-written-yet)",
    "[e](/docs/vue/not-written-yet#heading)",
    "[f](https://example.com/docs/other)",
  ].join("\n");

  expect(unresolvedDocLinks(links)).toEqual([
    "/docs/vue/not-written-yet",
    "/docs/vue/not-written-yet",
  ]);
});

it("unresolvedDocLinks rejects a folder that holds no page", () => {
  expect(
    unresolvedDocLinks("[g](/docs/react/quick-start-guide/demos)"),
  ).toEqual(["/docs/react/quick-start-guide/demos"]);
});
