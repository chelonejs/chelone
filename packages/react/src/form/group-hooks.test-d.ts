import type { FormGroups, GroupState } from "@chelone/core";
import { assertType, describe, it } from "vitest";
import type {
  FormGroupProviderProps,
  FormGroupsProviderProps,
} from "./group-hooks";
import {
  useFormGroup,
  useFormGroupName,
  useFormGroups,
  useOptionalFormGroups,
  useRegisterFieldGroup,
} from "./group-hooks";

describe("group-hooks public types", () => {
  it("useFormGroup returns a reactive GroupState", () => {
    const state = useFormGroup("tab");
    assertType<GroupState>(state);
    assertType<boolean>(state.isValid);
  });

  it("registry hooks expose the FormGroups contract", () => {
    assertType<FormGroups>(useFormGroups());
    assertType<FormGroups | undefined>(useOptionalFormGroups());
    assertType<string | undefined>(useFormGroupName());
    assertType<void>(useRegisterFieldGroup("field"));
  });

  it("provider props carry name + optional registry", () => {
    assertType<FormGroupProviderProps>({ name: "tab", children: null });
    assertType<FormGroupsProviderProps>({ children: null });
  });
});
