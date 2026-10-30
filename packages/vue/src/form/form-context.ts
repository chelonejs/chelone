/**
 * The ambient form + source-scope contexts for `@chelone/vue` inputs — the Vue
 * twin of `@chelone/react`'s `form-context.tsx` (`CheloneFormProvider` +
 * `useCheloneFormContext` + `SourceContext`). `useForm` provides the form;
 * `useInput` injects it to hang a field binding off it.
 *
 * Idiom translation from the React twin: React threads the form through a
 * `createContext` provider read with `useContext`. Vue `provide`s it once (by
 * `useForm`, in `setup`) under a typed `InjectionKey` and reads it with `inject`,
 * so the inject site is fully typed with no cast. A React context cannot be
 * generic, so — exactly as the React twin does — providers widen their
 * `CheloneFormApi<TFormData>` to the erased `Record<string, unknown>` shape;
 * field paths are runtime strings and values `unknown`, so nothing downstream
 * needs the precise type back.
 */

import type { CheloneFormApi, SourceScope } from "@chelone/core";
import { rootSourceScope } from "@chelone/core";
import { type InjectionKey, inject, provide } from "vue";

/** The erased form-data shape ambient (context-provided) forms carry. */
type UnknownFormValues = Record<string, unknown>;

/**
 * What input consumers need from an ambient form: the FormApi (field bindings
 * hang off it) and the controller's submit pipeline (submit-on-enter, toolbar
 * buttons). Provided by `useForm`.
 */
export interface CheloneFormContextValue {
  form: CheloneFormApi<UnknownFormValues>;
  submit: (() => Promise<void>) | undefined;
}

/**
 * The provide/inject key for the ambient form. `useForm` provides it; `useInput`
 * reads it via {@link useCheloneFormContext}.
 */
export const CheloneFormContextKey: InjectionKey<CheloneFormContextValue> =
  Symbol("chelone-form-context");

/** Provide the ambient form to the subtree (called by `useForm` in `setup`). */
export function provideCheloneForm<TFormData>(value: {
  form: CheloneFormApi<TFormData>;
  submit?: () => Promise<void>;
}): void {
  provide(CheloneFormContextKey, {
    // Erasure cast only — the runtime object is untouched.
    form: value.form as unknown as CheloneFormApi<UnknownFormValues>,
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
