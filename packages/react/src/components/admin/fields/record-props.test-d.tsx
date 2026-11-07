/**
 * Type tests for the record-taking display fields: each takes a record typed by
 * an interface, not only a `LooseRecord`, and keeps that record's type in its
 * props instead of widening it. A record with no `id` stays a type error.
 */

import { describe, expectTypeOf, it } from "vitest";
import { FunctionField, type FunctionFieldProps } from "./function-field";
import { ImageField, type ImageFieldProps } from "./image-field";
import { JsonField, type JsonFieldProps } from "./json-field";
import { NumberField, type NumberFieldProps } from "./number-field";
import { PhoneField, type PhoneFieldProps } from "./phone-field";
import { RecordField, type RecordFieldProps } from "./record-field";

interface Post {
  id: number;
  title: string;
  views: number;
}

declare const post: Post;

describe("record field records", () => {
  it("each field takes a record typed by an interface", () => {
    expectTypeOf(
      <FunctionField record={post} render={(r) => r.title} />,
    ).not.toBeAny();
    expectTypeOf(<ImageField source="title" record={post} />).not.toBeAny();
    expectTypeOf(<JsonField source="title" record={post} />).not.toBeAny();
    expectTypeOf(<NumberField source="views" record={post} />).not.toBeAny();
    expectTypeOf(<PhoneField source="title" record={post} />).not.toBeAny();
    expectTypeOf(<RecordField source="title" record={post} />).not.toBeAny();
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

  it("FunctionField's render sees the interface record", () => {
    // @ts-expect-error Post has no "views2"
    <FunctionField record={post} render={(r) => r.views2} />;
  });

  it("a field rejects a record with no id", () => {
    // @ts-expect-error a record has an id
    const badImage = <ImageField source="title" record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    const badJson = <JsonField source="title" record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    const badNumber = <NumberField source="views" record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    const badPhone = <PhoneField source="title" record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    const badRecord = <RecordField source="title" record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    const badFn = <FunctionField record={{ t: 1 }} render={() => null} />;

    void [badImage, badJson, badNumber, badPhone, badRecord, badFn];
  });
});
