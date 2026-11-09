/**
 * react-hook-form → @chelone/react mapping layer.
 *
 * 27 shadmin `.tsx` files import from `react-hook-form` directly. chelone has
 * NO react-hook-form — forms run on TanStack Form via the P4/P5/P6 controllers.
 * This module maps the RHF family onto chelone equivalents so those files port
 * with an import swap plus (for the non-1:1 cases) a small call-site fixup.
 *
 * ## Runnable 1:1 shims (drop-in)
 * - `useWatch({ name })` → a live subscription to the ambient form's value at
 *   `name`, scope-aware (iterator rows prefix the path). Provided below.
 *
 * ## Re-exported chelone equivalents (rename-only import swap)
 * - `FormProvider`  → `CheloneFormProvider` (re-exported as `FormProvider`).
 * - `useFormContext`→ `useCheloneFormContext` (re-exported). NOTE: the returned
 *   object is `{ form, submit }` (a form handle + the submit pipeline),
 *   NOT RHF's `{ setValue, getValues, getFieldState, formState, ... }`. Call
 *   sites that used RHF methods must move to the handle's `form.ambient`:
 *     - `setValue(name, v, opts)`      → `form.ambient.setFieldValue(name, v)`
 *     - `getValues(name)`              → `form.ambient.getFieldValue(name)`
 *     - `getFieldState(name)`          → `form.ambient.getFieldMeta(name)` /
 *                                        `useInput({ source }).fieldState`
 *     - `reset()`                      → `form.ambient.reset()`
 *     - `handleSubmit(fn)`             → the context `submit` pipeline
 *     - `formState.{dirtyFields,errors,submitCount}` → `useForm`/`useFormController`
 *                                        `FormStateSlices` + `form.ambient.store` selectors
 * - `Controller` / `useController` → `useInput({ source })` (re-exported as
 *   `useController`). RHF's render-prop `<Controller render={({field})=>...}/>`
 *   becomes a call to `useInput` inside the input component (chelone's inputs
 *   already do this) — there is no render-prop wrapper component.
 * - `useFieldArray` → `useArrayInput` (re-exported). RHF's
 *   `{ fields, append, remove, move, ... }` maps to chelone's
 *   `ArrayInputContextValue` (`items`, `add`, `remove`, `move`, `reorder`);
 *   field names differ, so array call sites are a small rewrite, not a rename.
 *
 * ## No chelone analog (call-site rewrite required, documented for the porter)
 * - `useFormState({ control })` — RHF's isolated form-state subscription. Use
 *   `useForm`/`useFormController`/`useEditForm`/`useCreateForm`'s
 *   `FormStateSlices` (`isDirty`, `isSubmitting`, `canSubmit`, …) or a narrow
 *   `useSelector(form.store, …)` for `dirtyFields`/`errors`/`submitCount`.
 * - `SubmitHandler` / `FieldValues` — RHF type aliases; drop them (chelone
 *   forms are generic in the data type).
 */
import { useSelector } from "@tanstack/react-store";
import { useCheloneFormContext, useSourceContext } from "../form-context";

/** Options for {@link useWatch}: the field path RELATIVE to the ambient scope. */
export interface UseWatchOptions {
  /** Field name (RHF parity); resolved through the ambient source scope. */
  name: string;
}

/**
 * Subscribe to a single field's live value on the ambient form (RHF `useWatch`
 * parity). Reads through the ambient `SourceContext` scope, so a relative
 * `name` inside an iterator row resolves to the row's absolute path — matching
 * how `useInput` scopes its own `source`.
 *
 * Reactivity is per-field via `useSelector` over `form.store`: writing a
 * SIBLING field never re-renders this watcher, only a write to `name` does.
 */
export function useWatch<TValue = unknown>(
  options: UseWatchOptions,
): TValue | undefined;
// type-escape: context: the ambient form names no record, so the value is unknown and `TValue` is the caller's claim about it, as in RHF
export function useWatch({ name }: UseWatchOptions): unknown {
  const { ambient } = useCheloneFormContext().form;
  const scope = useSourceContext();
  const source = scope.getSource(name);
  // Selecting via `getFieldValue` (not `s.values[source]`) handles nested/dotted
  // paths through form-core's own path getter. The store subscription re-runs
  // the selector on any form write; value-equality would need a compare fn, but
  // primitives (the common watched shape) already short-circuit re-renders.
  return useSelector(ambient.store, () => ambient.getFieldValue(source));
}

/**
 * `useArrayInput` re-exported under RHF's `useFieldArray` name. The returned
 * `ArrayInputContextValue` differs from RHF's `UseFieldArrayReturn` (`items` vs
 * `fields`, `add` vs `append`, …), so array call sites need a small rewrite —
 * see the module doc.
 */
export { useArrayInput, useArrayInput as useFieldArray } from "../array-hooks";
/**
 * `CheloneFormProvider` re-exported under RHF's `FormProvider` name. Prefer
 * importing `CheloneFormProvider` directly in new code; this alias eases the
 * mechanical port of files that did `import { FormProvider } from
 * "react-hook-form"`.
 */
/**
 * `useCheloneFormContext` re-exported under RHF's `useFormContext` name. The
 * shape is chelone's `{ form, submit }`, not RHF's methods — see the module
 * doc for the per-method mapping.
 */
export {
  CheloneFormProvider as FormProvider,
  useCheloneFormContext,
  useCheloneFormContext as useFormContext,
} from "../form-context";
/**
 * `useInput` re-exported under RHF's `useController` name (the Controller /
 * useController analog). chelone inputs call `useInput({ source })` directly;
 * there is no render-prop `<Controller>` component.
 */
export { useInput, useInput as useController } from "../form-hooks";
