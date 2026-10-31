/**
 * Chooses the form a multi-section form (`<TabbedForm>`) drives, the twin of
 * `@chelone/react`'s `form-scope.tsx`. Given a `save`, it builds and provides
 * its own form from the props, even inside a view (a quick-create dialog on an
 * edit page). Without one it uses the ambient form of the view above it
 * (`<Edit>`, `<Create>`), so the record hydration and the view's save pipeline
 * stay in effect. With neither, it throws.
 *
 * The mode is fixed at setup: the form is created once.
 */

import { useOptionalCheloneFormContext } from "./form-context";
import { type FormSubmit, type UseFormOptions, useForm } from "./use-form";

/**
 * The form props of a form that may borrow its view's form. With `save` it
 * builds its own form and takes every option; without it the view owns the
 * form, so the options belong on the view (`<Edit validate>`), not here.
 *
 * The without-`save` member spells its keys out so `defineProps` can resolve
 * it; `form-scope.test-d.ts` pins the list against `UseFormOptions`.
 */
export type OptionalSaveFormProps<TFormData> =
  | (Omit<UseFormOptions<TFormData>, "onSubmit"> & {
      save: FormSubmit<TFormData>;
    })
  | {
      save?: undefined;
      record?: never;
      resource?: never;
      schema?: never;
      validate?: never;
      sanitizeEmptyValues?: never;
      getRecord?: never;
      resetOnSuccess?: never;
    };

/**
 * Call in `setup`. Returns the submit pipeline of whichever form is in effect;
 * `name` is the calling component, for the missing-save error.
 */
export function useFormScope<TFormData>(
  name: string,
  props: OptionalSaveFormProps<TFormData>,
): () => Promise<void> {
  const ambient = useOptionalCheloneFormContext();
  const save = props.save;
  if (save) {
    const { submit } = useForm<TFormData>({
      record: props.record,
      resource: props.resource,
      schema: props.schema,
      // The form captures its options once: hand it this wrapper, so a
      // `validate` set after setup still runs, as of the live prop.
      validate: (values) => props.validate?.(values),
      sanitizeEmptyValues: props.sanitizeEmptyValues,
      getRecord: () => props.getRecord?.(),
      resetOnSuccess: props.resetOnSuccess,
      // Same for `save`: a parent that swaps the prop gets the latest handler.
      onSubmit: (data) => (props.save ?? save)(data),
    });
    return submit;
  }
  if (ambient) {
    const { form, submit } = ambient;
    return submit ?? (() => form.handleSubmit());
  }
  throw new Error(
    `<${name}> needs a \`save\` prop outside a view that provides a form (<Edit>, <Create>).`,
  );
}
