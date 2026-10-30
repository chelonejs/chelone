import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it } from "vitest";
import { removeRecordsFromCache, updateRecordsInCache } from "./cache-ops";
import { listKey, manyKey, oneKey } from "./keys";
import type { GetListResult } from "./types";

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

const listParams = {
  pagination: { page: 1, perPage: 10 },
  sort: { field: "id", order: "ASC" as const },
  filter: {},
};

function seedList(qc: QueryClient) {
  qc.setQueryData<GetListResult>(listKey("posts", listParams), {
    data: [
      { id: 1, title: "One" },
      { id: 2, title: "Two" },
      { id: 3, title: "Three" },
    ],
    total: 3,
  });
}

describe("removeRecordsFromCache", () => {
  it("removes rows from every list page and decrements total", () => {
    const qc = makeClient();
    seedList(qc);
    removeRecordsFromCache(qc, "posts", [2]);
    const list = qc.getQueryData<GetListResult>(listKey("posts", listParams));
    expect(list?.data.map((r) => r.id)).toEqual([1, 3]);
    expect(list?.total).toBe(2);
  });

  it("removes multiple ids at once", () => {
    const qc = makeClient();
    seedList(qc);
    removeRecordsFromCache(qc, "posts", [1, 3]);
    const list = qc.getQueryData<GetListResult>(listKey("posts", listParams));
    expect(list?.data.map((r) => r.id)).toEqual([2]);
    expect(list?.total).toBe(1);
  });

  it("drops the getOne cache entry", () => {
    const qc = makeClient();
    qc.setQueryData(oneKey("posts", { id: 5 }), { id: 5, title: "Five" });
    removeRecordsFromCache(qc, "posts", [5]);
    expect(qc.getQueryData(oneKey("posts", { id: 5 }))).toBeUndefined();
  });

  it("does not mutate the previous cache object (snapshot stays valid)", () => {
    const qc = makeClient();
    seedList(qc);
    const before = qc.getQueryData<GetListResult>(listKey("posts", listParams));
    removeRecordsFromCache(qc, "posts", [2]);
    // The pre-apply object reference is untouched — still holds all three rows.
    expect(before?.data.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("leaves total undefined when it was undefined", () => {
    const qc = makeClient();
    qc.setQueryData<GetListResult>(listKey("posts", listParams), {
      data: [{ id: 1 }, { id: 2 }],
    });
    removeRecordsFromCache(qc, "posts", [1]);
    const list = qc.getQueryData<GetListResult>(listKey("posts", listParams));
    expect(list?.total).toBeUndefined();
    expect(list?.data.map((r) => r.id)).toEqual([2]);
  });
});

describe("updateRecordsInCache", () => {
  it("patches matching rows in every list page", () => {
    const qc = makeClient();
    seedList(qc);
    updateRecordsInCache(qc, "posts", [2], { title: "Patched" });
    const list = qc.getQueryData<GetListResult>(listKey("posts", listParams));
    expect(list?.data.find((r) => r.id === 2)?.title).toBe("Patched");
    expect(list?.data.find((r) => r.id === 1)?.title).toBe("One");
  });

  it("patches the getOne cache entry", () => {
    const qc = makeClient();
    qc.setQueryData(oneKey("posts", { id: 5 }), { id: 5, title: "Five" });
    updateRecordsInCache(qc, "posts", [5], { title: "Cinq" });
    expect(qc.getQueryData(oneKey("posts", { id: 5 }))).toEqual({
      id: 5,
      title: "Cinq",
    });
  });

  it("does not mutate the previous cache object", () => {
    const qc = makeClient();
    seedList(qc);
    const before = qc.getQueryData<GetListResult>(listKey("posts", listParams));
    updateRecordsInCache(qc, "posts", [2], { title: "Patched" });
    expect(before?.data.find((r) => r.id === 2)?.title).toBe("Two");
  });

  it("patches matching records in every getMany cache entry", () => {
    const qc = makeClient();
    const both = manyKey("authors", { ids: [1, 2] });
    const other = manyKey("authors", { ids: [3] });
    const before = [
      { id: 1, name: "Ann" },
      { id: 2, name: "Bob" },
    ];
    qc.setQueryData(both, before);
    qc.setQueryData(other, [{ id: 3, name: "Cy" }]);
    updateRecordsInCache(qc, "authors", [1], { name: "New" });
    expect(qc.getQueryData(both)).toEqual([
      { id: 1, name: "New" },
      { id: 2, name: "Bob" },
    ]);
    expect(qc.getQueryData(other)).toEqual([{ id: 3, name: "Cy" }]);
    expect(before[0]?.name).toBe("Ann");
  });
});
