// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import rootMeta from "../src/docs/content/_meta";
import gettingStartedMeta from "../src/docs/content/getting-started/_meta";
import reactMeta from "../src/docs/content/react/_meta";
import { GUIDE_SECTIONS, SECTION_META } from "../src/docs/section-meta";
import { unresolvedDocLinks } from "./docs-links";

const websiteDir = fileURLToPath(new URL("../", import.meta.url));
const read = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const installPage = read(
  "../src/docs/content/getting-started/install/index.mdx",
);
const setupPage = read("../src/docs/content/react/setup.mdx");

/** Every source file under `dir`, so a stale path can be found by name. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.(mdx?|tsx?|mjs)$/.test(entry.name) ? [child] : [];
  });
}

it("the React section sits between Getting Started and Vue with setup and the quick start", () => {
  expect(rootMeta.slice(0, 4)).toEqual([
    { dir: "getting-started", title: "Getting Started" },
    { dir: "type-safety", title: "Type Safety" },
    { dir: "react", title: "React" },
    { dir: "vue", title: "Vue" },
  ]);
  expect(reactMeta).toEqual([
    { slug: "setup", title: "Setup" },
    { dir: "quick-start-guide", title: "Quick Start" },
  ]);
});

it("the React section is a guide section with an icon and a blurb", () => {
  expect(GUIDE_SECTIONS.has("react")).toBe(true);
  expect(SECTION_META.react.icon).toBeDefined();
  expect(SECTION_META.react.blurb.length).toBeGreaterThan(0);
});

it("Getting Started keeps install, mcp, guides-and-concepts, migrating and changelog", () => {
  expect(gettingStartedMeta).toEqual([
    { slug: "install", title: "Installation" },
    { slug: "mcp", title: "MCP Server" },
    { slug: "guides-and-concepts", title: "Guides and Concepts" },
    { slug: "migrating-from-react-admin", title: "Migrating from react-admin" },
    { slug: "changelog", title: "Changelog" },
  ]);
});

it("the quick start guide and its demos live under the React section", () => {
  const underReact = "src/docs/content/react/quick-start-guide";
  const underGettingStarted =
    "src/docs/content/getting-started/quick-start-guide";
  for (const page of [
    "setup",
    "building-the-list",
    "detail-editing",
    "polish",
    "auth-production",
  ]) {
    expect(existsSync(path.join(websiteDir, underReact, `${page}.mdx`))).toBe(
      true,
    );
  }
  expect(
    existsSync(path.join(websiteDir, underReact, "demos/post-list.tsx")),
  ).toBe(true);
  expect(existsSync(path.join(websiteDir, underGettingStarted))).toBe(false);
});

it("the React setup page holds the React install steps the install page dropped", () => {
  expect(setupPage).toContain("npm install @chelone/react zod");
  expect(setupPage).toContain("npx shadcn@latest init");
  expect(setupPage).toContain("npx shadcn@latest add @chelone/admin");
  expect(setupPage).toContain("## Add the UI components");
  expect(setupPage).toContain("](/docs/react/quick-start-guide/setup)");
  expect(unresolvedDocLinks(setupPage)).toEqual([]);
});

it("the install page keeps the shared part and points at the React setup page", () => {
  expect(installPage).not.toContain("npm install @chelone/react zod");
  expect(installPage).not.toContain("npx shadcn@latest init");
  expect(installPage).toContain("](/docs/react/setup)");
  expect(installPage).toContain("## Install for Vue");
  expect(unresolvedDocLinks(installPage)).toEqual([]);
});

it("the install page names where each adapter's install steps live", () => {
  const shared = installPage.split("## Install for Vue")[0];
  expect(shared).toContain("[React setup](/docs/react/setup)");
  expect(shared).toContain("[Install for Vue](#install-for-vue)");
  expect(shared).toContain("[Vue setup](/docs/vue/setup)");
});

it("the shared install page labels each registry URL with its adapter", () => {
  const shared = installPage.split("## Install for Vue")[0];
  expect(shared).not.toContain('title="components.json"');
  const lines = shared.split("\n");
  expect(
    lines.some(
      (line) => line.includes("chelone.dev/r/{name}") && line.includes("React"),
    ),
  ).toBe(true);
  expect(
    lines.some(
      (line) =>
        line.includes("chelone.dev/r/vue/{name}") && line.includes("Vue"),
    ),
  ).toBe(true);
});

it("no source file links to the old getting-started quick start path", () => {
  const stale = sourceFiles(path.join(websiteDir, "src"))
    .filter((file) =>
      readFileSync(file, "utf8").includes("getting-started/quick-start-guide"),
    )
    .map((file) => path.relative(websiteDir, file));
  expect(stale).toEqual([]);
});
