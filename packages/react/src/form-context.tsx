import type {
  CheloneFormApi,
  FormContextHandle,
  FormHandle,
  SourceScope,
  UnboundFormHandle,
} from "@chelone/core";
import {
  createFormHandle,
  rootSourceScope,
  toFormContextHandle,
} from "@chelone/core";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/**
 * What input consumers need from an ambient form: the tagged handle (field
 * bindings hang off `handle.ambient`) and the controller's submit pipeline
 * (for submit-on-enter and toolbar buttons — P7 UI). Provided by
 * `<CheloneFormProvider>`.
 */
export interface CheloneFormContextValue {
  form: FormContextHandle;
  submit: (() => Promise<void>) | undefined;
}

const CheloneFormContext = createContext<CheloneFormContextValue | null>(null);

/** The handle of a form no resource owns. */
function toUnboundHandle(handle: FormHandle<unknown>): UnboundFormHandle {
  return { ...handle, resource: undefined };
}

export interface CheloneFormProviderProps<TFormData> {
  /** The form to expose — `useForm`/`useEditForm`/`useCreateForm`'s `.form`. */
  form: CheloneFormApi<TFormData>;
  /**
   * The resource the form edits, which tags the handle in context. Leave it out
   * for a form no resource owns (`useForm`): the handle is then unbound.
   */
  resource?: string;
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
  resource,
  submit,
  children,
}: CheloneFormProviderProps<TFormData>) {
  const value = useMemo<CheloneFormContextValue>(() => {
    const handle = createFormHandle(form);
    return {
      form:
        resource === undefined
          ? toUnboundHandle(handle)
          : toFormContextHandle(handle, resource),
      submit,
    };
  }, [form, resource, submit]);
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
export function useOptionalCheloneFormContext(): CheloneFormContextValue | null {
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
