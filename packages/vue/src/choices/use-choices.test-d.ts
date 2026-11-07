import { describe, expectTypeOf, it } from "vitest";
import type { ChoicesContextValue } from "./choices-context";
import {
  type ChoiceRecord,
  type UseChoicesResult,
  useChoices,
} from "./use-choices";

// A `type`, not an `interface`: only a type alias satisfies `ChoiceRecord`.
type Author = {
  id: string;
  penName: string;
  retired: boolean;
  publisher: { country: string };
};

describe("useChoices option types", () => {
  it("useChoices<Author> accepts a path of Author for optionText, optionValue and disableValue", () => {
    const choices = useChoices<Author>({
      optionText: "publisher.country",
      optionValue: "id",
      disableValue: "retired",
    });
    expectTypeOf(choices).toEqualTypeOf<UseChoicesResult<Author>>();
  });

  it("getDisableValue returns boolean", () => {
    expectTypeOf<
      ReturnType<UseChoicesResult<Author>["getDisableValue"]>
    >().toEqualTypeOf<boolean>();
  });

  it("useChoices<Author> rejects a path that is not on Author", () => {
    // @ts-expect-error `penname` is not a path of Author
    useChoices<Author>({ optionText: "penname" });
    // @ts-expect-error `uid` is not a path of Author
    useChoices<Author>({ optionValue: "uid" });
    // @ts-expect-error `retire` is not a path of Author
    useChoices<Author>({ disableValue: "retire" });
  });

  it("optionText takes a path of Author", () => {
    const { getChoiceText } = useChoices<Author>({
      optionText: "publisher.country",
    });
    expectTypeOf(getChoiceText).parameter(0).toEqualTypeOf<Author>();
  });

  it("a call with no options keeps the choice type on every accessor", () => {
    const accessors = useChoices<Author>();
    expectTypeOf(accessors).toEqualTypeOf<UseChoicesResult<Author>>();
    expectTypeOf(accessors.getDisableValue).returns.toBeBoolean();
  });

  it("useChoices<Author> accepts an optionText function that takes an Author", () => {
    useChoices<Author>({ optionText: (author) => author.penName });
    useChoices<Author>({
      optionText: (author) => {
        expectTypeOf(author).toEqualTypeOf<Author>();
        return author.publisher.country;
      },
    });
  });

  it("useChoices without a type argument takes any string", () => {
    useChoices({
      optionText: "no.such[0].path",
      optionValue: "anyKey",
      disableValue: "anyFlag",
    });
    expectTypeOf(useChoices()).toEqualTypeOf<UseChoicesResult<ChoiceRecord>>();
  });

  it("the choices error is Error or null", () => {
    expectTypeOf<ChoicesContextValue["error"]>().toEqualTypeOf<Error | null>();
  });
});
