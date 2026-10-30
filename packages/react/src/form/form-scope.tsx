/**
 * Chooses the form a multi-section form (`<TabbedForm>`, `<WizardForm>`) drives.
 * Inside a view that already provides one (`<Edit>`, `<Create>`) the ambient
 * form is used as is, so the record hydration and the view's save pipeline
 * stay in effect. Standalone, it builds its own from `options` and provides it.
 */

import { type ReactNode, useCallback } from "react";
import {
  type CheloneFormContextValue,
  CheloneFormProvider,
  useOptionalCheloneFormContext,
} from "../form-context";
import { type UseFormOptions, useForm } from "../form-hooks";

export interface FormScopeProps<TFormData> {
  options: UseFormOptions<TFormData>;
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
    <AmbientFormScope ambient={ambient}>{props.children}</AmbientFormScope>
  ) : (
    <OwnFormScope {...props} />
  );
}
