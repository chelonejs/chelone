import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { JsonValue } from "../guards";
import {
  type ListParamsQuery,
  parseListParams,
  serializeListParams,
} from "./list-params";
import { listSearchSchema } from "./list-search-schema";

const filterJson = (value: unknown): string =>
  encodeURIComponent(JSON.stringify(value));

/** The raw search object a router hands `validateSearch` before any parsing. */
function rawSearch(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search));
}

/** The same object after a router's own parser: numbers as numbers, JSON as objects. */
function parsedSearch(search: string): Record<string, JsonValue> {
  return Object.fromEntries(
    [...new URLSearchParams(search)].map(([key, value]) => {
      try {
        return [key, JSON.parse(value)];
      } catch {
        return [key, value];
      }
    }),
  );
}

describe("listSearchSchema", () => {
  const full = `?filter=${filterJson({ q: "war" })}&displayedFilters=${filterJson(
    { q: true },
  )}&sort=title&order=DESC&page=2&perPage=25`;

  it.each([
    ["the full set", full],
    ["page 0", "?page=0"],
    ["a page with trailing junk", "?page=2abc"],
    ["a page that is no number", "?page=abc"],
    ["a lowercase order", "?order=desc&sort=title"],
    ["an order outside ASC and DESC", "?order=up&sort=title"],
    ["a truncated filter", "?filter=%7Bnot-json&page=2"],
    ["a filter that is a JSON array", `?filter=${filterJson([])}&sort=title`],
    ["a filter that is null", "?filter=null&sort=title"],
    ["an empty search", ""],
  ])(
    "reads a query string's raw strings as parseListParams does: %s",
    (_label, search) => {
      expect(listSearchSchema.parse(rawSearch(search))).toEqual(
        parseListParams(search),
      );
    },
  );

  it("reads values a router already parsed", () => {
    const search = {
      page: 2,
      perPage: 25,
      sort: "title",
      order: "DESC",
      filter: { q: "war" },
      displayedFilters: { q: true },
    };
    expect(listSearchSchema.parse(search)).toEqual(search);
  });

  it("upper-cases an order a router hands in lowercase", () => {
    expect(listSearchSchema.parse({ order: "desc", sort: "title" })).toEqual({
      order: "DESC",
      sort: "title",
    });
  });

  it("drops a key the list does not have", () => {
    const parsed = listSearchSchema.parse({
      page: 2,
      tab: "drafts",
      sessionId: "abc",
    });
    expect(parsed).toEqual({ page: 2 });
  });

  it("never throws on junk", () => {
    const parsed = listSearchSchema.parse({
      page: {},
      filter: 5,
      order: 3,
      sort: 4,
    });
    expect(parsed).toEqual({});
    expect(parsed.page).toBeUndefined();
    expect(parsed.filter).toBeUndefined();
    expect(parsed.order).toBeUndefined();
    expect(parsed.sort).toBeUndefined();
  });

  it("keeps an app's own keys once extended", () => {
    const withTab = listSearchSchema.extend({ tab: z.string() });
    const parsed = withTab.parse({ tab: "drafts", page: 2, sort: "title" });
    expect(parsed.tab).toBe("drafts");
    expect(parsed.page).toBe(2);
    expect(parsed.sort).toBe("title");
  });
});

describe("listSearchSchema round-trips through serializeListParams", () => {
  const queries: ListParamsQuery[] = [
    {},
    { page: 2 },
    { page: 4, perPage: 50, sort: "published_at", order: "DESC" },
    {
      filter: { q: "leo", nested: { level: 2 }, tags: ["a", "b"] },
      displayedFilters: { q: true },
      sort: "title",
      order: "ASC",
      page: 1,
      perPage: 10,
    },
    { filter: {}, displayedFilters: {} },
  ];

  it.each(queries.map((query, index) => [index, query]))(
    "reads back query %i",
    (_index, query) => {
      const search = serializeListParams(query);
      const parsed = listSearchSchema.parse(parsedSearch(search));
      expect(parsed).toEqual(query);
      expect(serializeListParams(parsed)).toBe(search);
    },
  );
});
