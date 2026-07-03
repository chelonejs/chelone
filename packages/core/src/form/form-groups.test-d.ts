import { assertType, describe, it } from "vitest";
import type { TranslatableMessage } from "./form-controller";
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
});
