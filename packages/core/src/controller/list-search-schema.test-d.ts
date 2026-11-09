import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { DisplayedFilters, FilterPayload } from "../data/types";
import type { ListParamsQuery } from "../index";
import { listSearchSchema as BarrelListSearchSchema } from "../index";
import { parseListParams } from "./list-params";
import { listSearchSchema } from "./list-search-schema";

type ListSearch = z.infer<typeof listSearchSchema>;
declare const search: ListSearch;

const withTab = listSearchSchema.extend({ tab: z.string() });
declare const tabbed: z.infer<typeof withTab>;

describe("the barrel", () => {
  it("re-exports listSearchSchema", () => {
    expectTypeOf(BarrelListSearchSchema).toEqualTypeOf(listSearchSchema);
  });
});

describe("listSearchSchema output", () => {
  it("is mutually assignable with ListParamsQuery", () => {
    expectTypeOf<ListSearch>().toEqualTypeOf<ListParamsQuery>();
    const fromSchema: ListSearch = parseListParams("?page=2");
    const fromUrl: ListParamsQuery = search;
    void [fromSchema, fromUrl];
  });

  it("types page and perPage as numbers", () => {
    expectTypeOf(search.page).toEqualTypeOf<number | undefined>();
    expectTypeOf(search.perPage).toEqualTypeOf<number | undefined>();
  });

  it("types order as the two wire directions", () => {
    expectTypeOf(search.order).toEqualTypeOf<"ASC" | "DESC" | undefined>();
  });

  it("types sort as a field name", () => {
    expectTypeOf(search.sort).toEqualTypeOf<string | undefined>();
  });

  it("types filter and displayedFilters as the loose list params do, keys open", () => {
    expectTypeOf(search.filter).toEqualTypeOf<FilterPayload | undefined>();
    expectTypeOf(search.displayedFilters).toEqualTypeOf<
      DisplayedFilters | undefined
    >();
    expectTypeOf<FilterPayload>().toEqualTypeOf<{
      [key: string]: unknown;
    }>();
  });
});

describe("listSearchSchema.extend", () => {
  it("keeps the list keys and types the app's own", () => {
    expectTypeOf(tabbed.tab).toEqualTypeOf<string>();
    expectTypeOf(tabbed.page).toEqualTypeOf<number | undefined>();
    expectTypeOf(tabbed.order).toEqualTypeOf<"ASC" | "DESC" | undefined>();
    const asQuery: ListParamsQuery = tabbed;
    void asQuery;
  });
});
