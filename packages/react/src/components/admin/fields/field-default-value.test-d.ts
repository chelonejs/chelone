/**
 * A generic field's value-taking props are typed by the record: `defaultValue`
 * and a date or number `transform` take `SourceValue<RecordType, SourceProp<RecordType>>`,
 * and a field with no type argument still takes any value.
 */

import type { SourceProp, SourceValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { ApiKeyFieldProps } from "./api-key-field";
import type { BadgeFieldProps } from "./badge-field";
import type { BooleanFieldProps } from "./boolean-field";
import type { ChipFieldProps } from "./chip-field";
import type { ColorFieldProps } from "./color-field";
import type { CronFieldProps } from "./cron-field";
import type { CurrencyFieldProps } from "./currency-field";
import type { DateFieldProps } from "./date-field";
import type { DurationFieldProps } from "./duration-field";
import type { EmailFieldProps } from "./email-field";
import type { FileFieldProps } from "./file-field";
import type { ImageFieldProps } from "./image-field";
import type { JsonFieldProps } from "./json-field";
import type { NumberFieldProps } from "./number-field";
import type { PhoneFieldProps } from "./phone-field";
import type { RatingFieldProps } from "./rating-field";
import type { TextFieldProps } from "./text-field";

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

  it("TextField, DateField and NumberField defaultValue are the record's value type, not the HTML attribute's", () => {
    expectTypeOf<TextFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<DateFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<NumberFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
  });

  it("the twelve value-reading fields take the record's value type as defaultValue", () => {
    expectTypeOf<ApiKeyFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<BadgeFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<ChipFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<ColorFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<CronFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<CurrencyFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<DurationFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<EmailFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<FileFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<JsonFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<PhoneFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
      PostValue | undefined
    >();
    expectTypeOf<RatingFieldProps<Post>["defaultValue"]>().toEqualTypeOf<
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
