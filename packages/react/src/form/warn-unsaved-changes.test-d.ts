import { describe, expectTypeOf, it } from "vitest";
import {
  useWarnWhenUnsavedChanges,
  type WarnWhenUnsavedChangesDecision,
} from "./warn-unsaved-changes";

describe("useWarnWhenUnsavedChanges — types", () => {
  it("accepts (enable) and (enable, formRootPathname)", () => {
    expectTypeOf(useWarnWhenUnsavedChanges)
      .parameter(0)
      .toEqualTypeOf<boolean>();
    // formRootPathname is optional.
    expectTypeOf(useWarnWhenUnsavedChanges)
      .parameter(1)
      .toEqualTypeOf<string | undefined>();
  });

  it("returns the headless decision shape", () => {
    expectTypeOf(
      useWarnWhenUnsavedChanges(true),
    ).toEqualTypeOf<WarnWhenUnsavedChangesDecision>();
  });

  it("the decision exposes isBlocked + no-arg proceed/cancel", () => {
    expectTypeOf<
      WarnWhenUnsavedChangesDecision["isBlocked"]
    >().toEqualTypeOf<boolean>();
    expectTypeOf<WarnWhenUnsavedChangesDecision["proceed"]>().toEqualTypeOf<
      () => void
    >();
    expectTypeOf<WarnWhenUnsavedChangesDecision["cancel"]>().toEqualTypeOf<
      () => void
    >();
  });
});
