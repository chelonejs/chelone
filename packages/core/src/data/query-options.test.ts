import { QueryClient } from "@tanstack/query-core";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { oneKey } from "./keys";
import { getListOptions, getManyOptions, getOneOptions } from "./query-options";

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
