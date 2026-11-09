import type {
  AmbientForm,
  AnyFormHandle,
  CheloneFormApi,
  CreateControllerState,
  CreateFormController,
  CreateFormControllerOptions,
  EditControllerState,
  EditFormController,
  EditFormControllerOptions,
  FieldBinding,
  FieldBindingUpdateOptions,
  FormContextHandle,
  FormController,
  FormControllerContext,
  FormControllerOptions,
  RecordOf,
  ResourceMap,
  SaveOptions,
  SourceProp,
  SourceTransformValue,
  SourceValue,
  TranslatableMessage,
} from "@chelone/core";
import {
  createCreateFormController,
  createEditFormController,
  createFormController,
  defaultFormat,
  extractEventValue,
  firstFieldError,
  isRequired as hasRequiredValidator,
  isResourceHandle,
} from "@chelone/core";
import { useSelector } from "@tanstack/react-store";
import {
  type ChangeEvent,
  type FocusEvent,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { type CheloneContextValue, useCheloneContext } from "./context";
import { sameDisplayError } from "./field-error";
import { useRegisterFieldGroup } from "./form/group-hooks";
import { useCheloneFormContext, useSourceContext } from "./form-context";
import { useRedirectOptional } from "./router";

/** Structurally the composed-form context: record services + registry. */
function toFormContext<TResources extends ResourceMap>(
  ctx: CheloneContextValue<TResources>,
): FormControllerContext<TResources> {
  const { dataProvider, queryClient, store, notifications, i18n, resources } =
    ctx;
  return {
    dataProvider,
    queryClient,
    store,
    notifications,
    resources,
    translate: i18n ? (key) => i18n.translate(key) : undefined,
  };
}

/** Constant snapshot for mount-driving subscriptions — never re-renders. */
const attachSnapshot = (): true => true;

/**
 * The commit-phase ATTACH DRIVER. `useSyncExternalStore`'s subscribe performs
 * the refcounted attach (first subscriber mounts the form/field, last
 * unsubscribe unmounts — the ratified 4R lifecycle); the constant snapshot
 * means this subscription NEVER causes a re-render. Re-render reactivity
 * comes from the narrow `useSelector` slices instead, so a form shell doesn't
 * re-render per keystroke and inputs stay isolated per field.
 */
function useAttach(subscribe: (listener: () => void) => () => void): void {
  useSyncExternalStore(subscribe, attachSnapshot, attachSnapshot);
}

/**
 * The narrow form-state slice every form hook exposes. Deliberately excludes
 * `values`/`fieldMeta` — those change per keystroke and belong to `useInput`
 * consumers; a form shell subscribing here re-renders only on validity /
 * dirty-signal flips (the T9 perf budget).
 */
export interface FormStateSlices {
  canSubmit: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
  isTouched: boolean;
  /** STICKY ever-modified flag — clears only on reset (ground truth #7). */
  isDirty: boolean;
  /** Deep-equality baseline check: `!isDefaultValue` = "unsaved changes". */
  isDefaultValue: boolean;
}

/** Six identity-cheap selectors over `form.store` (uSES-with-selector). */
function useFormStateSlices<TFormData>(
  form: CheloneFormApi<TFormData>,
): FormStateSlices {
  const canSubmit = useSelector(form.store, (s) => s.canSubmit);
  const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);
  const isValidating = useSelector(form.store, (s) => s.isValidating);
  const isTouched = useSelector(form.store, (s) => s.isTouched);
  const isDirty = useSelector(form.store, (s) => s.isDirty);
  const isDefaultValue = useSelector(form.store, (s) => s.isDefaultValue);
  return useMemo(
    () => ({
      canSubmit,
      isSubmitting,
      isValidating,
      isTouched,
      isDirty,
      isDefaultValue,
    }),
    [canSubmit, isSubmitting, isValidating, isTouched, isDirty, isDefaultValue],
  );
}

/** Reactive form slices plus the controller's stable form + submit. */
export interface UseFormControllerResult<TFormData> extends FormStateSlices {
  form: CheloneFormApi<TFormData>;
  submit: () => Promise<void>;
}

/**
 * React bridge for an externally created vanilla form controller.
 *
 * Binding pattern (Task 4R redesign, P4):
 * - Controller construction is INERT (no mount, no validation), so creating
 *   one in a render-phase `useState` initializer is safe: a discarded render
 *   (Suspense sibling suspending, StrictMode double render, hidden
 *   `<Activity>` pre-render, a render that throws) leaves only garbage —
 *   never a live zombie. The `controller` argument is captured on FIRST
 *   render; passing a different one later is IGNORED by design — remount
 *   (e.g. with a `key`) to swap controllers.
 * - `useSyncExternalStore`'s commit-phase subscribe performs the attach: the
 *   controller runs `form.mount()` on the FIRST subscriber and unmounts on
 *   the LAST unsubscribe. Unmount, StrictMode's simulated
 *   mount->cleanup->remount, and `<Activity>` hide/show all flow through this
 *   single detach/re-attach path — no recreate machinery, nothing leaks.
 * - There is deliberately NO `useEffect(() => () => controller.destroy())`:
 *   an effect-cleanup destroy is indistinguishable from an `<Activity>` hide
 *   (both are effect teardowns without unmount) and would permanently kill a
 *   controller that must survive to re-attach on reveal. Last-unsubscribe
 *   detach already releases every resource at unmount; `destroy()` stays the
 *   imperative teardown for vanilla (non-React) consumers.
 * - `form` and `submit` are identity-stable across renders; reactivity comes
 *   from narrow slices, never a whole-state subscription.
 */
export function useFormController<TFormData>(
  controller: FormController<TFormData>,
): UseFormControllerResult<TFormData> {
  const [captured] = useState(controller);
  useAttach(captured.subscribe);
  const slices = useFormStateSlices(captured.form);
  return useMemo(
    () => ({ ...slices, form: captured.form, submit: captured.submit }),
    [slices, captured],
  );
}

/** `useForm` options: the controller options minus the context-injected services. */
export type UseFormOptions<TFormData> = Omit<
  FormControllerOptions<TFormData>,
  "notifications" | "translate"
>;

/** Type symmetry: `useForm` returns the `useFormController` surface. */
export type UseFormResult<TFormData> = UseFormControllerResult<TFormData>;

/**
 * Standalone form hook (bulk-edit-drawer-class custom forms): constructs a
 * vanilla form controller lazily (notifications + translate injected from
 * `useCheloneContext`) and bridges it per the `useFormController` doc block.
 * `options` are captured on first render — remount with a `key` to change.
 */
export function useForm<TFormData>(
  options: UseFormOptions<TFormData>,
): UseFormResult<TFormData> {
  const ctx = useCheloneContext();
  const [controller] = useState<FormController<TFormData>>(() => {
    const { notifications, i18n } = ctx;
    return createFormController<TFormData>({
      ...options,
      notifications,
      translate: i18n ? (key) => i18n.translate(key) : undefined,
    });
  });
  return useFormController(controller);
}

/** Record state + form slices + the composed controller's form and submit. */
export interface UseEditFormResult<TRecord>
  extends EditControllerState<TRecord>,
    FormStateSlices {
  form: CheloneFormApi<Partial<TRecord>>;
  submit: (options?: SaveOptions<TRecord>) => Promise<void>;
}

/**
 * React bridge for the composed edit-form controller (D10 money path). Same
 * binding pattern as `useFormController` (see its doc block): inert lazy
 * construction, ONE commit-phase attach spanning BOTH controllers (record
 * fetch/mutation observers + hydration listener + `form.mount()`), release
 * on last unsubscribe, deliberately NO destroy effect.
 * `ctx`/`resource`/`options` changes after mount are IGNORED — remount with
 * a `key` to change them. Record state re-renders on record events only;
 * form reactivity is the narrow `FormStateSlices`.
 */
export function useEditForm<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options: EditFormControllerOptions<RecordOf<TResources, TName>>,
): UseEditFormResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  // ra-core parity: after a successful save the edit view redirects to the
  // list by default. The controller REQUESTS the redirect via `onRedirect`
  // (record-controllers.ts onDefaultSuccess); wire it to the router's stable
  // redirect unless the caller supplied their own (e.g. `() => {}` to stay).
  // `useRedirectOptional` DEGRADES TO A NO-OP without a RouterAdapter, so a
  // standalone form (bulk-edit-drawer, unit tests) never hard-requires a router.
  const redirect = useRedirectOptional();

  const [controller] = useState<EditFormController<TRecord>>(() =>
    createEditFormController<TResources, TName>(toFormContext(ctx), resource, {
      ...options,
      onRedirect: options.onRedirect ?? redirect,
    }),
  );

  useAttach(controller.subscribe);
  const recordState = useSyncExternalStore(
    controller.recordController.subscribe,
    controller.recordController.getSnapshot,
    controller.recordController.getSnapshot,
  );
  const slices = useFormStateSlices(controller.form);

  return useMemo(
    () => ({
      ...recordState,
      ...slices,
      form: controller.form,
      submit: controller.submit,
    }),
    [recordState, slices, controller],
  );
}

/** Seed-record state + form slices + the composed controller's form and submit. */
export interface UseCreateFormResult<TRecord>
  extends CreateControllerState<TRecord>,
    FormStateSlices {
  form: CheloneFormApi<Partial<TRecord>>;
  submit: (options?: SaveOptions<TRecord>) => Promise<void>;
}

/**
 * React bridge for the composed create-form controller. Follows the
 * `useEditForm` binding pattern exactly (no hydration machinery — the seed
 * is known at construction).
 */
export function useCreateForm<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options?: CreateFormControllerOptions<RecordOf<TResources, TName>>,
): UseCreateFormResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  // ra-core parity: redirect on successful create (the controller decides the
  // target — typically the new record's edit page or the list). Caller can
  // override `onRedirect` to stay on the form. `useRedirectOptional` degrades
  // to a no-op without a RouterAdapter (standalone forms never need a router).
  const redirect = useRedirectOptional();

  const [controller] = useState<CreateFormController<TRecord>>(() =>
    createCreateFormController<TResources, TName>(
      toFormContext(ctx),
      resource,
      { ...options, onRedirect: options?.onRedirect ?? redirect },
    ),
  );

  useAttach(controller.subscribe);
  const recordState = useSyncExternalStore(
    controller.recordController.subscribe,
    controller.recordController.getSnapshot,
    controller.recordController.getSnapshot,
  );
  const slices = useFormStateSlices(controller.form);

  return useMemo(
    () => ({
      ...recordState,
      ...slices,
      form: controller.form,
      submit: controller.submit,
    }),
    [recordState, slices, controller],
  );
}

/** What a DOM input's `onChange` hands over. */
type InputChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

/** The resources the ambient form context can name: none until the app registers some. */
type FormHandleName = FormContextHandle["resource"] & string;

/** The member of the handle union `THandle` that edits `TName`, or `undefined`. */
export type NamedFormHandle<
  THandle extends AnyFormHandle,
  TName extends string,
> = Extract<THandle, { resource: TName }> | undefined;

/**
 * The ambient form as a handle tagged by the resource it edits. Narrow on
 * `handle.resource` for that resource's record types, or ask for one by name.
 * Throws without a `<CheloneFormProvider>` above.
 *
 * Library inputs read `handle.ambient`, which every member has, because one
 * input renders under any resource.
 */
export function useFormHandle(): FormContextHandle;
/** The ambient form's handle when it edits `name`, `undefined` when it edits another resource or none. */
export function useFormHandle<TName extends FormHandleName>(
  name: TName,
): NamedFormHandle<FormContextHandle, TName>;
export function useFormHandle<TName extends FormHandleName>(
  name?: TName,
): FormContextHandle | NamedFormHandle<FormContextHandle, TName> {
  const { form } = useCheloneFormContext();
  if (name === undefined) return form;
  return isResourceHandle(form, name) ? form : undefined;
}

export interface UseInputOptions<
  TRecord = unknown,
  // `SourceProp`, not `SourcePath`: `source` is relative to the ambient scope,
  // so a row path (`sku` under `items[]`) and a filter key are legal here. It is
  // also what lets an input hand over its own `TPath`, which is how `format` and
  // `parse` get the value at `source` — `SourceTransformValue` for the relative
  // paths, whose value the record type cannot name.
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TInput = unknown,
> extends Omit<FieldBindingUpdateOptions, "defaultValue" | "format" | "parse"> {
  /** The field path RELATIVE to the ambient source scope (iterator rows compose it). */
  source: TPath;
  /** Seeds an empty field; typed as the value at `source` (`unknown` without a record). */
  defaultValue?: NoInfer<SourceValue<TRecord, TPath>>;
  /**
   * Read transform (stored value -> input value). Default `defaultFormat`.
   * Receives the value at `source`, plus the holes an untouched or cleared
   * field leaves.
   */
  format?: (
    value: NoInfer<SourceTransformValue<TRecord, TPath>> | null | undefined,
  ) => TInput;
  /** Write transform (input value -> stored value). Default `defaultParse`. */
  parse?: (input: TInput) => NoInfer<SourceTransformValue<TRecord, TPath>>;
  /** Forces the required marker; ORed with `required()` detection on `validate`. */
  isRequired?: boolean;
  /** Explicit element id; a `useId` value is generated otherwise. */
  id?: string;
  /** Chained AFTER the parsed value is written to the form. */
  onChange?: (eventOrValue?: InputChangeEvent | TInput) => void;
  /** Chained AFTER the blur is recorded. */
  onBlur?: (event?: FocusEvent) => void;
}

/** ra-parity input wiring: spread onto the DOM/UI input. */
export interface UseInputField<TInput = unknown> {
  name: string;
  /** `format(raw)` — recomputed every render, `''` for nullish under the default. */
  value: TInput;
  /** Accepts a DOM/synthetic event OR a raw value; writes `parse(extracted)`. */
  onChange: (eventOrValue?: InputChangeEvent | TInput) => void;
  onBlur: (event?: FocusEvent) => void;
}

/** ra-parity field state (+ `isValidating` for async validators). */
export interface UseInputFieldState {
  invalid: boolean;
  isTouched: boolean;
  isDirty: boolean;
  isValidating: boolean;
  /** The first field error, normalized to a displayable/translatable payload. */
  error: string | TranslatableMessage | undefined;
}

export interface UseInputResult<TInput = unknown> {
  id: string;
  field: UseInputField<TInput>;
  fieldState: UseInputFieldState;
  isRequired: boolean;
}

/** One binding per (form, final source) pair — the useInput identity key. */
interface InputBindingHolder {
  form: AmbientForm;
  // type-escape: context: the ambient form names no record, so its binding is record-free
  binding: FieldBinding<unknown>;
}

/**
 * The non-identity binding options for the CURRENT render's props. The
 * validators' meta argument carries the full input props (ra parity: custom
 * validators can read them), with an explicit `validatorMeta` merged on top.
 */
function toBindingUpdate(options: UseInputOptions): FieldBindingUpdateOptions {
  const meta = { ...options, ...options.validatorMeta };
  return {
    defaultValue: options.defaultValue,
    format: options.format,
    parse: options.parse,
    validate: options.validate,
    schema: options.schema,
    validatorMeta: meta,
  };
}

/**
 * The input workhorse (ra's useInput rebridged onto form-core).
 *
 * Consumes the ambient `<CheloneFormProvider>` form and SourceContext scope.
 * Follows the react-form useField shape over the ratified 4R lifecycle:
 * - The field binding (T3) is constructed INERTLY in a render-phase
 *   `useState` and RECREATED when the form or the final source changes
 *   (react-form's own recreate key); the abandoned binding was either never
 *   attached (discarded render — garbage, not a zombie) or detaches when the
 *   attach driver re-subscribes.
 * - The commit-phase attach driver routes `field.mount()` through the
 *   binding's refcounted subscribe — NEVER a bare render-phase mount — so
 *   registration/seeding only ever happen for committed components, and
 *   StrictMode / `<Activity>` hide/show flow through detach/re-attach.
 * - Non-identity options (format/parse/validate/defaultValue) stay FRESH via
 *   `binding.update` after every commit (react-form's `field.update`
 *   pattern) — by the time an event handler can fire, the binding sees the
 *   latest props.
 * - Reactivity is per-field: slices over the identity-memoized `field.store`
 *   (react-form's slice pattern), so typing here never re-renders sibling
 *   inputs.
 */
export function useInput<
  TRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TInput = unknown,
>(options: UseInputOptions<TRecord, TPath, TInput>): UseInputResult<TInput>;
export function useInput(options: UseInputOptions): UseInputResult {
  const { ambient: form } = useCheloneFormContext().form;
  const scope = useSourceContext();
  const source = scope.getSource(options.source);
  const generatedId = useId();

  // Auto-register the FINAL source into the ambient form group (if any) so a
  // tab/step badge aggregates this field's validity. No-op outside a group.
  useRegisterFieldGroup(source);

  const [holder, setHolder] = useState<InputBindingHolder>(() => ({
    form,
    binding: form.bindField({ ...toBindingUpdate(options), source }),
  }));
  let active = holder;
  if (active.form !== form || active.binding.source !== source) {
    // Render-phase derived-state reset (react-form recreates its FieldApi the
    // same way). The new binding is inert until the attach driver commits.
    active = {
      form,
      binding: form.bindField({ ...toBindingUpdate(options), source }),
    };
    setHolder(active);
  }
  const { binding } = active;

  useAttach(binding.subscribe);

  const { store } = binding;
  const rawValue = useSelector(store, (s) => s.value);
  const isTouched = useSelector(store, (s) => s.meta.isTouched);
  const isDirty = useSelector(store, (s) => s.meta.isDirty);
  const isValidating = useSelector(store, (s) => s.meta.isValidating);
  // Subscribe to the DISPLAYABLE error (not the raw errorMap object) with
  // value-equality: a form-level validator rewrites every field's errorMap ref
  // per keystroke, but a sibling whose message is unchanged must NOT re-render
  // (see sameDisplayError + form-perf-schema.test.tsx).
  const error = useSelector(store, (s) => firstFieldError(s.meta.errorMap), {
    compare: sameDisplayError,
  });

  // Freshness after every commit — deliberately no dependency array.
  useEffect(() => {
    binding.update(toBindingUpdate(options));
  });

  const format = options.format ?? defaultFormat;

  return {
    id: options.id ?? generatedId,
    field: {
      name: source,
      value: format(rawValue),
      onChange: (eventOrValue) => {
        binding.setValue(extractEventValue(eventOrValue));
        options.onChange?.(eventOrValue);
      },
      onBlur: (event) => {
        binding.blur();
        options.onBlur?.(event);
      },
    },
    fieldState: {
      invalid: error !== undefined,
      isTouched,
      isDirty,
      isValidating,
      error,
    },
    isRequired:
      options.isRequired === true || hasRequiredValidator(options.validate),
  };
}
