import assert from "node:assert/strict";
import { test } from "node:test";
import { installFor } from "./registry.ts";

test("installFor returns shadcn commands for a real registry component", () => {
  // 'data-table' is a known registry item name (passed via frontmatter).
  const cmds = installFor("data-table");
  assert.ok(cmds, "expected install commands");
  assert.equal(cmds.pnpm, "pnpm dlx shadcn@latest add @chelone/data-table");
});

test("installFor returns null for a non-registry name / undefined", () => {
  assert.equal(installFor("install"), null);
  assert.equal(installFor(undefined), null);
});
