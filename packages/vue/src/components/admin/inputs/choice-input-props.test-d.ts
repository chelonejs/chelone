import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { ChoiceInputBaseProps } from "./choice-input-props";
import {
  type UseChoiceInputOptions,
  type UseChoiceInputResult,
  useChoiceInput,
} from "./use-choice-input";

// A `type`, not an `interface`: only a type alias satisfies `ChoiceRecord`.
type Author = { id: number; name: string; address: { city: string } };

describe("ChoiceInputBaseProps", () => {
  it("ChoiceInputBaseProps source is SourceProp or undefined", () => {
    expectTypeOf<ChoiceInputBaseProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<UseChoiceInputOptions["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("ChoiceInputBaseProps<Author> takes the paths of Author", () => {
    expectTypeOf<ChoiceInputBaseProps<Author>["optionValue"]>().toEqualTypeOf<
      "id" | "name" | "address" | "address.city" | undefined
    >();
    expectTypeOf<ChoiceInputBaseProps<Author>["choices"]>().toEqualTypeOf<
      readonly (string | Author)[] | undefined
    >();
    // @ts-expect-error `nme` is not a path of Author
    const props: ChoiceInputBaseProps<Author> = { optionText: "nme" };
    void props;
  });

  it("useChoiceInput<Author> checks the paths and gives accessors that take an Author", () => {
    const input = useChoiceInput<Author>({
      componentName: "Test",
      optionText: "address.city",
      optionValue: "id",
      disableValue: "name",
    });
    expectTypeOf(input).toEqualTypeOf<UseChoiceInputResult<Author>>();
    expectTypeOf(input.getChoiceText).parameter(0).toEqualTypeOf<Author>();
    // @ts-expect-error `nme` is not a path of Author
    useChoiceInput<Author>({ componentName: "Test", optionText: "nme" });
  });

  it("useChoiceInput without a type argument takes any string", () => {
    useChoiceInput({ componentName: "Test", optionValue: "anyKey" });
  });
});
