import { describe, expectTypeOf, it } from "vitest";
import type { FilterPayload } from "../data/types";
import { isFilterSelected, toggleFilterValue } from "./filter-toggle";

interface Post {
  id: number;
  title: string;
}

describe("isFilterSelected", () => {
  it("checks both filters against the record's filter keys", () => {
    expectTypeOf(
      isFilterSelected<Post>({ title_gte: "A" }, { title_gte: "A", q: "x" }),
    ).toEqualTypeOf<boolean>();
    // @ts-expect-error titel_gte is not a Post filter key
    isFilterSelected<Post>({ titel_gte: "A" }, {});
    // @ts-expect-error titel_gte is not a Post filter key
    isFilterSelected<Post>({}, { titel_gte: "A" });
  });

  it("accepts bare object literals and assigns to a bare filter callback", () => {
    expectTypeOf(
      isFilterSelected({ status: "draft" }, { status: "draft" }),
    ).toEqualTypeOf<boolean>();
    expectTypeOf(isFilterSelected).toExtend<
      (value: FilterPayload, filters: FilterPayload) => boolean
    >();
  });
});

describe("toggleFilterValue", () => {
  it("checks both filters and returns the record's filter payload", () => {
    const filter = toggleFilterValue<Post>(
      { title_gte: "A" },
      { title_gte: "A", q: "x" },
    );
    expectTypeOf(filter).toEqualTypeOf<FilterPayload<Post>>();
    // @ts-expect-error titel_gte is not a Post filter key
    toggleFilterValue<Post>({ titel_gte: "A" }, {});
    // @ts-expect-error titel_gte is not a Post filter key
    toggleFilterValue<Post>({}, { titel_gte: "A" });
  });

  it("keeps bare calls and filter callbacks on the default payload", () => {
    const filter = toggleFilterValue({ status: "draft" }, { q: "x" });
    expectTypeOf(filter).toEqualTypeOf<FilterPayload>();
    expectTypeOf(toggleFilterValue).toExtend<
      (value: FilterPayload, filters: FilterPayload) => FilterPayload
    >();
  });
});
