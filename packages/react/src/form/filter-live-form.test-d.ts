import type { FilterPayload, ResourceRecord } from "@chelone/core";
import { expectTypeOf, it } from "vitest";
import type {
  FilterLiveFormProps,
  ListContextValue,
  UseFilterFormOptions,
  UseFilterFormResult,
} from "./filter-live-form";
import {
  getFilterFormValues,
  useFilterForm,
  useListContext,
} from "./filter-live-form";

declare const result: UseFilterFormResult;
declare const value: ListContextValue;

it("useFilterForm accepts optional resource + debounce and returns the form surface", () => {
  expectTypeOf<UseFilterFormOptions>().toMatchTypeOf<{
    resource?: string;
    debounce?: number;
  }>();
  // The result exposes the form (for the provider) and validity gate signal.
  expectTypeOf(result.form).not.toBeAny();
  expectTypeOf(result.canSubmit).toBeBoolean();
});

it("useFilterForm is callable with no arguments", () => {
  expectTypeOf(useFilterForm)
    .parameter(0)
    .toEqualTypeOf<UseFilterFormOptions | undefined>();
});

it("FilterLiveFormProps carries children + optional resource/debounce", () => {
  expectTypeOf<FilterLiveFormProps>().toMatchTypeOf<{
    resource?: string;
    debounce?: number;
  }>();
});

it("ListContextValue carries the list filter surface FilterLiveForm reads", () => {
  // Only `filter` + `setFilters` are load-bearing for FilterLiveForm.
  expectTypeOf(value.filter).toEqualTypeOf<FilterPayload>();
  expectTypeOf(value.setFilters).toBeFunction();
});

it("getFilterFormValues maps a filter payload to an all-keys-present filter payload", () => {
  expectTypeOf(getFilterFormValues).returns.toEqualTypeOf<FilterPayload>();
});

it("useListContext types its rows from the generic", () => {
  interface Post extends ResourceRecord {
    title: string;
  }
  expectTypeOf(useListContext<Post>().data).toEqualTypeOf<Post[] | undefined>();
  expectTypeOf(useListContext().data).toEqualTypeOf<
    ResourceRecord[] | undefined
  >();
});
