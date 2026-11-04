import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { ChoiceInputBaseProps } from "./choice-input-props";
import type { UseChoiceInputOptions } from "./use-choice-input";

describe("ChoiceInputBaseProps", () => {
  it("ChoiceInputBaseProps source is SourceProp or undefined", () => {
    expectTypeOf<ChoiceInputBaseProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<UseChoiceInputOptions["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });
});
