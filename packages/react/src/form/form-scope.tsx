/**
 * Chooses the form a multi-section form (`<TabbedForm>`, `<WizardForm>`) drives.
 * Inside a view that already provides one (`<Edit>`, `<Create>`) the ambient
 * form is used as is, so the record hydration and the view's save pipeline
 * stay in effect. Standalone, it builds its own from `options` and provides it.
 */

import { type ReactNode, useCallback, useEffect } from "react";
import {
  type CheloneFormContextValue,
  CheloneFormProvider,
  useOptionalCheloneFormContext,
} from "../form-context";
import { type UseFormOptions, useForm } from "../form-hooks";
import { warning } from "../util/warning";

export interface FormScopeProps<TFormData> {
  /** The calling component's name, for the ignored-options warning. */
  name: string;
  options: UseFormOptions<TFormData>;
  /** Receives the submit pipeline of whichever form is in effect. */
  children: (submit: () => Promise<void>) => ReactNode;
}

function AmbientFormScope({
  ambient: { form, submit },
  name,
  options,
  children,
}: {
  ambient: CheloneFormContextValue;
  name: string;
  options: object;
  children: FormScopeProps<unknown>["children"];
}) {
  // The ambient form was built by the view, so `validate`, `schema`, `onSuccess`
  // and the rest cannot reach it from here. `save` is a required prop, so it is
  // not worth a warning.
  const ignored = Object.entries(options)
    .filter(([key, value]) => key !== "save" && value !== undefined)
    .map(([key]) => key)
    .join(", ");
  useEffect(() => {
    warning(
      ignored,
      `<${name}> inside a view uses the view's form, so these options are ignored: ${ignored}.`,
    );
  }, [name, ignored]);
  const fallback = useCallback(() => form.handleSubmit(), [form]);
  return <>{children(submit ?? fallback)}</>;
}

function OwnFormScope<TFormData>({
  options,
  children,
}: FormScopeProps<TFormData>) {
  const { form, submit } = useForm<TFormData>(options);
  return (
    <CheloneFormProvider form={form} submit={submit}>
      {children(submit)}
    </CheloneFormProvider>
  );
}

export function FormScope<TFormData>(props: FormScopeProps<TFormData>) {
  const ambient = useOptionalCheloneFormContext();
  return ambient ? (
    <AmbientFormScope ambient={ambient} {...props} />
  ) : (
    <OwnFormScope {...props} />
  );
}
