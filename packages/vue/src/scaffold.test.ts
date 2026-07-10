import { defineResources } from "@chelone/core";
import { describe, expect, it } from "vitest";

// Scaffold smoke test — proves the workspace link (@chelone/core resolves via
// `workspace:*`), Vitest runs, and the --typecheck pipeline compiles a source
// symbol from core. This is intentionally trivial; the real bridge/router/
// composition tests arrive in Tasks 2-4.
describe("@chelone/vue scaffold", () => {
  it("resolves @chelone/core across the workspace link", () => {
    expect(defineResources).toBeDefined();
    expect(typeof defineResources).toBe("function");
  });
});
