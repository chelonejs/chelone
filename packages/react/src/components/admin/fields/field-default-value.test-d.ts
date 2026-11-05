/**
 * A generic field's value-taking props are typed by the record: `defaultValue`
 * and a date or number `transform` take `SourceValue<RecordType, SourceProp<RecordType>>`,
 * and a field with no type argument still takes any value.
 */

import type { SourceProp, SourceValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { BooleanFieldProps } from "./boolean-field";
import type { DateFieldProps } from "./date-field";
import type { ImageFieldProps } from "./image-field";
import type { NumberFieldProps } from "./number-field";

type Post = {
  id: number;
  title: string;
  published: boolean;
};

type PostValue = SourceValue<Post, SourceProp<Post>>;

describe("value-taking field props", () => {
  it("BooleanField defaultValue is the record's value type", () => {
    expectTypeOf<BooleanFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
  });

  it("ImageField defaultValue is the record's value type", () => {
    expectTypeOf<ImageFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
  });

  it("rejects a defaultValue the record cannot hold", () => {
    const ok: BooleanFieldProps<Post> = {
      source: "published",
      defaultValue: true,
    };
    expectTypeOf(ok).toMatchTypeOf<BooleanFieldProps<Post>>();

    const bad: BooleanFieldProps<Post> = {
      source: "published",
      // @ts-expect-error an object is not one of Post's value types
      defaultValue: {},
    };
    expectTypeOf(bad).toMatchTypeOf<BooleanFieldProps<Post>>();
  });

  it("DateField transform takes the record's value type", () => {
    expectTypeOf<
      Parameters<NonNullable<DateFieldProps<Post>["transform"]>>[0]
    >().toEqualTypeOf<PostValue>();
  });

  it("NumberField transform takes the record's value type", () => {
    expectTypeOf<
      Parameters<NonNullable<NumberFieldProps<Post>["transform"]>>[0]
    >().toEqualTypeOf<PostValue>();
  });

  it("a transform written against unknown still fits", () => {
    // type-escape: a transform that accepts anything must still fit the typed prop
    const transform = (value: unknown): Date | undefined =>
      typeof value === "string" ? new Date(value) : undefined;
    const props: DateFieldProps<Post> = { source: "title", transform };
    expectTypeOf(props).toMatchTypeOf<DateFieldProps<Post>>();
  });

  it("BooleanField with no type argument takes any defaultValue", () => {
    const props: BooleanFieldProps = { source: "anything", defaultValue: {} };
    expectTypeOf(props).toMatchTypeOf<BooleanFieldProps>();
  });
});
