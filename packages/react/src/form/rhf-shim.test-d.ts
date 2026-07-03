import { describe, expectTypeOf, it } from "vitest";
import { useArrayInput } from "../array-hooks";
import { CheloneFormProvider, useCheloneFormContext } from "../form-context";
import { useInput } from "../form-hooks";
import {
  FormProvider,
  type UseWatchOptions,
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from "./rhf-shim";

describe("rhf-shim types", () => {
  it("useWatch takes { name } and returns the generic value | undefined", () => {
    expectTypeOf<UseWatchOptions>().toEqualTypeOf<{ name: string }>();
    expectTypeOf(useWatch<string>({ name: "q" })).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(useWatch({ name: "q" })).toEqualTypeOf<unknown>();
  });

  it("FormProvider is CheloneFormProvider", () => {
    expectTypeOf(FormProvider).toEqualTypeOf(CheloneFormProvider);
  });

  it("useFormContext is useCheloneFormContext", () => {
    expectTypeOf(useFormContext).toEqualTypeOf(useCheloneFormContext);
  });

  it("useController is useInput", () => {
    expectTypeOf(useController).toEqualTypeOf(useInput);
  });

  it("useFieldArray is useArrayInput", () => {
    expectTypeOf(useFieldArray).toEqualTypeOf(useArrayInput);
  });
});
