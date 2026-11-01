import { describe, expect, it } from "vitest";
import {
  canUseCachedPage,
  getPrevNextParams,
  resolvePrevNext,
} from "./prev-next";

describe("getPrevNextParams", () => {
  it("uses the stored sort and filter and merges the filter option over the stored filter", () => {
    const { cached, fetch } = getPrevNextParams(
      {
        page: 3,
        perPage: 25,
        sort: [{ field: "title", order: "DESC" }],
        filter: { status: "draft", author: 4 },
      },
      { filter: { status: "published" }, limit: 500, meta: { tenant: "a" } },
    );
    const filter = { status: "published", author: 4 };
    const sort = { field: "title", order: "DESC" };
    expect(cached).toEqual({
      pagination: { page: 3, perPage: 25 },
      sort,
      filter,
    });
    expect(fetch).toEqual({
      pagination: { page: 1, perPage: 500 },
      sort,
      filter,
      meta: { tenant: "a" },
    });
  });

  it("storeKey false ignores stored params and uses the option defaults", () => {
    const { cached, fetch } = getPrevNextParams(
      {
        page: 3,
        perPage: 25,
        sort: [{ field: "title", order: "DESC" }],
        filter: { status: "draft" },
      },
      { storeKey: false, filterDefaultValues: { status: "open" } },
    );
    const defaults = {
      sort: { field: "id", order: "ASC" },
      filter: { status: "open" },
    };
    expect(cached).toEqual({
      pagination: { page: 1, perPage: 10 },
      ...defaults,
    });
    expect(fetch).toEqual({
      pagination: { page: 1, perPage: 1000 },
      ...defaults,
    });
  });
});

describe("canUseCachedPage", () => {
  const rows = (...ids: number[]) => ids.map((id) => ({ id }));

  it("is false when the record is not on the cached page", () => {
    expect(canUseCachedPage(9, undefined, 1, 10)).toBe(false);
    expect(canUseCachedPage(9, { data: rows(1, 2, 3), total: 3 }, 1, 10)).toBe(
      false,
    );
  });

  it("is false for the first row of a later page and the last row of an earlier page", () => {
    const page2 = { data: rows(4, 5, 6), total: 9 };
    expect(canUseCachedPage(4, page2, 2, 3)).toBe(false);
    const page1 = { data: rows(1, 2, 3), total: 9 };
    expect(canUseCachedPage(3, page1, 1, 3)).toBe(false);
  });

  it("is true for a row with both neighbours on the page", () => {
    expect(canUseCachedPage(5, { data: rows(4, 5, 6), total: 9 }, 2, 3)).toBe(
      true,
    );
  });

  it("is true for the first row of page 1 and the last row of the last page", () => {
    expect(canUseCachedPage(1, { data: rows(1, 2, 3), total: 6 }, 1, 3)).toBe(
      true,
    );
    expect(canUseCachedPage(6, { data: rows(4, 5, 6), total: 6 }, 2, 3)).toBe(
      true,
    );
  });

  it("treats an id of 0 as on the page", () => {
    expect(canUseCachedPage(0, { data: rows(0, 1), total: 2 }, 1, 10)).toBe(
      true,
    );
  });
});

describe("resolvePrevNext", () => {
  const rows = (...ids: number[]) => ids.map((id) => ({ id }));

  it("returns the neighbouring ids, the position and the total", () => {
    expect(resolvePrevNext(2, rows(1, 2, 3), 3, 0)).toEqual({
      prevId: 1,
      nextId: 3,
      index: 1,
      total: 3,
    });
    expect(resolvePrevNext(1, rows(1, 2, 3), 3, 0)).toEqual({
      prevId: null,
      nextId: 2,
      index: 0,
      total: 3,
    });
    expect(resolvePrevNext(3, rows(1, 2, 3), 3, 0)).toEqual({
      prevId: 2,
      nextId: null,
      index: 2,
      total: 3,
    });
  });

  it("treats an id of 0 as a neighbour", () => {
    expect(resolvePrevNext(1, rows(0, 1, 2), 3, 0).prevId).toBe(0);
    expect(resolvePrevNext(1, rows(2, 1, 0), 3, 0).nextId).toBe(0);
  });

  it("has no neighbour and no index when the record is not in the rows", () => {
    expect(resolvePrevNext(9, rows(1, 2, 3), 3, 0)).toEqual({
      prevId: null,
      nextId: null,
      index: undefined,
      total: 3,
    });
  });

  it("adds the page offset to the index", () => {
    expect(resolvePrevNext(5, rows(4, 5, 6), 9, 3).index).toBe(4);
  });
});
