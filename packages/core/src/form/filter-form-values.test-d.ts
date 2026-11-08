import { describe, expectTypeOf, it } from "vitest";
import type { FilterPayload } from "../data/types";
import { getFilterFormValues, mergeFilterValues } from "./filter-form-values";

interface Post {
  id: number;
  title: string;
}

describe("mergeFilterValues", () => {
  it("checks filter and form values against the record's filter keys", () => {
    const filter = mergeFilterValues<Post>({ q: "x" }, { title_gte: "A" });
    expectTypeOf(filter).toEqualTypeOf<FilterPayload<Post>>();
    // @ts-expect-error titel_gte is not a Post filter key
    mergeFilterValues<Post>({ titel_gte: "A" }, {});
    // @ts-expect-error form input sources must be Post filter keys too
    mergeFilterValues<Post>({}, { titel_gte: "A" });
  });

  it("keeps bare form merges on the default payload", () => {
    const filter = mergeFilterValues({ status: "draft" }, { custom: true });
    expectTypeOf(filter).toEqualTypeOf<FilterPayload>();
  });
});

describe("getFilterFormValues", () => {
  it("checks filter keys while keeping the form-values map open", () => {
    const values = getFilterFormValues<Post>(
      { title_gte: "", formOnly: undefined },
      { title_gte: "A", q: "x" },
    );
    expectTypeOf(values.formOnly).toBeUnknown();
    // @ts-expect-error titel_gte is not a Post filter key
    getFilterFormValues<Post>({}, { titel_gte: "A" });
  });
});
