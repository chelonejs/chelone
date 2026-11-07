// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/docs/content/getting-started/mcp/index.mdx");
const meta = read("../src/docs/content/getting-started/_meta.ts");

it("the MCP page gives clients the Chelone registry and example prompts", () => {
  expect(page).toMatch(/^title: "MCP Server"$/m);
  expect(page).toMatch(/^description: ".+"$/m);
  // The React install and shadcn steps live on the React section's setup page.
  expect(page).toContain("](/docs/react/setup)");
  for (const client of ["claude", "cursor", "vscode"]) {
    expect(page).toContain(`npx shadcn@latest mcp init --client ${client}`);
  }
  expect(page).toContain("components.json");
  expect(page).toMatch(
    /"registries":\s*\{\s*"@chelone": "https:\/\/chelone\.dev\/r\/\{name\}\.json"/,
  );
  for (const prompt of [
    "show me all available components in the chelone registry",
    "init this project using the chelone registry",
    "create a new admin using the chelone registry and declare 3 resources in it: posts, comments and users",
  ]) {
    expect(page).toContain(prompt);
  }
});

it("the MCP page scopes setup to React and preserves Vue registry configuration", () => {
  const flat = page.replace(/\s+/g, " ");
  expect(flat).toContain("This page covers React projects.");
  expect(flat).toContain(
    "For Vue, follow the [Vue installation guide](/docs/getting-started/install#install-for-vue) and keep its registry URL.",
  );
  expect(flat).toContain(
    "For React projects, add `@chelone` under `registries`",
  );
});

it("getting started lists MCP Server immediately after Installation", () => {
  expect(meta).toMatch(
    /slug: "install", title: "Installation" \},\s*\{ slug: "mcp", title: "MCP Server" \}/,
  );
});

it("the MCP page has no unresolved doc links", () => {
  expect(unresolvedDocLinks(page)).toEqual([]);
});
