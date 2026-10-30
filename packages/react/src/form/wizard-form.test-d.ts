import type { FieldErrors } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type {
  UseWizardFormResult,
  WizardForm,
  WizardFormProps,
} from "./wizard-form";

interface FormValues {
  title?: string;
  body?: string;
}

const okSave = async (): Promise<FieldErrors | undefined> => undefined;

/** The props the component accepts: the flat props gated by the save rule. */
type WizardFormCallProps = Parameters<typeof WizardForm<FormValues>>[0];

describe("WizardForm types", () => {
  it("WizardFormProps is generic in the form-data shape", () => {
    const props: WizardFormProps<FormValues> = {
      save: okSave,
      children: null,
    };
    expectTypeOf(props.save).toEqualTypeOf<
      ((data: FormValues) => Promise<FieldErrors | undefined>) | undefined
    >();
  });

  it("save is optional: a form inside a view needs none", () => {
    const props: WizardFormProps<FormValues> = { children: null };
    expectTypeOf(props.save).toBeNullable();
  });

  it("validate without save is a type error: the view owns the form", () => {
    const validate = () => undefined;
    // @ts-expect-error a form that drives its view's form takes no options
    const props: WizardFormCallProps = { validate, children: null };
    expectTypeOf(props).toBeObject();
  });

  it("validate with save compiles", () => {
    const props: WizardFormCallProps = {
      save: okSave,
      validate: () => undefined,
      children: null,
    };
    expectTypeOf(props).toBeObject();
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
