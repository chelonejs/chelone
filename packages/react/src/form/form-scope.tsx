/**
 * Chooses the form a multi-section form (`<TabbedForm>`, `<WizardForm>`) drives.
 * Given a `save`, it builds and provides its own form from the options, even
 * inside a view (a quick-create dialog on an edit page). Without one it uses the
 * ambient form of the view above it (`<Edit>`, `<Create>`), so the record
 * hydration and the view's save pipeline stay in effect. With neither, it throws.
 */

import { type ReactNode, useCallback } from "react";
import {
  type CheloneFormContextValue,
  CheloneFormProvider,
  useOptionalCheloneFormContext,
} from "../form-context";
import { type UseFormOptions, useForm } from "../form-hooks";

/**
 * The form options of a form that may borrow its view's form. With `save` it
 * builds its own form and takes every option; without it the view owns the
 * form, so the options belong on the view (`<Edit validate>`), not here.
 */
export type OptionalSaveFormOptions<TFormData> =
  | UseFormOptions<TFormData>
  | ({ save?: undefined } & {
      [K in Exclude<keyof UseFormOptions<TFormData>, "save">]?: never;
    });

/**
 * The same options as one flat shape, `save` optional. Component props extend
 * this so the generated props docs list every option; the component's call
 * signature intersects it with {@link OptionalSaveFormOptions} to enforce the rule.
 */
export interface OptionalSaveFormProps<TFormData>
  extends Omit<UseFormOptions<TFormData>, "save">,
    Partial<Pick<UseFormOptions<TFormData>, "save">> {}

export interface FormScopeProps<TFormData> {
  /** The calling component's name, for the missing-save error. */
  name: string;
  options: OptionalSaveFormOptions<TFormData>;
  /** Receives the submit pipeline of whichever form is in effect. */
  children: (submit: () => Promise<void>) => ReactNode;
}

function AmbientFormScope({
  ambient: { form, submit },
  children,
}: {
  ambient: CheloneFormContextValue;
  children: FormScopeProps<unknown>["children"];
}) {
  const fallback = useCallback(() => form.handleSubmit(), [form]);
  return <>{children(submit ?? fallback)}</>;
}

function OwnFormScope<TFormData>({
  options,
  children,
}: {
  options: UseFormOptions<TFormData>;
  children: FormScopeProps<TFormData>["children"];
}) {
  const { form, submit } = useForm<TFormData>(options);
  return (
    <CheloneFormProvider form={form} submit={submit}>
      {children(submit)}
    </CheloneFormProvider>
  );
}

export function FormScope<TFormData>({
  name,
  options,
  children,
}: FormScopeProps<TFormData>) {
  const ambient = useOptionalCheloneFormContext();
  const { save } = options;
  if (save) {
    return (
      <OwnFormScope<TFormData> options={{ ...options, save }}>
        {children}
      </OwnFormScope>
    );
  }
  if (ambient) {
    return <AmbientFormScope ambient={ambient}>{children}</AmbientFormScope>;
  }
  throw new Error(
    `<${name}> needs a \`save\` prop outside a view that provides a form (<Edit>, <Create>).`,
  );
}
