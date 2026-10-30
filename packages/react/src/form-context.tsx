import type { CheloneFormApi, SourceScope } from "@chelone/core";
import { rootSourceScope } from "@chelone/core";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/**
 * The erased form-data shape context transport uses: a React context cannot
 * be generic, so providers widen their `CheloneFormApi<TFormData>` to this.
 * Field paths are runtime strings and field values `unknown`, so nothing
 * downstream (useInput, field bindings) needs the precise type back.
 */
type UnknownFormValues = Record<string, unknown>;

/**
 * What input consumers need from an ambient form: the FormApi (field bindings
 * hang off it) and the controller's submit pipeline (for submit-on-enter and
 * toolbar buttons — P7 UI). Provided by `<CheloneFormProvider>`.
 */
export interface CheloneFormContextValue {
  form: CheloneFormApi<UnknownFormValues>;
  submit: (() => Promise<void>) | undefined;
}

const CheloneFormContext = createContext<CheloneFormContextValue | null>(null);

export interface CheloneFormProviderProps<TFormData> {
  /** The form to expose — `useForm`/`useEditForm`/`useCreateForm`'s `.form`. */
  form: CheloneFormApi<TFormData>;
  /** The controller submit pipeline — the hooks' `.submit`. */
  submit?: () => Promise<void>;
  children: ReactNode;
}

/**
 * Provides the ambient form to `useInput` consumers below. The context value
 * is memoized on `form`/`submit` identities — both are stable on the form
 * hooks' results, so providing a form never re-renders memoized inputs.
 */
export function CheloneFormProvider<TFormData>({
  form,
  submit,
  children,
}: CheloneFormProviderProps<TFormData>) {
  const value = useMemo<CheloneFormContextValue>(
    () => ({
      // Erasure cast only — the runtime object is untouched.
      form: form as unknown as CheloneFormApi<UnknownFormValues>,
      submit,
    }),
    [form, submit],
  );
  return (
    <CheloneFormContext.Provider value={value}>
      {children}
    </CheloneFormContext.Provider>
  );
}

/** The ambient form context; throws without a `<CheloneFormProvider>` above. */
export function useCheloneFormContext(): CheloneFormContextValue {
  const ctx = useContext(CheloneFormContext);
  if (!ctx) {
    throw new Error(
      "useCheloneFormContext: no <CheloneFormProvider> found above this component.",
    );
  }
  return ctx;
}

/** The ambient form context, or `null` when no provider is above. */
export function useOptionalCheloneFormContext():CheloneFormContextValue | null {
  return useContext(CheloneFormContext);
}

/**
 * Source scoping (ra's SourceContext): composed inputs (iterator rows,
 * grouped inputs) prefix their children's `source`. Defaults to the identity
 * scope, so top-level inputs need no provider. The scope OBJECT comes from
 * core (`createRowSourceScope`/`createArraySourceScope`) — this file only
 * transports it.
 */
const SourceContext = createContext<SourceScope>(rootSourceScope);

export interface SourceContextProviderProps {
  scope: SourceScope;
  children: ReactNode;
}

/** Scopes every `useInput`/`useWrappedSource` below to `scope`. */
export function SourceContextProvider({
  scope,
  children,
}: SourceContextProviderProps) {
  return (
    <SourceContext.Provider value={scope}>{children}</SourceContext.Provider>
  );
}

/** The ambient source scope — the identity scope when no provider is above. */
export function useSourceContext(): SourceScope {
  return useContext(SourceContext);
}

/** The FINAL field path for `source` under the ambient scope (ra parity). */
export function useWrappedSource(source: string): string {
  return useSourceContext().getSource(source);
}
