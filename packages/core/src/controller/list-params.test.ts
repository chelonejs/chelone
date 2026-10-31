import { describe, expect, it } from "vitest";
import {
  hasCustomParams,
  type ListParamsQuery,
  listPatchFromSearch,
  parseListParams,
  serializeListParams,
  serializeListState,
} from "./list-params";

describe("serializeListParams", () => {
  it("serializes filter and displayedFilters as JSON", () => {
    const search = serializeListParams({
      filter: { q: "war", published: true },
      displayedFilters: { published: true },
    });
    const params = new URLSearchParams(search);
    expect(params.get("filter")).toBe(
      JSON.stringify({ q: "war", published: true }),
    );
    expect(params.get("displayedFilters")).toBe(
      JSON.stringify({ published: true }),
    );
  });

  it("serializes sort as field + order and numeric page/perPage", () => {
    const search = serializeListParams({
      sort: "title",
      order: "DESC",
      page: 3,
      perPage: 25,
    });
    const params = new URLSearchParams(search);
    expect(params.get("sort")).toBe("title");
    expect(params.get("order")).toBe("DESC");
    expect(params.get("page")).toBe("3");
    expect(params.get("perPage")).toBe("25");
  });

  it("returns a leading '?' when any param is present", () => {
    expect(serializeListParams({ page: 2 })).toMatch(/^\?/);
  });

  it("returns an empty string when nothing is provided", () => {
    expect(serializeListParams({})).toBe("");
  });

  it("omits undefined fields", () => {
    const search = serializeListParams({ page: 2 });
    const params = new URLSearchParams(search);
    expect(params.has("sort")).toBe(false);
    expect(params.has("filter")).toBe(false);
    expect(params.has("perPage")).toBe(false);
  });

  it("serializes an empty filter object as {}", () => {
    const search = serializeListParams({ filter: {} });
    expect(new URLSearchParams(search).get("filter")).toBe("{}");
  });
});

describe("parseListParams", () => {
  it("parses a real ra-style search string", () => {
    const search =
      "?filter=" +
      encodeURIComponent(JSON.stringify({ q: "war" })) +
      "&displayedFilters=" +
      encodeURIComponent(JSON.stringify({ q: true })) +
      "&sort=title&order=DESC&page=2&perPage=25";
    const parsed = parseListParams(search);
    expect(parsed).toEqual({
      filter: { q: "war" },
      displayedFilters: { q: true },
      sort: "title",
      order: "DESC",
      page: 2,
      perPage: 25,
    });
  });

  it("accepts a search string with no leading '?'", () => {
    expect(parseListParams("page=4")).toEqual({ page: 4 });
  });

  it("returns an empty object for an empty search", () => {
    expect(parseListParams("")).toEqual({});
    expect(parseListParams("?")).toEqual({});
  });

  it("ignores malformed filter JSON instead of throwing", () => {
    const parsed = parseListParams("?filter=%7Bnot-json&page=2");
    expect(parsed.filter).toBeUndefined();
    expect(parsed.page).toBe(2);
  });

  it("ignores malformed displayedFilters JSON", () => {
    const parsed = parseListParams("?displayedFilters=oops&sort=id");
    expect(parsed.displayedFilters).toBeUndefined();
    expect(parsed.sort).toBe("id");
  });

  it("ignores a filter that is not a JSON object", () => {
    for (const json of ["null", "5", '"ab"', "[1]"]) {
      const parsed = parseListParams(
        `?filter=${encodeURIComponent(json)}&sort=id`,
      );
      expect(parsed.filter, json).toBeUndefined();
      expect(parsed.sort).toBe("id");
    }
  });

  it("ignores displayedFilters that are not a JSON object", () => {
    for (const json of ["null", "[true]", "true", '"q"']) {
      const parsed = parseListParams(
        `?displayedFilters=${encodeURIComponent(json)}&sort=id`,
      );
      expect(parsed.displayedFilters, json).toBeUndefined();
      expect(parsed.sort).toBe("id");
    }
  });

  it("ignores a page or perPage below 1", () => {
    for (const value of ["0", "-2", "-5"]) {
      const parsed = parseListParams(`?page=${value}&perPage=${value}&sort=id`);
      expect(parsed.page, `page=${value}`).toBeUndefined();
      expect(parsed.perPage, `perPage=${value}`).toBeUndefined();
      expect(parsed.sort).toBe("id");
    }
  });

  it("keeps a page or perPage of 1 or more", () => {
    expect(parseListParams("?page=1&perPage=1")).toEqual({
      page: 1,
      perPage: 1,
    });
    expect(parseListParams("?page=2.7").page).toBe(2);
  });

  it("ignores non-numeric page and perPage", () => {
    const parsed = parseListParams("?page=abc&perPage=xyz");
    expect(parsed.page).toBeUndefined();
    expect(parsed.perPage).toBeUndefined();
  });

  it("ignores an invalid order value", () => {
    const parsed = parseListParams("?order=sideways&sort=id");
    expect(parsed.order).toBeUndefined();
    expect(parsed.sort).toBe("id");
  });

  it("normalizes a lowercase order to uppercase", () => {
    expect(parseListParams("?order=asc").order).toBe("ASC");
    expect(parseListParams("?order=desc").order).toBe("DESC");
  });
});

describe("round-trip", () => {
  it("survives serialize -> parse", () => {
    const input: ListParamsQuery = {
      filter: { q: "leo", nested: { level: 2 }, tags: ["a", "b"] },
      displayedFilters: { q: true },
      sort: "published_at",
      order: "DESC",
      page: 4,
      perPage: 50,
    };
    expect(parseListParams(serializeListParams(input))).toEqual(input);
  });

  it("survives an empty round-trip", () => {
    expect(parseListParams(serializeListParams({}))).toEqual({});
  });
});

describe("hasCustomParams", () => {
  it("is false for empty params", () => {
    expect(hasCustomParams({})).toBe(false);
  });

  it("is false for defaults (page 1, empty filter)", () => {
    expect(hasCustomParams({ page: 1, filter: {} })).toBe(false);
  });

  it("is true when a filter has keys", () => {
    expect(hasCustomParams({ filter: { q: "war" } })).toBe(true);
  });

  it("is true when sort is set", () => {
    expect(hasCustomParams({ sort: "title" })).toBe(true);
  });

  it("is true when order is set", () => {
    expect(hasCustomParams({ order: "DESC" })).toBe(true);
  });

  it("is true when page is not 1", () => {
    expect(hasCustomParams({ page: 2 })).toBe(true);
  });

  it("is true when perPage is set", () => {
    expect(hasCustomParams({ perPage: 25 })).toBe(true);
  });
});

describe("serializeListState", () => {
  it("writes the primary sort as sort and order", () => {
    expect(
      parseListParams(
        serializeListState({
          page: 2,
          perPage: 5,
          sort: [
            { field: "title", order: "DESC" },
            { field: "id", order: "ASC" },
          ],
          filter: { q: "war" },
          displayedFilters: { q: true },
        }),
      ),
    ).toEqual({
      filter: { q: "war" },
      displayedFilters: { q: true },
      sort: "title",
      order: "DESC",
      page: 2,
      perPage: 5,
    });
  });

  it("leaves sort and order out when there is no sort", () => {
    const query = parseListParams(
      serializeListState({
        page: 1,
        perPage: 10,
        sort: [],
        filter: {},
        displayedFilters: {},
      }),
    );
    expect(query.sort).toBeUndefined();
    expect(query.order).toBeUndefined();
  });
});

describe("listPatchFromSearch", () => {
  const filter = encodeURIComponent(JSON.stringify({ q: "war" }));
  const shown = encodeURIComponent(JSON.stringify({ q: true }));
  it.each([
    ["a clean search", "", null],
    ["page 1 and an empty filter", "?page=1&filter=%7B%7D", null],
    ["a page", "?page=3", { page: 3 }],
    [
      "a sort without an order",
      "?sort=title",
      { sort: { field: "title", order: "ASC" } },
    ],
    [
      "a sort with an order",
      "?sort=title&order=DESC",
      { sort: { field: "title", order: "DESC" } },
    ],
    [
      "a filter and its shown inputs",
      `?filter=${filter}&displayedFilters=${shown}`,
      { filter: { q: "war" }, displayedFilters: { q: true } },
    ],
    [
      "shown inputs but no filter",
      `?displayedFilters=${shown}&page=2`,
      { filter: {}, displayedFilters: { q: true }, page: 2 },
    ],
    ["a perPage", "?perPage=25", { perPage: 25 }],
  ])("reads %s", (_, search, patch) => {
    expect(listPatchFromSearch(search)).toEqual(patch);
  });

  it("returns null instead of throwing for filter=null", () => {
    expect(listPatchFromSearch("?filter=null")).toBeNull();
  });

  it("keeps the valid params of a URL with a malformed filter", () => {
    expect(listPatchFromSearch("?filter=null&page=2")).toEqual({ page: 2 });
  });

  it("ignores a string filter instead of spreading it into an object", () => {
    expect(listPatchFromSearch('?filter="ab"&perPage=0')).toBeNull();
  });
});
