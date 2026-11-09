import { describe, expectTypeOf, it } from "vitest";
import type { FilterPayload } from "../data/types";
import {
  filterFormReflectShape,
  getFilterFormValues,
  mergeFilterValues,
} from "./filter-form-values";

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
  it("takes and returns a FilterPayload of the record", () => {
    const values = getFilterFormValues<Post>(
      { title_gte: "", q: undefined },
      { title_gte: "A", q: "x" },
    );
    expectTypeOf(values).toEqualTypeOf<FilterPayload<Post>>();
    // @ts-expect-error titel_gte is not a Post filter key
    getFilterFormValues<Post>({ titel_gte: "" }, {});
    // @ts-expect-error titel_gte is not a Post filter key
    getFilterFormValues<Post>({}, { titel_gte: "A" });
  });

  it("keeps bare form values on the default payload", () => {
    const values = getFilterFormValues({ custom: "" }, { status: "draft" });
    expectTypeOf(values).toEqualTypeOf<FilterPayload>();
  });
});

describe("filterFormReflectShape", () => {
  it("takes and returns a FilterPayload of the record, with open field metadata", () => {
    const shape = filterFormReflectShape<Post>(
      { title_gte: "" },
      { "formOnly.nested": {} },
      { title_gte: "A", q: "x" },
    );
    expectTypeOf(shape).toEqualTypeOf<FilterPayload<Post>>();
    // @ts-expect-error titel_gte is not a Post filter key
    filterFormReflectShape<Post>({ titel_gte: "" }, {}, {});
    // @ts-expect-error titel_gte is not a Post filter key
    filterFormReflectShape<Post>({}, {}, { titel_gte: "A" });
  });
});
