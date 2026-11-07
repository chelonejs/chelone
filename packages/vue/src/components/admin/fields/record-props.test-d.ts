/**
 * Type tests for the record-taking display fields: each takes a record typed by
 * an interface, not only a `LooseRecord`, and keeps that record's type in its
 * props instead of widening it. A record with no `id` stays a type error.
 */

import { assertType, describe, expectTypeOf, it } from "vitest";
import type { FunctionFieldProps } from "./function-field.vue";
import type { ImageFieldProps } from "./image-field.vue";
import type { JsonFieldProps } from "./json-field.vue";
import type { NumberFieldProps } from "./number-field.vue";
import type { PhoneFieldProps } from "./phone-field.vue";
import type { RecordFieldProps } from "./record-field.vue";

interface Post {
  id: number;
  title: string;
  views: number;
}

const post: Post = { id: 1, title: "Hello", views: 3 };

describe("record field records", () => {
  it("each field takes a record typed by an interface", () => {
    assertType<FunctionFieldProps<Post>>({ record: post });
    assertType<ImageFieldProps<Post>>({ source: "title", record: post });
    assertType<JsonFieldProps<Post>>({ source: "title", record: post });
    assertType<NumberFieldProps<Post>>({ source: "views", record: post });
    assertType<PhoneFieldProps<Post>>({ source: "title", record: post });
    assertType<RecordFieldProps<Post>>({ source: "title", record: post });
  });

  it("a field keeps the interface record, not LooseRecord", () => {
    expectTypeOf<FunctionFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<ImageFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<JsonFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<NumberFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<PhoneFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<RecordFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
  });

  it("a field rejects a record with no id", () => {
    // @ts-expect-error a record has an id
    assertType<ImageFieldProps>({ source: "title", record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<JsonFieldProps>({ source: "title", record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<NumberFieldProps>({ source: "views", record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<PhoneFieldProps>({ source: "title", record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<RecordFieldProps>({ source: "title", record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<FunctionFieldProps>({ record: { title: "x" } });
  });
});
