/**
 * Type tests: an `interface` is a legal record for these Vue fields. It has no
 * index signature, so a `LooseRecord` bound would refuse it.
 */

import { expectTypeOf, it } from "vitest";
import type { CurrencyFieldProps } from "./currency-field.vue";
import type { DateFieldProps } from "./date-field.vue";
import type { DiffViewerProps } from "./diff-viewer.vue";
import type { DurationFieldProps } from "./duration-field.vue";
import type { EmailFieldProps } from "./email-field.vue";
import type { FileFieldProps } from "./file-field.vue";

interface Article {
  id: string;
  headline: string;
}

type SourceOf<TProps extends { source: string }> = TProps["source"];

it("takes an interface as the record and checks its sources", () => {
  expectTypeOf<"headline">().toMatchTypeOf<
    SourceOf<CurrencyFieldProps<Article>>
  >();
  expectTypeOf<"headline">().toMatchTypeOf<SourceOf<DateFieldProps<Article>>>();
  expectTypeOf<"headline">().toMatchTypeOf<
    SourceOf<DurationFieldProps<Article>>
  >();
  expectTypeOf<"headline">().toMatchTypeOf<
    SourceOf<EmailFieldProps<Article>>
  >();
  expectTypeOf<"headline">().toMatchTypeOf<SourceOf<FileFieldProps<Article>>>();
  expectTypeOf<DiffViewerProps<Article>["after"]>().toEqualTypeOf<Article>();
});

it("refuses a record without an id", () => {
  interface Untitled {
    headline: string;
  }
  // @ts-expect-error a record needs an id
  expectTypeOf<DiffViewerProps<Untitled>>().toBeObject();
});
