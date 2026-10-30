import { QueryClient } from "@tanstack/query-core";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { getManyAggregateOptions } from "./get-many-aggregate";
import { oneKey } from "./keys";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  users: { schema: z.object({ id: z.number(), name: z.string() }) },
});

function setup() {
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
      { id: 3, title: "c" },
    ],
    users: [
      { id: 1, name: "ann" },
      { id: 2, name: "bob" },
    ],
  });
  const getMany = vi.spyOn(dataProvider, "getMany");
  return { dataProvider, queryClient: new QueryClient(), getMany };
}

describe("getManyAggregateOptions", () => {
  it("queries started in the same tick make one getMany call per resource", async () => {
    const c = setup();

    const [first, second] = await Promise.all([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [2] }),
      ),
    ]);

    expect(c.getMany).toHaveBeenCalledTimes(1);
    expect(c.getMany).toHaveBeenCalledWith("posts", { ids: [1, 2] });
    expect(first).toEqual([{ id: 1, title: "a" }]);
    expect(second).toEqual([{ id: 2, title: "b" }]);
  });

  it('ids are merged and deduplicated across callers, 1 and "1" count once', async () => {
    const c = setup();

    const [first, second] = await Promise.all([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1, 2] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: ["1", 3] }),
      ),
    ]);

    expect(c.getMany).toHaveBeenCalledTimes(1);
    expect(c.getMany).toHaveBeenCalledWith("posts", { ids: [1, 2, 3] });
    expect(first.map((p) => p.id)).toEqual([1, 2]);
    expect(second.map((p) => p.id)).toEqual([1, 3]);
  });

  it("each caller gets only its own ids, in its own order, and ids the provider omits are left out", async () => {
    const c = setup();
    c.getMany.mockResolvedValue({
      data: [
        { id: 1, title: "a" },
        { id: 3, title: "c" },
      ],
    });

    const [first, second] = await Promise.all([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [3, 1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1, 2, 3] }),
      ),
    ]);

    expect(first.map((p) => p.id)).toEqual([3, 1]);
    expect(second.map((p) => p.id)).toEqual([1, 3]);
  });

  it("different resources and different meta values are sent as separate requests", async () => {
    const c = setup();

    await Promise.all([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "users", { ids: [1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1], meta: { a: 1 } }),
      ),
      // Equal by value to the call above, so it joins the same request.
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [2], meta: { a: 1 } }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1], meta: { a: 2 } }),
      ),
    ]);

    expect(c.getMany.mock.calls).toEqual([
      ["posts", { ids: [1] }],
      ["users", { ids: [1] }],
      ["posts", { ids: [1, 2], meta: { a: 1 } }],
      ["posts", { ids: [1], meta: { a: 2 } }],
    ]);
  });

  it("a later tick starts a new batch", async () => {
    const c = setup();

    await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [1] }),
    );
    await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [2] }),
    );

    expect(c.getMany.mock.calls).toEqual([
      ["posts", { ids: [1] }],
      ["posts", { ids: [2] }],
    ]);
  });

  it("a provider rejection rejects every caller in the batch with the same error", async () => {
    const c = setup();
    const error = new Error("boom");
    c.getMany.mockRejectedValue(error);

    const results = await Promise.allSettled([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [2] }),
      ),
    ]);

    expect(c.getMany).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { status: "rejected", reason: error },
      { status: "rejected", reason: error },
    ]);
    expect((results[0] as PromiseRejectedResult).reason).toBe(error);
    expect((results[1] as PromiseRejectedResult).reason).toBe(error);
  });

  it("an empty id list resolves [] and sends no request", async () => {
    const c = setup();

    const records = await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [] }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(records).toEqual([]);
    expect(c.getMany).not.toHaveBeenCalled();
  });

  it("returned records are written to the oneKey cache", async () => {
    const c = setup();

    await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [2, 3] }),
    );

    expect(c.queryClient.getQueryData(oneKey("posts", { id: 2 }))).toEqual({
      id: 2,
      title: "b",
    });
    expect(c.queryClient.getQueryData(oneKey("posts", { id: 3 }))).toEqual({
      id: 3,
      title: "c",
    });
  });

  it("the result is typed as the registry record array", async () => {
    const c = setup();

    const records = await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [1] }),
    );

    expectTypeOf(records).toEqualTypeOf<{ id: number; title: string }[]>();
  });
});
