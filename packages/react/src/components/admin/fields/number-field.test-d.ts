/**
 * Type tests for `<NumberField>`'s `transform`: it returns what the field
 * renders as text (a number or a string), never `unknown`.
 */

import type { SourceProp, SourceValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { NumberFieldProps } from "./number-field";

type Post = {
  id: number;
  views: number;
  price: string;
};

type NumberTransform = NonNullable<NumberFieldProps<Post>["transform"]>;

describe("NumberField transform types", () => {
  it("returns a number or a string, or nothing", () => {
    expectTypeOf<ReturnType<NumberTransform>>().toEqualTypeOf<
      number | string | null | undefined
    >();
  });

  it("takes the record's value type", () => {
    expectTypeOf<Parameters<NumberTransform>[0]>().toEqualTypeOf<
      SourceValue<Post, SourceProp<Post>>
    >();
  });

  it("rejects a transform that returns a value the field cannot render", () => {
    const transform = (): Date => new Date(0);
    const props: NumberFieldProps<Post> = {
      source: "views",
      // @ts-expect-error a Date is not text the field can render
      transform,
    };
    expectTypeOf(props).toMatchTypeOf<NumberFieldProps<Post>>();
  });
});
