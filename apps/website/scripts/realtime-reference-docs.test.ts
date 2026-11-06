// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import sections from "../src/docs/content/_meta";
import realtimeMeta from "../src/docs/content/realtime/_meta";
import { SECTION_META } from "../src/docs/section-meta";
import { unresolvedDocLinks } from "./docs-links";

const components = [
  { slug: "list-live", component: "ListLive" },
  { slug: "edit-live", component: "EditLive" },
  { slug: "show-live", component: "ShowLive" },
  { slug: "menu-live", component: "MenuLive" },
  { slug: "presence-bar", component: "PresenceBar" },
  { slug: "comments-thread", component: "CommentsThread" },
  { slug: "lock-on-mount", component: "LockOnMount" },
  { slug: "lock-status", component: "LockStatus" },
];

it("Realtime has an icon and blurb for section navigation and cards", () => {
  expect(SECTION_META.realtime?.icon).toBeDefined();
  expect(SECTION_META.realtime?.blurb).toMatch(/\S/);
});

it("Realtime follows UI & Layout and lists every realtime component", () => {
  const directories = sections.map((section) => section.dir);
  const uiLayoutIndex = directories.indexOf("ui-layout");
  expect(directories.slice(uiLayoutIndex, uiLayoutIndex + 2)).toEqual([
    "ui-layout",
    "realtime",
  ]);
  const slugs = realtimeMeta.flatMap((entry) => entry.slugs);
  expect(slugs).toEqual(components.map(({ slug }) => slug));
});

it.each(components)(
  "$component has a reference page with its props and a working link to the realtime guide",
  ({ slug, component }) => {
    const page = readFileSync(
      new URL(
        `../src/docs/content/realtime/${slug}/index.mdx`,
        import.meta.url,
      ),
      "utf8",
    );

    expect(page).toContain(`title: "${component}"`);
    expect(page).toContain(`<PropsTable name="${component}" />`);
    expect(page).toContain("(/docs/app-config/realtime)");
    expect(unresolvedDocLinks(page)).toEqual([]);
  },
);
