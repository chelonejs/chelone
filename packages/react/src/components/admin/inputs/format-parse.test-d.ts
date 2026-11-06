/**
 * `InputProps` types `format` and `parse` by the value at `source`. Each input
 * carries that pair as far as its own `source` lets it: an input that resolves
 * `source` from a choices context (a reference wrapper hands it over as a plain
 * string) keeps `format` loose, and so does an editor input, which supplies its
 * own default transform over the text it edits.
 */

import { defineResources, type RecordOf } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { MdxInputProps } from "../../mdx-editor/mdx-input";
import type { MonacoJsonInputProps } from "../../monaco/monaco-json-input";
import type { AutocompleteArrayInputProps } from "./autocomplete-array-input";
import type { AutocompleteInputProps } from "./autocomplete-input";
import type { CheckboxGroupInputProps } from "./checkbox-group-input";
import type { CurrencyInputProps } from "./currency-input";
import type { DatagridInputProps } from "./datagrid-input";
import type { DurationInputProps } from "./duration-input";
import type { RatingInputProps } from "./rating-input";
import type { SelectArrayInputProps } from "./select-array-input";
import type { SubscriptionPlanPickerProps } from "./subscription-plan-picker";

const resources = defineResources({
  posts: {
    schema: z.object({
      title: z.string(),
      views: z.number(),
      rating: z.number(),
      published_at: z.string(),
      tag_ids: z.array(z.number()),
    }),
  },
});

type Post = RecordOf<typeof resources, "posts">;

declare function acceptCurrency(props: CurrencyInputProps<Post, "views">): void;
declare function acceptRating(props: RatingInputProps<Post, "rating">): void;
declare function acceptDuration(
  props: DurationInputProps<Post, "published_at">,
): void;
declare function acceptPlan(
  props: SubscriptionPlanPickerProps<Post, "title">,
): void;
declare function acceptAutocomplete(
  props: AutocompleteInputProps<Post, "tag_ids">,
): void;
declare function acceptMdx(props: MdxInputProps<Post>): void;
declare function acceptCurrencyFilter(
  props: CurrencyInputProps<Post, "views_gte">,
): void;

describe("InputProps format and parse by source", () => {
  it("an input that names its source types format by the value at it", () => {
    expectTypeOf<Required<CurrencyInputProps<Post, "views">>["format"]>()
      .parameter(0)
      .toEqualTypeOf<number | undefined>();
    expectTypeOf<Required<RatingInputProps<Post, "rating">>["format"]>()
      .parameter(0)
      .toEqualTypeOf<number | undefined>();
    expectTypeOf<Required<DurationInputProps<Post, "published_at">>["format"]>()
      .parameter(0)
      .toEqualTypeOf<string | undefined>();
    expectTypeOf<
      Required<SubscriptionPlanPickerProps<Post, "title">>["format"]
    >()
      .parameter(0)
      .toEqualTypeOf<string | undefined>();

    acceptCurrency({ source: "views", format: (value) => value?.toFixed(0) });
    acceptDuration({
      source: "published_at",
      format: (value) => value?.trim(),
    });
    // @ts-expect-error `views` holds a number, not a string
    acceptCurrency({ source: "views", format: (value: string) => value });
  });

  it("an input that names its source types parse to return the value at it", () => {
    expectTypeOf<
      Required<CurrencyInputProps<Post, "views">>["parse"]
    >().returns.toEqualTypeOf<number>();
    expectTypeOf<
      Required<SubscriptionPlanPickerProps<Post, "title">>["parse"]
    >().returns.toEqualTypeOf<string>();
    acceptCurrency({ source: "views", parse: (value) => Number(value) });
    acceptPlan({ source: "title", plans: [], parse: (value) => String(value) });
    // @ts-expect-error `title` holds a string, not a number
    acceptPlan({ source: "title", plans: [], parse: () => 1 });
  });

  it("a choice input keeps format loose: its source can arrive as a plain string", () => {
    expectTypeOf<Required<AutocompleteInputProps<Post, "tag_ids">>["format"]>()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<
      Required<AutocompleteArrayInputProps<Post, "tag_ids">>["format"]
    >()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<Required<CheckboxGroupInputProps<Post, "tag_ids">>["format"]>()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<Required<SelectArrayInputProps<Post, "tag_ids">>["format"]>()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<Required<DatagridInputProps<Post>>["format"]>()
      .parameter(0)
      .toBeUnknown();
    acceptAutocomplete({ source: "tag_ids", format: (value) => value });
  });

  it("a choice input still types parse to return the value at its source", () => {
    expectTypeOf<
      Required<CheckboxGroupInputProps<Post, "tag_ids">>["parse"]
    >().returns.toEqualTypeOf<number[]>();
    expectTypeOf<
      Required<DatagridInputProps<Post>>["parse"]
    >().returns.not.toBeUnknown();
    // @ts-expect-error `tag_ids` holds numbers, not strings
    acceptAutocomplete({ source: "tag_ids", parse: () => ["one"] });
  });

  it("an editor input keeps format loose and parse source-typed", () => {
    expectTypeOf<Required<MdxInputProps<Post>>["format"]>()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<
      Required<MdxInputProps<Post>>["parse"]
    >().returns.not.toBeUnknown();
    expectTypeOf<Required<MonacoJsonInputProps<Post>>["format"]>()
      .parameter(0)
      .toBeUnknown();
    acceptMdx({ source: "title", format: (value) => value });
    // @ts-expect-error no path of a post holds a boolean
    acceptMdx({ source: "title", parse: () => true });
  });

  it("a filter key as source keeps both transforms loose", () => {
    // `views_gte` is a legal source in a filter, but it is not a path of Post, so
    // the transforms over it stay `unknown` rather than demanding an unwritable
    // `never`.
    expectTypeOf<Required<CurrencyInputProps<Post, "views_gte">>["format"]>()
      .parameter(0)
      .toBeUnknown();
    expectTypeOf<
      Required<CurrencyInputProps<Post, "views_gte">>["parse"]
    >().returns.toBeUnknown();
    acceptCurrencyFilter({
      source: "views_gte",
      format: (value) => String(value),
      parse: (value) => Number(value),
    });
  });
});
