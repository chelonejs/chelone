import type {
  FieldComponentName,
  FieldDescriptor,
  InputComponentName,
} from "@chelone/core";
import type { ReactElement } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { guessFieldElements, guessInputElements } from "./guess-components";

describe("guess-components", () => {
  it("builds a field element for every core field component name", () => {
    expectTypeOf(guessFieldElements).toEqualTypeOf<
      Record<FieldComponentName, (field: FieldDescriptor) => ReactElement>
    >();
  });

  it("builds an input element for every core input component name", () => {
    expectTypeOf(guessInputElements).toEqualTypeOf<
      Record<InputComponentName, (field: FieldDescriptor) => ReactElement>
    >();
  });
});
