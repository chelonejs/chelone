import { QueryClient } from "@tanstack/query-core";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import { fakeDataProvider } from "./fake-provider";
import { getManyAggregateOptions } from "./get-many-aggregate";
import { oneKey } from "./keys";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  users: { schema: z.object({ id: z.number(), name: z.string() }) },
});

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

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
  return { dataProvider, queryClient: newQueryClient(), getMany };
}

describe("getManyAggregateOptions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("records the provider returns for ids nobody asked for are left out of every result", async () => {
    const c = setup();
    c.getMany.mockResolvedValue({
      data: [
        { id: 1, title: "a" },
        { id: 2, title: "b" },
      ],
    });

    const [first, second] = await Promise.all([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
    ]);

    expect(first.map((p) => p.id)).toEqual([1]);
    expect(second.map((p) => p.id)).toEqual([1]);
  });

  it("an id repeated inside one caller's list yields its record once", async () => {
    const c = setup();

    const records = await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [2, "2", 1, 2] }),
    );

    expect(records.map((p) => p.id)).toEqual([2, 1]);
  });

  it("changing the ids array after the query started does not change the request or the result", async () => {
    const c = setup();
    c.getMany.mockResolvedValue({
      data: [
        { id: 1, title: "a" },
        { id: 2, title: "b" },
      ],
    });
    const ids = [1];
    const { queryFn } = getManyAggregateOptions(c, "posts", { ids });

    const pending = queryFn();
    ids.push(2);

    expect((await pending).map((p) => p.id)).toEqual([1]);
    expect(c.getMany).toHaveBeenCalledWith("posts", { ids: [1] });
  });

  it("contexts that share a provider share a batch and each queryClient caches the records", async () => {
    const c = setup();
    const other = {
      dataProvider: c.dataProvider,
      queryClient: newQueryClient(),
    };

    await Promise.all([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
      other.queryClient.fetchQuery(
        getManyAggregateOptions(other, "posts", { ids: [2] }),
      ),
    ]);

    expect(c.getMany).toHaveBeenCalledTimes(1);
    for (const queryClient of [c.queryClient, other.queryClient]) {
      expect(queryClient.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
        id: 1,
        title: "a",
      });
      expect(queryClient.getQueryData(oneKey("posts", { id: 2 }))).toEqual({
        id: 2,
        title: "b",
      });
    }
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
      // Its meta equals the previous call's by value, so it joins that request.
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [2], meta: { a: 1 } }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1], meta: { a: 2 } }),
      ),
    ]);

    expect(c.getMany).toHaveBeenCalledTimes(4);
    expect(c.getMany.mock.calls).toEqual(
      expect.arrayContaining([
        ["posts", { ids: [1] }],
        ["users", { ids: [1] }],
        ["posts", { ids: [1, 2], meta: { a: 1 } }],
        ["posts", { ids: [1], meta: { a: 2 } }],
      ]),
    );
  });

  it("a later tick starts a new batch", async () => {
    const c = setup();

    await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [1] }),
    );
    await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [2] }),
    );

    expect(c.getMany).toHaveBeenCalledTimes(2);
    expect(c.getMany.mock.calls).toEqual(
      expect.arrayContaining([
        ["posts", { ids: [1] }],
        ["posts", { ids: [2] }],
      ]),
    );
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
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    for (const result of results) {
      expect((result as PromiseRejectedResult).reason).toBe(error);
    }
  });

  it("a provider that throws synchronously rejects every caller", async () => {
    const c = setup();
    const error = new Error("sync boom");
    c.getMany.mockImplementation(() => {
      throw error;
    });

    const results = await Promise.allSettled([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [2] }),
      ),
    ]);

    expect(results).toEqual([
      { status: "rejected", reason: error },
      { status: "rejected", reason: error },
    ]);
  });

  it("a malformed provider result rejects every caller instead of leaving them pending", async () => {
    const c = setup();
    c.getMany.mockResolvedValue({ data: undefined } as never);

    const results = await Promise.allSettled([
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [1] }),
      ),
      c.queryClient.fetchQuery(
        getManyAggregateOptions(c, "posts", { ids: [2] }),
      ),
    ]);

    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    const reasons = results.map((r) => (r as PromiseRejectedResult).reason);
    expect(reasons[0]).toBeInstanceOf(TypeError);
    expect(reasons[1]).toBe(reasons[0]);
  });

  it("an empty id list resolves [] and sends no request", async () => {
    const c = setup();

    vi.useFakeTimers();

    const records = await c.queryClient.fetchQuery(
      getManyAggregateOptions(c, "posts", { ids: [] }),
    );
    await vi.runAllTimersAsync();

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
