/**
 * Type tests for `<NumberField>`'s `transform`: it returns what the field
 * renders as text (a number or a string), never `unknown`. A generic SFC is a
 * function whose first parameter is its props, so the tests read it with
 * `Parameters`.
 */

import { describe, expectTypeOf, it } from "vitest";
import type NumberField from "./number-field.vue";

type Props = Parameters<typeof NumberField>[0];
type NumberTransform = NonNullable<Props["transform"]>;

describe("NumberField transform types", () => {
  it("returns a number or a string, or nothing", () => {
    expectTypeOf<ReturnType<NumberTransform>>().toEqualTypeOf<
      number | string | null | undefined
    >();
  });

  it("rejects a transform that returns a value the field cannot render", () => {
    const transform = (): Date => new Date(0);
    const props: Props = {
      source: "views",
      // @ts-expect-error a Date is not text the field can render
      transform,
    };
    expectTypeOf(props).toMatchTypeOf<Props>();
  });
});
