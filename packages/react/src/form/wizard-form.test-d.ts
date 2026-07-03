import type { FieldErrors } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { UseWizardFormResult, WizardFormProps } from "./wizard-form";

interface FormValues {
  title?: string;
  body?: string;
}

const okSave = async (): Promise<FieldErrors | undefined> => undefined;

describe("WizardForm types", () => {
  it("WizardFormProps is generic in the form-data shape", () => {
    const props: WizardFormProps<FormValues> = {
      save: okSave,
      children: null,
    };
    expectTypeOf(props.save).parameter(0).toEqualTypeOf<FormValues>();
  });

  it("the wizard controller result is any-free and shaped correctly", () => {
    expectTypeOf<UseWizardFormResult["currentStep"]>().toEqualTypeOf<number>();
    expectTypeOf<UseWizardFormResult["hasNext"]>().toEqualTypeOf<boolean>();
    expectTypeOf<UseWizardFormResult["hasPrev"]>().toEqualTypeOf<boolean>();
    // next() reports whether it advanced (false = blocked by validation).
    expectTypeOf<UseWizardFormResult["next"]>().toEqualTypeOf<
      () => Promise<boolean>
    >();
    expectTypeOf<UseWizardFormResult["prev"]>().toEqualTypeOf<() => void>();
    expectTypeOf<UseWizardFormResult["goToStep"]>().toEqualTypeOf<
      (index: number) => void
    >();
    expectTypeOf<UseWizardFormResult["submit"]>().toEqualTypeOf<
      () => Promise<void>
    >();
  });
});
