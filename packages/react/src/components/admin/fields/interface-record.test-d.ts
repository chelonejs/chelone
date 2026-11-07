/**
 * Type tests: these fields take an `interface` as their record. An interface
 * has no index signature, so a `LooseRecord` bound would refuse it.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { CurrencyFieldProps } from "./currency-field";
import type { DateFieldProps } from "./date-field";
import type { DiffViewerProps } from "./diff-viewer";
import type { DurationFieldProps } from "./duration-field";
import type { EmailFieldProps } from "./email-field";
import type { FileFieldProps } from "./file-field";

interface Post {
  id: number;
  title: string;
}

describe("fields bound their record by ResourceRecord", () => {
  it("accept an interface as the record", () => {
    expectTypeOf<"title">().toMatchTypeOf<CurrencyFieldProps<Post>["source"]>();
    expectTypeOf<"title">().toMatchTypeOf<DateFieldProps<Post>["source"]>();
    expectTypeOf<"title">().toMatchTypeOf<DurationFieldProps<Post>["source"]>();
    expectTypeOf<"title">().toMatchTypeOf<EmailFieldProps<Post>["source"]>();
    expectTypeOf<"title">().toMatchTypeOf<FileFieldProps<Post>["source"]>();
    expectTypeOf<DiffViewerProps<Post>["before"]>().toEqualTypeOf<Post>();
  });

  it("refuse a record with no id", () => {
    interface NoId {
      title: string;
    }
    // @ts-expect-error a record needs an id
    expectTypeOf<DiffViewerProps<NoId>>().toBeObject();
  });
});
