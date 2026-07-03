import type { FilterPayload } from "@chelone/core";
import { expectTypeOf, it } from "vitest";
import type {
  FilterLiveFormProps,
  ListContextValue,
  UseFilterFormOptions,
  UseFilterFormResult,
} from "./filter-live-form";
import { getFilterFormValues, useFilterForm } from "./filter-live-form";

it("useFilterForm accepts optional resource + debounce and returns the form surface", () => {
  expectTypeOf<UseFilterFormOptions>().toMatchTypeOf<{
    resource?: string;
    debounce?: number;
  }>();
  const result = {} as UseFilterFormResult;
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
  const value = {} as ListContextValue;
  // Only `filter` + `setFilters` are load-bearing for FilterLiveForm.
  expectTypeOf(value.filter).toEqualTypeOf<FilterPayload>();
  expectTypeOf(value.setFilters).toBeFunction();
});

it("getFilterFormValues maps a form-values record to an all-keys-present record", () => {
  expectTypeOf(getFilterFormValues).returns.toEqualTypeOf<
    Record<string, unknown>
  >();
});
