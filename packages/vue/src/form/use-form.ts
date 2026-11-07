/**
 * `useForm` — the Vue form-core bridge, the twin of `@chelone/react`'s standalone
 * `useForm` (`form-hooks.ts`). It constructs a vanilla `FormController` (D6
 * `revalidateLogic` + schema-as-validator pulled from the resource registry,
 * same as core/react), bridges its reactive state into Vue via the form-core
 * subscribe seam, provides the form to descendant `useInput`s, and exposes the
 * narrow surface a view needs: `{ form, values, submit, submitting, reset }`.
 *
 * Bridge choice (spec §A / Task 6 fallback): `@tanstack/vue-store` is NOT a
 * dependency here, AND — more fundamentally — a `FormController` exposes only
 * form-core's `subscribe` + `getSnapshot`, where `subscribe` drives the 4R
 * `form.mount()` refcount. Bridging via the V1-a subscribe pattern
 * ({@link useSubscribable}) mounts the form on `setup` and unmounts on scope
 * disposal; subscribing to the raw `form.store` directly would read state but
 * never mount its validators. So the bridge goes THROUGH the controller.
 *
 * The submit pipeline (server-error mapping via `form.setErrorMap({onSubmit})`,
 * post-save `form.reset(saved)`) all lives inside `createFormController` — this
 * composable only wires the P4 `save` (the caller's `onSubmit`), the registry
 * schema, and the ambient services (`notifications`/`translate`).
 */

import type {
  CheloneFormApi,
  FieldErrors,
  FormController,
  FormControllerOptions,
  FormLevelValidate,
  ResourceMap,
} from "@chelone/core";
import { createFormController } from "@chelone/core";
import { type ComputedRef, computed } from "vue";
import { useCheloneContext } from "../context";
import { useResourceContext } from "../resource-context";
import { provideCheloneForm } from "./form-context";
import { useSubscribable } from "./subscribe-ref";

/** The Standard Schema slot, referenced structurally so no extra type import is needed. */
type FormSchema<TFormData> = FormControllerOptions<TFormData>["schema"];

/**
 * The caller-supplied save. Follows the P4 contract: resolve the server's
 * `fieldErrors` on a validation failure (they map onto the form's `onSubmit`
 * error channel), resolve nullish on success. A `void`/`Promise<void>` return
 * is treated as success — a create/edit view that persists through its own
 * controller and has no field errors to surface.
 */
export type FormSubmit<TFormData> = (
  data: TFormData,
) => Promise<FieldErrors | undefined> | FieldErrors | undefined | Promise<void>;

export interface UseFormOptions<TFormData> {
  /**
   * Seed values → the form's `defaultValues` (ra's "the record"): an edit view
   * passes the fetched record, a create view its seed. Post-save `reset`
   * rebaselines against the saved values.
   */
  record?: TFormData;
  /** The save callback (P4 contract) — receives the typed form values on submit. */
  onSubmit: FormSubmit<TFormData>;
  /**
   * Target resource for the DEFAULT schema validator; defaults to the ambient
   * `<Resource>` name. Only used to look up the registry schema — a form
   * without a resource simply has no default schema.
   */
  resource?: string;
  /** Explicit Standard Schema override (else the resource-registry schema). */
  schema?: FormSchema<TFormData>;
  /** Form-level validate fn (ra contract). */
  validate?: FormLevelValidate<TFormData>;
  /** ra parity: nullify/strip empty top-level values before save. Default false. */
  sanitizeEmptyValues?: boolean;
  /**
   * The sanitize baseline (ra: "the record"): an emptied key that exists on it
   * is sent as `null`, any other is omitted. Read live at save time, so an edit
   * view can return the record that hydrated after setup.
   */
  getRecord?: () => Partial<TFormData> | undefined;
  /** Rebaseline the form from the saved values on success (D5). Default true. */
  resetOnSuccess?: boolean;
  /**
   * Whether the form holds the resource's record, so descendants read it
   * through a handle tagged with that resource (`useFormHandle("posts")`) and
   * its inputs validate against that resource's registry schema.
   * `false` for a form whose values are something else, such as a list filter
   * or login credentials: its handle is unbound and the ambient resource's
   * schema does not apply to it. Default true.
   */
  recordForm?: boolean;
}

/** The narrow reactive surface `useForm` exposes to a view. */
export interface UseFormReturn<TFormData> {
  /** The wrapped FormApi — field bindings hang off it (see `useInput`). */
  form: CheloneFormApi<TFormData>;
  /** The live form values (whole-values view; re-emits per keystroke by design). */
  values: ComputedRef<TFormData>;
  /** The submit pipeline (validate → save → server-error map → reset). */
  submit: () => Promise<void>;
  /** Reactive submitting flag. */
  submitting: ComputedRef<boolean>;
  /** Imperative reset/rebaseline (defaults to the current defaults when omitted). */
  reset: (values?: TFormData) => void;
}

/** The registry schema for `resource`, widened to the form's data type. */
function registrySchema<TFormData>(
  resources: ResourceMap | undefined,
  resource: string | undefined,
): FormSchema<TFormData> {
  if (!resources || !resource) return undefined;
  const entry = resources[resource];
  // zod >= 3.24 implements Standard Schema; the registry types schemas broadly,
  // so widening to the form data type is a cast (mirrors core's registrySchema).
  // type-escape: the registry's schema slot to the form's data type.
  return entry?.schema as FormSchema<TFormData>;
}

export function useForm<TFormData = Record<string, unknown>>(
  options: UseFormOptions<TFormData>,
): UseFormReturn<TFormData> {
  const ctx = useCheloneContext();
  // Resource is optional for a form — it only sources the default schema. An
  // explicit `resource` option wins over the ambient `<Resource>` name.
  const resource = useResourceContext({ resource: options.resource });
  const translate = ctx.i18n
    ? (key: string) => ctx.i18n?.translate(key) ?? key
    : undefined;
  // A form that does not hold the resource's record is not validated against
  // that record's schema: login credentials rendered under a
  // `<Resource name="posts">` would otherwise be rejected for a missing `title`.
  const schema =
    options.schema ??
    (options.recordForm === false
      ? undefined
      : registrySchema<TFormData>(ctx.resources, resource));

  const controller: FormController<TFormData> = createFormController<TFormData>(
    {
      defaultValues: options.record,
      schema,
      validate: options.validate,
      sanitizeEmptyValues: options.sanitizeEmptyValues,
      getRecord: options.getRecord,
      resetOnSuccess: options.resetOnSuccess,
      // Adapt the caller's save to the P4 `Promise<FieldErrors | undefined>`
      // contract: a nullish/void resolution is success.
      save: async (data) => (await options.onSubmit(data)) ?? undefined,
      notifications: ctx.notifications,
      translate,
    },
  );

  // 4R: subscribing mounts the form (onMount validators) on `setup`;
  // `onScopeDispose` unmounts it on unmount / `effectScope().stop()`.
  const state = useSubscribable(controller);

  // Expose the form to descendant `useInput`s (mirror React's CheloneFormProvider).
  provideCheloneForm({
    form: controller.form,
    submit: controller.submit,
    resource: options.recordForm === false ? undefined : resource,
  });

  return {
    form: controller.form,
    values: computed(() => state.value.values),
    submit: controller.submit,
    submitting: computed(() => state.value.isSubmitting),
    reset: (values?: TFormData) => controller.form.reset(values),
  };
}
