import { describe, expectTypeOf, it } from "vitest";
import type {
  ChoiceRecord,
  ChoicesContextValue,
  UseChoicesResult,
  UseReferenceInputResult,
} from "./choices-hooks";

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

  it("UseChoicesResult carries the three accessors", () => {
    expectTypeOf<UseChoicesResult["getChoiceText"]>().toEqualTypeOf<
      (choice: ChoiceRecord) => string
    >();
    expectTypeOf<UseChoicesResult["getChoiceValue"]>().toEqualTypeOf<
      (choice: ChoiceRecord) => unknown
    >();
    expectTypeOf<UseChoicesResult>().not.toBeAny();
  });

  it("UseReferenceInputResult is a ChoicesContextValue", () => {
    expectTypeOf<UseReferenceInputResult>().toEqualTypeOf<ChoicesContextValue>();
  });
});
