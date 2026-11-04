import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";

describe("fakeDataProvider sorting and seeding edge cases", () => {
  const nullable = defineResources({
    posts: {
      schema: z.object({
        id: z.number(),
        published_at: z.union([z.number(), z.string(), z.null()]),
      }),
    },
  });

  it("sorts null before numbers, as `<` does", async () => {
    const dp = fakeDataProvider<typeof nullable>({
      posts: [
        { id: 1, published_at: 5 },
        { id: 2, published_at: null },
        { id: 3, published_at: 3 },
      ],
    });
    const r = await dp.getList("posts", {
      sort: { field: "published_at", order: "ASC" },
    });
    expect(r.data.map((p) => p.id)).toEqual([2, 3, 1]);
  });

  it("sorts a numeric string against numbers as a number", async () => {
    const dp = fakeDataProvider<typeof nullable>({
      posts: [
        { id: 1, published_at: 10 },
        { id: 2, published_at: "9" },
        { id: 3, published_at: 2 },
      ],
    });
    const r = await dp.getList("posts", {
      sort: { field: "published_at", order: "ASC" },
    });
    expect(r.data.map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it("treats a resource seeded with undefined as an empty table", async () => {
    const dp = fakeDataProvider<typeof nullable>({ posts: undefined });
    expect((await dp.getList("posts", {})).data).toEqual([]);
    await dp.create("posts", { data: { published_at: 1 } });
    expect((await dp.getList("posts", {})).total).toBe(1);
  });
});
