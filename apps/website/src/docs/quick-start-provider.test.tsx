import * as core from "@chelone/core";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import setup from "./content/react/quick-start-guide/setup.mdx?raw";

// Execute the provider readers copy, using the real public core exports.
function tutorialProvider(): core.DataProvider {
  const snippet = setup.match(
    /```tsx title="src\/data-provider.ts"\n([\s\S]*?)```/,
  )?.[1];
  if (!snippet) throw new Error("Setup must define src/data-provider.ts");
  const { outputText } = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports: { dataProvider?: core.DataProvider } = {};
  const load = (name: string) => {
    if (name !== "@chelone/core") throw new Error(`Unexpected import: ${name}`);
    return core;
  };
  new Function("require", "exports", outputText)(load, exports);
  if (!exports.dataProvider) throw new Error("Setup must export dataProvider");
  return exports.dataProvider;
}

describe("quick-start data provider", () => {
  it("matches part of the seeded post title through the search filter", async () => {
    const provider = tutorialProvider();

    const result = await provider.getList("posts", { filter: { q: "On" } });

    expect(result.data.map((post) => post.id)).toEqual([1]);
    expect(result.total).toBe(1);
  });

  it("paginates sorted search matches for one author", async () => {
    const provider = tutorialProvider();
    for (const post of [
      { id: 2, title: "Irrelevant", body: "", author_id: 1 },
      { id: 3, title: "On Algorithms", body: "", author_id: 2 },
      { id: 4, title: "Unrelated", body: "Notes ON machines", author_id: 1 },
    ]) {
      await provider.create("posts", { data: post });
    }

    const result = await provider.getList("posts", {
      filter: { q: "on", author_id: 1 },
      sort: { field: "id", order: "DESC" },
      pagination: { page: 2, perPage: 1 },
    });

    expect(result).toMatchObject({ data: [{ id: 1 }], total: 2 });
  });
});
