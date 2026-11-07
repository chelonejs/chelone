import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      author_id: z.number(),
    }),
  },
});
const seed = () =>
  fakeDataProvider<typeof resources>({
    posts: [
      { id: 3, title: "c", author_id: 1 },
      { id: 1, title: "a", author_id: 1 },
      { id: 2, title: "b", author_id: 2 },
    ],
  });

describe("fakeDataProvider", () => {
  it("getList sorts, filters, and page-paginates", async () => {
    const dp = seed();
    const r = await dp.getList("posts", {
      sort: { field: "title", order: "ASC" },
      filter: { author_id: 1 },
      pagination: { page: 1, perPage: 1 },
    });
    expect(r.data.map((p) => p.title)).toEqual(["a"]);
    expect(r.total).toBe(2);
  });

  it("getList returns copies, so an update does not change rows it already returned", async () => {
    const dp = seed();
    const before = await dp.getList("posts", {
      sort: { field: "id", order: "ASC" },
      pagination: { page: 1, perPage: 3 },
    });
    await dp.updateMany("posts", { ids: [1], data: { title: "changed" } });
    expect(before.data.map((p) => p.title)).toEqual(["a", "b", "c"]);
  });

  it("getList cursor-paginates with pageInfo", async () => {
    const dp = seed();
    const p1 = await dp.getList("posts", {
      sort: { field: "id", order: "ASC" },
      pagination: { cursor: null, limit: 2 },
    });
    expect(p1.data.map((p) => p.id)).toEqual([1, 2]);
    expect(p1.pageInfo?.hasNextPage).toBe(true);
    const p2 = await dp.getList("posts", {
      sort: { field: "id", order: "ASC" },
      pagination: { cursor: p1.pageInfo?.nextCursor ?? null, limit: 2 },
    });
    expect(p2.data.map((p) => p.id)).toEqual([3]);
    expect(p2.pageInfo?.hasNextPage).toBe(false);
  });

  it("getOne matches ids loosely (1 vs '1'), rejects missing", async () => {
    const dp = seed();
    expect((await dp.getOne("posts", { id: "1" })).data.title).toBe("a");
    await expect(dp.getOne("posts", { id: 99 })).rejects.toThrow();
  });

  it("getMany preserves requested order; getManyReference filters by target", async () => {
    const dp = seed();
    expect(
      (await dp.getMany("posts", { ids: [2, 1] })).data.map((p) => p.id),
    ).toEqual([2, 1]);
    const refs = await dp.getManyReference("posts", {
      target: "author_id",
      id: 1,
    });
    expect(refs.data).toHaveLength(2);
  });

  it("create assigns an id when absent; update merges; delete removes", async () => {
    const dp = seed();
    const created = await dp.create("posts", {
      data: { title: "d", author_id: 3 },
    });
    expect(created.data.id).toBeDefined();
    const updated = await dp.update("posts", { id: 1, data: { title: "a2" } });
    expect(updated.data).toMatchObject({ id: 1, title: "a2", author_id: 1 });
    await dp.delete("posts", { id: 1 });
    await expect(dp.getOne("posts", { id: 1 })).rejects.toThrow();
  });

  it("getList applies multi-key sort in order", async () => {
    const dp = seed();
    const r = await dp.getList("posts", {
      sort: [
        { field: "author_id", order: "ASC" },
        { field: "title", order: "DESC" },
      ],
    });
    expect(r.data.map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it("updateMany/deleteMany return the touched ids", async () => {
    const dp = seed();
    expect(
      (await dp.updateMany("posts", { ids: [1, 2], data: { title: "x" } }))
        .data,
    ).toEqual([1, 2]);
    expect((await dp.deleteMany("posts", { ids: [1, 2] })).data).toEqual([
      1, 2,
    ]);
    expect((await dp.getList("posts", {})).total).toBe(1);
  });
});
