/**
 * P7a-T1 type tests: `useRecordContext` / `useFieldValue` generics.
 *
 * Verifies the record generic threads through and the results are typed:
 * - `useRecordContext<Post>()` → `Post | undefined`;
 * - `useFieldValue` returns the value type at its `source` path: inferred from
 *   a typed `record` prop and the literal `source`, `unknown` for the default
 *   `LooseRecord`, and the union of the record's value types when only the
 *   record type is given (TypeScript infers no path from a partial list).
 */

import type { LooseRecord } from "@chelone/core";
import { assertType, describe, expectTypeOf, it } from "vitest";
import { useRecordContext } from "./record-context";
import { useFieldValue } from "./use-field-value";

interface Post {
  id: number;
  title: string;
  author: { name: string };
}

describe("useRecordContext types", () => {
  it("returns RecordType | undefined", () => {
    const record = useRecordContext<Post>();
    assertType<Post | undefined>(record);
  });

  it("defaults to LooseRecord | undefined", () => {
    const record = useRecordContext();
    assertType<LooseRecord | undefined>(record);
  });

  it("accepts a record prop of the same type", () => {
    const record = useRecordContext<Post>({
      record: { id: 1, title: "x", author: { name: "a" } },
    });
    assertType<Post | undefined>(record);
  });
});

describe("useFieldValue types", () => {
  it("accepts a source string and an optional defaultValue", () => {
    const value = useFieldValue({ source: "title" });
    assertType<unknown>(value);
  });

  it("accepts a typed record and a defaultValue", () => {
    const value = useFieldValue<Post>({
      source: "title",
      record: { id: 1, title: "x", author: { name: "a" } },
      defaultValue: "fallback",
    });
    assertType<unknown>(value);
  });
});

describe("useFieldValue value typing", () => {
  const post: Post = { id: 1, title: "x", author: { name: "a" } };

  it("useFieldValue with a typed record infers the value type from the source", () => {
    expectTypeOf(
      useFieldValue({ source: "title", record: post }),
    ).toEqualTypeOf<string>();
    expectTypeOf(
      useFieldValue({ source: "author.name", record: post }),
    ).toEqualTypeOf<string>();
  });

  it("useFieldValue rejects a source that is not a path of the record", () => {
    // @ts-expect-error "titel" is not a path of Post
    useFieldValue({ source: "titel", record: post });
  });

  it("useFieldValue with the default LooseRecord returns unknown", () => {
    expectTypeOf(useFieldValue({ source: "anything" })).toBeUnknown();
  });

  it("useFieldValue<Post> returns the union of Post's value types", () => {
    const value = useFieldValue<Post>({ source: "title" });
    expectTypeOf(value).toEqualTypeOf<number | string | { name: string }>();
  });
});
