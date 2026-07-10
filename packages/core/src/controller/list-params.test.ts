import { describe, expect, it } from "vitest";
import {
  hasCustomParams,
  type ListParamsQuery,
  parseListParams,
  serializeListParams,
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
