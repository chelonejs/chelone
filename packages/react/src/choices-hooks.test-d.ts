import type { ChoiceValueOf, FilterPayload, SortPayload } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import {
  type ChoiceRecord,
  type ChoicesContextValue,
  type UseChoicesResult,
  type UseReferenceInputResult,
  useChoices,
  useChoicesContext,
} from "./choices-hooks";

// A `type`, not an `interface`: only a type alias satisfies `ChoiceRecord`.
type Author = {
  id: number;
  name: string;
  disabled: boolean;
  address: { city: string };
};

describe("choices hook result types", () => {
  it("ChoicesContextValue is the unified reference/inline shape, never any", () => {
    expectTypeOf<ChoicesContextValue["allChoices"]>().toEqualTypeOf<
      ChoiceRecord[]
    >();
    expectTypeOf<ChoicesContextValue["isFromReference"]>().toBeBoolean();
    expectTypeOf<ChoicesContextValue["total"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ChoicesContextValue["setFilters"]>().toEqualTypeOf<
      (filter: Record<string, unknown>, debounce?: boolean) => void
    >();
    expectTypeOf<ChoicesContextValue>().not.toBeAny();
  });

  it("ChoicesContextValue<Post> types sort and filter by Post", () => {
    expectTypeOf<ChoicesContextValue<Author>["sort"]>().toEqualTypeOf<
      SortPayload<Author>
    >();
    expectTypeOf<ChoicesContextValue<Author>["filter"]>().toEqualTypeOf<
      FilterPayload<Author>
    >();
    const ctx = useChoicesContext<Author>();
    ctx.setSort({ field: "name", order: "ASC" });
    ctx.setFilters({ name: "Ada" });
    // @ts-expect-error `nme` is not a path of Author
    ctx.setSort({ field: "nme", order: "ASC" });
    // @ts-expect-error `nme` is not a filter key of Author
    ctx.setFilters({ nme: "Ada" });
  });

  it("a bare ChoicesContextValue still takes any string key", () => {
    const ctx = useChoicesContext();
    ctx.setSort({ field: "anything", order: "DESC" });
    ctx.setFilters({ anything: 1 });
    expectTypeOf<ChoicesContextValue["sort"]>().toEqualTypeOf<
      SortPayload<ChoiceRecord>
    >();
  });

  it("the choices error is Error or null", () => {
    expectTypeOf<ChoicesContextValue["error"]>().toEqualTypeOf<Error | null>();
    expectTypeOf<
      UseReferenceInputResult["error"]
    >().toEqualTypeOf<Error | null>();
  });

  it("UseChoicesResult carries the three accessors", () => {
    expectTypeOf<UseChoicesResult["getChoiceText"]>().toEqualTypeOf<
      (choice: ChoiceRecord) => string
    >();
    expectTypeOf<UseChoicesResult["getChoiceValue"]>().toEqualTypeOf<
      (choice: ChoiceRecord) => ChoiceValueOf<ChoiceRecord>
    >();
    expectTypeOf<UseChoicesResult>().not.toBeAny();
  });

  it("UseReferenceInputResult is a ChoicesContextValue", () => {
    expectTypeOf<UseReferenceInputResult>().toEqualTypeOf<ChoicesContextValue>();
  });

  it("useChoices<Author> accepts a path of Author for optionText, optionValue and disableValue", () => {
    const { getChoiceText, getChoiceValue, getDisableValue } =
      useChoices<Author>({
        optionText: "address.city",
        optionValue: "id",
        disableValue: "disabled",
      });
    expectTypeOf(getChoiceText).parameter(0).toEqualTypeOf<Author>();
    expectTypeOf(getChoiceValue).parameter(0).toEqualTypeOf<Author>();
    expectTypeOf(getDisableValue).parameter(0).toEqualTypeOf<Author>();
  });

  it("getChoiceValue returns the ChoiceValueOf the choice", () => {
    const { getChoiceValue } = useChoices<Author>();
    expectTypeOf(getChoiceValue).returns.toEqualTypeOf<ChoiceValueOf<Author>>();
    expectTypeOf(getChoiceValue).returns.toEqualTypeOf<number>();
  });

  it("getDisableValue returns boolean", () => {
    const { getDisableValue } = useChoices<Author>();
    expectTypeOf(getDisableValue).returns.toEqualTypeOf<boolean>();
  });

  it("useChoices<Author> rejects a path that is not on Author", () => {
    // @ts-expect-error `nme` is not a path of Author
    useChoices<Author>({ optionText: "nme" });
    // @ts-expect-error `ide` is not a path of Author
    useChoices<Author>({ optionValue: "ide" });
    // @ts-expect-error `disabld` is not a path of Author
    useChoices<Author>({ disableValue: "disabld" });
  });

  it("optionText takes a path of Author", () => {
    const accessors = useChoices<Author>({ optionText: "address.city" });
    expectTypeOf(accessors.getChoiceText).parameter(0).toEqualTypeOf<Author>();
  });

  it("a call with no options compiles, with and without a type argument", () => {
    expectTypeOf(useChoices<Author>()).toEqualTypeOf<
      UseChoicesResult<Author>
    >();
    expectTypeOf(useChoices()).toEqualTypeOf<UseChoicesResult<ChoiceRecord>>();
  });

  it("useChoices<Author> accepts an optionText function that takes an Author", () => {
    useChoices<Author>({ optionText: (author) => author.name });
    useChoices<Author>({
      optionText: (author) => {
        expectTypeOf(author).toEqualTypeOf<Author>();
        return author.address.city;
      },
    });
  });

  it("useChoices without a type argument takes any string", () => {
    useChoices({
      optionText: "anything.at[0].all",
      optionValue: "whatever",
      disableValue: "off",
    });
    const { getChoiceText } = useChoices();
    expectTypeOf(getChoiceText).parameter(0).toEqualTypeOf<ChoiceRecord>();
  });

  it("useChoicesContext keeps TChoice", () => {
    const ctx = useChoicesContext<Author>();
    expectTypeOf(ctx.availableChoices).toEqualTypeOf<Author[]>();
    expectTypeOf(ctx.allChoices).toEqualTypeOf<Author[]>();
    expectTypeOf(ctx.selectedChoices).toEqualTypeOf<Author[]>();
    expectTypeOf(useChoicesContext().availableChoices).toEqualTypeOf<
      ChoiceRecord[]
    >();
  });
});
