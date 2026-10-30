import { QueryClient } from "@tanstack/query-core";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { oneKey } from "./keys";
import {
  getListOptions,
  getManyOptions,
  getManyReferenceOptions,
  getOneOptions,
} from "./query-options";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
const ctx = () => ({
  dataProvider: fakeDataProvider<typeof resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
  }),
  queryClient: new QueryClient(),
});

describe("query option factories", () => {
  it("getListOptions fetches via fetchQuery and returns the typed result", async () => {
    const c = ctx();
    const result = await c.queryClient.fetchQuery(
      getListOptions(c, "posts", {}),
    );
    expect(result.data.map((p) => p.title)).toEqual(["a", "b"]);
    expectTypeOf(result.data).toEqualTypeOf<{ id: number; title: string }[]>();
  });

  it("getList seeds the getOne cache for each row (cross-population)", async () => {
    const c = ctx();
    await c.queryClient.fetchQuery(getListOptions(c, "posts", {}));
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({
      id: 1,
      title: "a",
    });
  });

  it("getOneOptions caches the record under the stringified-id key", async () => {
    const c = ctx();
    const record = await c.queryClient.fetchQuery(
      getOneOptions(c, "posts", { id: "1" }),
    );
    expect(record.title).toBe("a");
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 1 })),
    ).toMatchObject({ id: 1 });
  });

  it("getManyOptions seeds oneKey slots", async () => {
    const c = ctx();
    await c.queryClient.fetchQuery(getManyOptions(c, "posts", { ids: [2] }));
    expect(
      c.queryClient.getQueryData(oneKey("posts", { id: 2 })),
    ).toMatchObject({ id: 2 });
  });
});

describe("getManyReferenceOptions", () => {
  const refResources = defineResources({
    comments: {
      schema: z.object({
        id: z.number(),
        post_id: z.number(),
        body: z.string(),
      }),
    },
  });
  const refCtx = () => ({
    dataProvider: fakeDataProvider<typeof refResources>({
      comments: [
        { id: 1, post_id: 1, body: "a" },
        { id: 2, post_id: 2, body: "b" },
        { id: 3, post_id: 1, body: "c" },
      ],
    }),
    queryClient: new QueryClient(),
  });
  const params = {
    target: "post_id",
    id: 1,
    pagination: { page: 1, perPage: 10 },
  };

  it("getManyReferenceOptions calls getManyReference with the target, id and paging and returns the typed list result", async () => {
    const c = refCtx();
    const spy = vi.spyOn(c.dataProvider, "getManyReference");
    const result = await c.queryClient.fetchQuery(
      getManyReferenceOptions(c, "comments", params),
    );
    expect(spy).toHaveBeenCalledWith("comments", params);
    expect(result.data.map((r) => r.body)).toEqual(["a", "c"]);
    expect(result.total).toBe(2);
    expectTypeOf(result.data).toEqualTypeOf<
      { id: number; post_id: number; body: string }[]
    >();
  });

  it("getManyReferenceOptions seeds oneKey slots for every returned row", async () => {
    const c = refCtx();
    await c.queryClient.fetchQuery(
      getManyReferenceOptions(c, "comments", params),
    );
    expect(
      c.queryClient.getQueryData(oneKey("comments", { id: 1 })),
    ).toMatchObject({ id: 1, body: "a" });
    expect(
      c.queryClient.getQueryData(oneKey("comments", { id: 3 })),
    ).toMatchObject({ id: 3, body: "c" });
    expect(
      c.queryClient.getQueryData(oneKey("comments", { id: 2 })),
    ).toBeUndefined();
  });

  it("getManyReferenceOptions rejects with the provider error and caches nothing", async () => {
    const c = refCtx();
    const boom = new Error("boom");
    vi.spyOn(c.dataProvider, "getManyReference").mockRejectedValue(boom);
    const options = getManyReferenceOptions(c, "comments", params);
    await expect(c.queryClient.fetchQuery(options)).rejects.toBe(boom);
    expect(c.queryClient.getQueryData(options.queryKey)).toBeUndefined();
    expect(
      c.queryClient.getQueryData(oneKey("comments", { id: 1 })),
    ).toBeUndefined();
  });
});
