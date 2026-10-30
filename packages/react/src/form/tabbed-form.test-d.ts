import type { FieldErrors } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type {
  TabbedForm,
  TabbedFormProps,
  UseTabbedFormResult,
} from "./tabbed-form";

interface FormValues {
  title?: string;
  body?: string;
}

const okSave = async (): Promise<FieldErrors | undefined> => undefined;

/** The props the component accepts: the flat props gated by the save rule. */
type TabbedFormCallProps = Parameters<typeof TabbedForm<FormValues>>[0];

describe("TabbedForm types", () => {
  it("TabbedFormProps is generic in the form-data shape", () => {
    const props: TabbedFormProps<FormValues> = {
      save: okSave,
      children: null,
    };
    expectTypeOf(props.save).toEqualTypeOf<
      ((data: FormValues) => Promise<FieldErrors | undefined>) | undefined
    >();
  });

  it("save is optional: a form inside a view needs none", () => {
    const props: TabbedFormProps<FormValues> = { children: null };
    expectTypeOf(props.save).toBeNullable();
  });

  it("validate without save is a type error: the view owns the form", () => {
    const validate = () => undefined;
    // @ts-expect-error a form that drives its view's form takes no options
    const props: TabbedFormCallProps = { validate, children: null };
    expectTypeOf(props).toBeObject();
  });

  it("validate with save compiles", () => {
    const props: TabbedFormCallProps = {
      save: okSave,
      validate: () => undefined,
      children: null,
    };
    expectTypeOf(props).toBeObject();
  });

  it("syncWithLocation is an optional boolean", () => {
    const props: TabbedFormProps<FormValues> = {
      save: okSave,
      syncWithLocation: false,
      children: null,
    };
    expectTypeOf(props.syncWithLocation).toEqualTypeOf<boolean | undefined>();
  });

  it("the tabbed-form controller result is any-free and shaped correctly", () => {
    // The active tab name (string) drives which panel shows.
    expectTypeOf<UseTabbedFormResult["activeTab"]>().toEqualTypeOf<string>();
    // Programmatic tab selection.
    expectTypeOf<UseTabbedFormResult["goToTab"]>().toEqualTypeOf<
      (name: string) => void
    >();
    // A single submit collects the whole (multi-tab) form.
    expectTypeOf<UseTabbedFormResult["submit"]>().toEqualTypeOf<
      () => Promise<void>
    >();
    // Whether the tabs are URL-synced (vs local useState).
    expectTypeOf<
      UseTabbedFormResult["syncWithLocation"]
    >().toEqualTypeOf<boolean>();
  });
});
