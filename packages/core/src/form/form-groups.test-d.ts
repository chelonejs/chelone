import type { AnyFieldMeta, ValidationErrorMap } from "@tanstack/form-core";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type { TranslatableMessage } from "./form-errors";
import {
  createFormGroups,
  type FormGroups,
  type GroupFieldMeta,
  type GroupState,
  reduceGroupState,
} from "./form-groups";

describe("form-groups public types", () => {
  it("createFormGroups returns the FormGroups contract", () => {
    const groups = createFormGroups();
    assertType<FormGroups>(groups);
    assertType<readonly string[]>(groups.getMembers("g"));
    assertType<() => void>(groups.subscribe(() => {}));
  });

  it("reduceGroupState is a pure fieldMeta → GroupState reducer", () => {
    const meta: Record<string, GroupFieldMeta | undefined> = {};
    const state = reduceGroupState(meta, ["a", "b"]);
    assertType<GroupState>(state);
    assertType<boolean>(state.isValid);
    assertType<boolean>(state.isDirty);
    assertType<boolean>(state.isTouched);
    assertType<boolean>(state.isValidating);
    assertType<Record<string, string | TranslatableMessage>>(state.errors);
  });

  it("GroupFieldMeta errorMap is form-core's ValidationErrorMap", () => {
    expectTypeOf<
      GroupFieldMeta["errorMap"]
    >().toEqualTypeOf<ValidationErrorMap>();
  });

  it("a form-core field meta assigns to GroupFieldMeta", () => {
    expectTypeOf<AnyFieldMeta>().toExtend<GroupFieldMeta>();
  });
});
