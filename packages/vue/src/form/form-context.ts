/**
 * The ambient form + source-scope contexts for `@chelone/vue` inputs — the Vue
 * twin of `@chelone/react`'s `form-context.tsx` (`CheloneFormProvider` +
 * `useCheloneFormContext` + `SourceContext`). `useForm` provides the form;
 * `useInput` injects it to hang a field binding off it.
 *
 * Idiom translation from the React twin: React threads the form through a
 * `createContext` provider read with `useContext`. Vue `provide`s it once (by
 * `useForm`, in `setup`) under a typed `InjectionKey` and reads it with `inject`,
 * so the inject site is fully typed with no cast. A context spans every record
 * below it, so it carries a {@link FormContextHandle}: a union of record-typed
 * handles tagged by resource, plus the unbound handle of a form with no
 * resource. A library input reads `form.ambient`, which every member has; app
 * code narrows with {@link useFormHandle}.
 */

import type {
  AnyFormHandle,
  CheloneFormApi,
  FormContextHandle,
  RegisteredResourceName,
  ResourceFormHandle,
  SourceScope,
} from "@chelone/core";
import {
  createFormHandle,
  isResourceHandle,
  rootSourceScope,
  toFormContextHandle,
} from "@chelone/core";
import { type InjectionKey, inject, provide } from "vue";

/**
 * What input consumers need from an ambient form: the handle (field bindings
 * hang off its `ambient`) and the controller's submit pipeline (submit-on-enter,
 * toolbar buttons). Provided by `useForm`.
 */
export interface CheloneFormContextValue {
  form: FormContextHandle;
  submit: (() => Promise<void>) | undefined;
}

/**
 * The provide/inject key for the ambient form. `useForm` provides it; `useInput`
 * reads it via {@link useCheloneFormContext}.
 */
export const CheloneFormContextKey: InjectionKey<CheloneFormContextValue> =
  Symbol("chelone-form-context");

/**
 * Provide the ambient form to the subtree (called by `useForm` in `setup`).
 * `resource` tags the handle; a form with none provides the unbound handle.
 */
export function provideCheloneForm<TFormData>(value: {
  form: CheloneFormApi<TFormData>;
  submit?: () => Promise<void>;
  resource?: string;
}): void {
  provide(CheloneFormContextKey, {
    form: toFormContextHandle(createFormHandle(value.form), value.resource),
    submit: value.submit,
  });
}

/** The ambient form context; throws without a `useForm` provider above. */
export function useCheloneFormContext(): CheloneFormContextValue {
  const ctx = inject(CheloneFormContextKey, null);
  if (!ctx) {
    throw new Error(
      "useCheloneFormContext: no ambient form found. Call useForm() in an " +
        "ancestor setup() (e.g. an <Edit>/<Create> view) above this input.",
    );
  }
  return ctx;
}

/** The ambient form context, or `null` when no `useForm` provider is above. */
export function useOptionalCheloneFormContext(): CheloneFormContextValue | null {
  return inject(CheloneFormContextKey, null);
}

/**
 * The member of the handle union `THandle` that edits `TName`. A union that
 * names no such member (nothing registered) falls back to a bare
 * {@link ResourceFormHandle}, whose values are unchecked.
 */
export type NamedFormHandle<
  THandle extends AnyFormHandle,
  TName extends string,
> = [Extract<THandle, { resource: TName }>] extends [never]
  ? ResourceFormHandle<TName>
  : Extract<THandle, { resource: TName }>;

/**
 * The ambient form handle: the whole {@link FormContextHandle} union without a
 * name, or the member that edits `name`, narrowed to its record, with one. The
 * named form is `undefined` when the ambient form edits another resource or
 * none. Throws without a `useForm` provider above.
 */
export function useFormHandle(): FormContextHandle;
export function useFormHandle<TName extends RegisteredResourceName>(
  name: TName,
): NamedFormHandle<FormContextHandle, TName> | undefined;
export function useFormHandle<TName extends RegisteredResourceName>(
  name?: TName,
): FormContextHandle | undefined {
  const { form } = useCheloneFormContext();
  if (name === undefined) return form;
  return isResourceHandle(form, name) ? form : undefined;
}

/**
 * The provide/inject key for the ambient source scope (ra's SourceContext).
 * Composed inputs (iterator rows, grouped inputs — a later wave) prefix their
 * children's `source`; the default is the identity scope, so top-level inputs
 * need no provider. The scope OBJECT comes from core
 * (`createRowSourceScope`/`createArraySourceScope`) — this file only transports
 * it.
 */
export const SourceScopeKey: InjectionKey<SourceScope> = Symbol(
  "chelone-source-scope",
);

/** Scopes every `useInput`/`useWrappedSource` below to `scope`. */
export function provideSourceScope(scope: SourceScope): void {
  provide(SourceScopeKey, scope);
}

/** The ambient source scope — the identity scope when no provider is above. */
export function useSourceScope(): SourceScope {
  return inject(SourceScopeKey, rootSourceScope);
}

/** The FINAL field path for `source` under the ambient scope (ra parity). */
export function useWrappedSource(source: string): string {
  return useSourceScope().getSource(source);
}
