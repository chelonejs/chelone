import { type InfiniteData, QueryClient } from "@tanstack/query-core";
import { describe, expect, it } from "vitest";
import { removeRecordsFromCache, updateRecordsInCache } from "./cache-ops";
import {
  infiniteListKey,
  listKey,
  manyKey,
  manyReferenceKey,
  oneKey,
} from "./keys";
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

const infiniteParams = { pagination: { page: 1, perPage: 2 } };

function seedInfinite(qc: QueryClient) {
  qc.setQueryData<InfiniteData<GetListResult, number>>(
    infiniteListKey("posts", infiniteParams),
    {
      pages: [
        {
          data: [
            { id: 1, title: "One" },
            { id: 2, title: "Two" },
          ],
          total: 4,
        },
        {
          data: [
            { id: 3, title: "Three" },
            { id: 4, title: "Four" },
          ],
          total: 4,
        },
      ],
      pageParams: [1, 2],
    },
  );
}

const refParams = {
  target: "post_id",
  id: 1,
  pagination: { page: 1, perPage: 10 },
};

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

describe("removeRecordsFromCache on infinite and reference lists", () => {
  it("removeRecordsFromCache drops ids from every page of an infinite list and lowers total on each page", () => {
    const qc = makeClient();
    seedInfinite(qc);
    const key = infiniteListKey("posts", infiniteParams);
    const before = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    removeRecordsFromCache(qc, "posts", [2, 3]);
    const after = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    expect(after?.pages.map((p) => p.data.map((r) => r.id))).toEqual([
      [1],
      [4],
    ]);
    expect(after?.pages.map((p) => p.total)).toEqual([2, 2]);
    expect(after?.pageParams).toEqual([1, 2]);
    // The pre-apply object is untouched, so the undoable snapshot can roll back.
    expect(before?.pages.map((p) => p.data.length)).toEqual([2, 2]);
    expect(before?.pages.map((p) => p.total)).toEqual([4, 4]);
    expect(before?.pageParams).toEqual([1, 2]);
  });

  it("removeRecordsFromCache keeps the cached object of an infinite list that holds none of the ids", () => {
    const qc = makeClient();
    seedInfinite(qc);
    const key = infiniteListKey("posts", infiniteParams);
    const before = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    removeRecordsFromCache(qc, "posts", [99]);
    const after = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    expect(after).toBe(before);
    expect(after?.pages.map((p) => p.data.map((r) => r.id))).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(after?.pages.map((p) => p.total)).toEqual([4, 4]);
    expect(after?.pageParams).toEqual([1, 2]);
  });

  it("removeRecordsFromCache lowers total only by the ids an infinite list holds", () => {
    const qc = makeClient();
    seedInfinite(qc);
    const key = infiniteListKey("posts", infiniteParams);
    removeRecordsFromCache(qc, "posts", [2, 99, 2]);
    const after = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    expect(after?.pages.map((p) => p.data.map((r) => r.id))).toEqual([
      [1],
      [3, 4],
    ]);
    expect(after?.pages.map((p) => p.total)).toEqual([3, 3]);
  });

  it("removeRecordsFromCache leaves an empty page in place when all its rows go", () => {
    const qc = makeClient();
    seedInfinite(qc);
    const key = infiniteListKey("posts", infiniteParams);
    removeRecordsFromCache(qc, "posts", [1, 2]);
    const after = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    expect(after?.pages.map((p) => p.data.length)).toEqual([0, 2]);
    expect(after?.pages.map((p) => p.total)).toEqual([2, 2]);
    expect(after?.pageParams).toEqual([1, 2]);
  });

  it("removeRecordsFromCache with no ids leaves every list cache and getOne entry as it was", () => {
    const qc = makeClient();
    seedInfinite(qc);
    seedList(qc);
    qc.setQueryData(oneKey("posts", { id: 1 }), { id: 1, title: "One" });
    const infiniteKey = infiniteListKey("posts", infiniteParams);
    const infiniteBefore = qc.getQueryData(infiniteKey);
    const listBefore = qc.getQueryData(listKey("posts", listParams));
    removeRecordsFromCache(qc, "posts", []);
    expect(qc.getQueryData(infiniteKey)).toBe(infiniteBefore);
    expect(qc.getQueryData(listKey("posts", listParams))).toBe(listBefore);
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
      id: 1,
      title: "One",
    });
  });

  it("removeRecordsFromCache leaves the getOne entries of other ids", () => {
    const qc = makeClient();
    qc.setQueryData(oneKey("posts", { id: 1 }), { id: 1, title: "One" });
    qc.setQueryData(oneKey("posts", { id: 2 }), { id: 2, title: "Two" });
    removeRecordsFromCache(qc, "posts", [2]);
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
      id: 1,
      title: "One",
    });
    expect(qc.getQueryData(oneKey("posts", { id: 2 }))).toBeUndefined();
  });

  it("removeRecordsFromCache drops ids from a getManyReference list and lowers its total", () => {
    const qc = makeClient();
    const key = manyReferenceKey("posts", refParams);
    qc.setQueryData<GetListResult>(key, {
      data: [{ id: 1 }, { id: 2 }, { id: 3 }],
      total: 3,
    });
    removeRecordsFromCache(qc, "posts", [2]);
    const list = qc.getQueryData<GetListResult>(key);
    expect(list?.data.map((r) => r.id)).toEqual([1, 3]);
    expect(list?.total).toBe(2);
  });

  it("removeRecordsFromCache keeps a getManyReference list that holds none of the ids", () => {
    const qc = makeClient();
    const key = manyReferenceKey("posts", refParams);
    qc.setQueryData<GetListResult>(key, { data: [{ id: 1 }], total: 1 });
    const before = qc.getQueryData<GetListResult>(key);
    removeRecordsFromCache(qc, "posts", [99]);
    const after = qc.getQueryData<GetListResult>(key);
    expect(after).toBe(before);
    expect(after?.total).toBe(1);
  });

  it("removeRecordsFromCache keeps total from going below zero", () => {
    const qc = makeClient();
    const key = manyReferenceKey("posts", refParams);
    qc.setQueryData<GetListResult>(key, { data: [{ id: 1 }], total: 0 });
    removeRecordsFromCache(qc, "posts", [1]);
    expect(qc.getQueryData<GetListResult>(key)?.total).toBe(0);
  });

  it("removeRecordsFromCache drops ids from every getMany entry", () => {
    const qc = makeClient();
    const both = manyKey("authors", { ids: [1, 2] });
    const other = manyKey("authors", { ids: [1, 3] });
    const before = [
      { id: 1, name: "Ann" },
      { id: 2, name: "Bob" },
    ];
    qc.setQueryData(both, before);
    qc.setQueryData(other, [
      { id: 1, name: "Ann" },
      { id: 3, name: "Cy" },
    ]);
    removeRecordsFromCache(qc, "authors", [1]);
    expect(qc.getQueryData(both)).toEqual([{ id: 2, name: "Bob" }]);
    expect(qc.getQueryData(other)).toEqual([{ id: 3, name: "Cy" }]);
    expect(before).toHaveLength(2);
  });

  it("removeRecordsFromCache keeps the cached object of a getMany entry that holds none of the ids", () => {
    const qc = makeClient();
    const key = manyKey("authors", { ids: [2] });
    qc.setQueryData(key, [{ id: 2, name: "Bob" }]);
    const before = qc.getQueryData(key);
    removeRecordsFromCache(qc, "authors", [1]);
    expect(qc.getQueryData(key)).toBe(before);
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

describe("updateRecordsInCache on infinite and reference lists", () => {
  it("updateRecordsInCache patches matching rows on every infinite page and leaves other rows", () => {
    const qc = makeClient();
    seedInfinite(qc);
    const key = infiniteListKey("posts", infiniteParams);
    const before = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    updateRecordsInCache(qc, "posts", [2, 3], { title: "Patched" });
    const after = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    expect(after?.pages.flatMap((p) => p.data)).toEqual([
      { id: 1, title: "One" },
      { id: 2, title: "Patched" },
      { id: 3, title: "Patched" },
      { id: 4, title: "Four" },
    ]);
    expect(after?.pages.map((p) => p.total)).toEqual([4, 4]);
    expect(after?.pageParams).toEqual([1, 2]);
    expect(before?.pages[0]?.data[1]?.title).toBe("Two");
    expect(before?.pages[1]?.data[0]?.title).toBe("Three");
    expect(before?.pages.map((p) => p.total)).toEqual([4, 4]);
    expect(before?.pageParams).toEqual([1, 2]);
  });

  it("updateRecordsInCache keeps the cached object of an infinite list that holds none of the ids", () => {
    const qc = makeClient();
    seedInfinite(qc);
    const key = infiniteListKey("posts", infiniteParams);
    const before = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    updateRecordsInCache(qc, "posts", [99], { title: "Patched" });
    expect(qc.getQueryData(key)).toBe(before);
  });

  it("updateRecordsInCache patches only the infinite rows that match when some ids are absent", () => {
    const qc = makeClient();
    seedInfinite(qc);
    const key = infiniteListKey("posts", infiniteParams);
    updateRecordsInCache(qc, "posts", [4, 99, 4], { title: "Patched" });
    const after = qc.getQueryData<InfiniteData<GetListResult, number>>(key);
    expect(after?.pages.flatMap((p) => p.data.map((r) => r.title))).toEqual([
      "One",
      "Two",
      "Three",
      "Patched",
    ]);
  });

  it("updateRecordsInCache with no ids leaves every list cache as it was", () => {
    const qc = makeClient();
    seedInfinite(qc);
    seedList(qc);
    const infiniteKey = infiniteListKey("posts", infiniteParams);
    const infiniteBefore = qc.getQueryData(infiniteKey);
    const listBefore = qc.getQueryData(listKey("posts", listParams));
    updateRecordsInCache(qc, "posts", [], { title: "Patched" });
    expect(qc.getQueryData(infiniteKey)).toBe(infiniteBefore);
    expect(qc.getQueryData(listKey("posts", listParams))).toBe(listBefore);
  });

  it("updateRecordsInCache leaves the getOne entries of other ids", () => {
    const qc = makeClient();
    qc.setQueryData(oneKey("posts", { id: 1 }), { id: 1, title: "One" });
    qc.setQueryData(oneKey("posts", { id: 2 }), { id: 2, title: "Two" });
    updateRecordsInCache(qc, "posts", [2], { title: "Patched" });
    expect(qc.getQueryData(oneKey("posts", { id: 1 }))).toEqual({
      id: 1,
      title: "One",
    });
  });

  it("updateRecordsInCache patches matching rows of a getManyReference list", () => {
    const qc = makeClient();
    const key = manyReferenceKey("posts", refParams);
    const before: GetListResult = {
      data: [
        { id: 1, title: "One" },
        { id: 2, title: "Two" },
      ],
      total: 2,
    };
    qc.setQueryData<GetListResult>(key, before);
    updateRecordsInCache(qc, "posts", [2], { title: "Patched" });
    expect(qc.getQueryData<GetListResult>(key)).toEqual({
      data: [
        { id: 1, title: "One" },
        { id: 2, title: "Patched" },
      ],
      total: 2,
    });
    expect(before.data[1]?.title).toBe("Two");
  });

  it("updateRecordsInCache keeps a getManyReference list that holds none of the ids", () => {
    const qc = makeClient();
    const key = manyReferenceKey("posts", refParams);
    qc.setQueryData<GetListResult>(key, {
      data: [{ id: 1, title: "One" }],
      total: 1,
    });
    const before = qc.getQueryData<GetListResult>(key);
    updateRecordsInCache(qc, "posts", [99], { title: "Patched" });
    expect(qc.getQueryData<GetListResult>(key)).toBe(before);
  });
});
