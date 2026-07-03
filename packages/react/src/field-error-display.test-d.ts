import type { TranslatableMessage } from "@chelone/core";
import type { ComponentProps } from "react";
import { describe, expectTypeOf, it } from "vitest";
import {
  normalizeFieldError,
  useFieldError,
  type ValidationError,
  type ValidationErrorProps,
} from "./field-error-display";
import type { UseInputResult } from "./form-hooks";

type FieldError = string | TranslatableMessage | undefined;

describe("field-error-display types (P7a-T3 error-shape parity)", () => {
  it("useFieldError accepts and returns the chelone field-error union", () => {
    expectTypeOf(useFieldError).parameter(0).toEqualTypeOf<FieldError>();
    expectTypeOf(useFieldError).returns.toEqualTypeOf<FieldError>();
  });

  it("useFieldError consumes exactly useInput(...).fieldState.error", () => {
    // The whole point of the compat layer: the value useInput hands back is a
    // legal useFieldError input with no cast.
    type InputError = UseInputResult["fieldState"]["error"];
    expectTypeOf<InputError>().toMatchTypeOf<
      Parameters<typeof useFieldError>[0]
    >();
  });

  it("normalizeFieldError shares the field-error union signature", () => {
    expectTypeOf(normalizeFieldError).parameter(0).toEqualTypeOf<FieldError>();
    expectTypeOf(normalizeFieldError).returns.toEqualTypeOf<FieldError>();
  });

  it("ValidationError takes a string | TranslatableMessage error prop", () => {
    expectTypeOf<ValidationErrorProps["error"]>().toEqualTypeOf<
      string | TranslatableMessage | undefined
    >();
    expectTypeOf<
      ComponentProps<typeof ValidationError>["error"]
    >().toEqualTypeOf<string | TranslatableMessage | undefined>();
  });
});
