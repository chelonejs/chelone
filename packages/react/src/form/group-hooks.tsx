import {
  createFormGroups,
  type FormGroups,
  type GroupState,
  reduceGroupState,
} from "@chelone/core";
import { useSelector } from "@tanstack/react-store";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { sameDisplayError } from "../field-error";
import { useCheloneFormContext } from "../form-context";

/**
 * FormGroups React layer (P6 W2-T1). Wires the vanilla `createFormGroups`
 * registry (string membership) to the ambient form's `form.store.state
 * .fieldMeta` so a tab/step badge can subscribe to just its members' validity.
 *
 * Subscription discipline (S3): `useFormGroup` runs the reducer INSIDE the
 * consuming badge with `useSelector` + a value-equality compare — editing a
 * field OUTSIDE the group never re-renders the badge, and editing a field
 * INSIDE the group re-renders it only when the aggregated result actually
 * changes (not on every keystroke that leaves validity/dirty unchanged).
 *
 * form-core's FieldGroupApi/FormGroupApi are NOT adopted (plan §0c-3).
 */

const FormGroupsContext = createContext<FormGroups | null>(null);

export interface FormGroupsProviderProps {
  /**
   * An externally created registry (advanced/testing). Omit to have the
   * provider create one lazily — the common case (one registry per form).
   */
  groups?: FormGroups;
  children: ReactNode;
}

/**
 * Provides one {@link FormGroups} registry to the form subtree. Place it below
 * `<CheloneFormProvider>` (grouped inputs register into it, group badges read
 * from it). The registry is created ONCE (a discarded render leaves only an
 * inert registry — no listeners, no subscriptions).
 */
export function FormGroupsProvider({
  groups,
  children,
}: FormGroupsProviderProps) {
  const [created] = useState<FormGroups>(() => groups ?? createFormGroups());
  const registry = groups ?? created;
  return (
    <FormGroupsContext.Provider value={registry}>
      {children}
    </FormGroupsContext.Provider>
  );
}

/** The ambient {@link FormGroups} registry; throws without a provider. */
export function useFormGroups(): FormGroups {
  const registry = useContext(FormGroupsContext);
  if (!registry) {
    throw new Error(
      "useFormGroups: no <FormGroupsProvider> found above this component.",
    );
  }
  return registry;
}

/**
 * Optional-returning variant: the ambient registry, or `undefined` when there
 * is no `<FormGroupsProvider>` above. Inputs use this so `useInput` never
 * throws outside a grouped form.
 */
export function useOptionalFormGroups(): FormGroups | undefined {
  return useContext(FormGroupsContext) ?? undefined;
}

/** The ambient group name a `<FormGroupProvider>` scopes inputs into. */
const FormGroupNameContext = createContext<string | undefined>(undefined);

export interface FormGroupProviderProps {
  /** The group name inputs below auto-register into (tab/step name). */
  name: string;
  children: ReactNode;
}

/**
 * Scopes every `useInput` below into the named group: an input registers its
 * final source on mount and unregisters on unmount. Nest under
 * `<FormGroupsProvider>`. A tab header renders `useFormGroup(name)` for the
 * matching validity badge.
 */
export function FormGroupProvider({ name, children }: FormGroupProviderProps) {
  return (
    <FormGroupNameContext.Provider value={name}>
      {children}
    </FormGroupNameContext.Provider>
  );
}

/** The ambient group name, or `undefined` outside a `<FormGroupProvider>`. */
export function useFormGroupName(): string | undefined {
  return useContext(FormGroupNameContext);
}

/**
 * Registers `source` into the ambient group (name from `<FormGroupProvider>`)
 * on mount and unregisters on unmount — a no-op when there is no ambient group
 * or no registry. `useInput` calls this so grouped inputs join their badge
 * automatically. Registration is de-duped by the registry, so StrictMode's
 * double-invoke and per-render churn never leak members.
 */
export function useRegisterFieldGroup(source: string): void {
  const registry = useOptionalFormGroups();
  const group = useFormGroupName();
  useEffect(() => {
    if (!registry || group === undefined) return;
    registry.register(group, source);
    return () => registry.unregister(group, source);
  }, [registry, group, source]);
}

/** Value-equality for a reduced {@link GroupState} — skips unchanged badge renders. */
function sameGroupState(a: GroupState, b: GroupState): boolean {
  if (a === b) return true;
  if (
    a.isValid !== b.isValid ||
    a.isDirty !== b.isDirty ||
    a.isTouched !== b.isTouched ||
    a.isValidating !== b.isValidating
  ) {
    return false;
  }
  const aKeys = Object.keys(a.errors);
  const bKeys = Object.keys(b.errors);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!(key in b.errors)) return false;
    if (!sameDisplayError(a.errors[key], b.errors[key])) return false;
  }
  return true;
}

/**
 * The reactive aggregated state of the named group (tab/step badge). Reads the
 * ambient form's `fieldMeta` for the group's current members and reduces to
 * `{isValid, isDirty, isTouched, isValidating, errors}`.
 *
 * Isolation: the reducer runs in THIS component via `useSelector` with
 * `sameGroupState` value-equality, so an unrelated field's keystroke (a churn
 * of `fieldMeta` refs) does NOT re-render the badge. A membership change
 * (an input mounting/unmounting) re-runs the reducer with the new member list.
 */
export function useFormGroup(name: string): GroupState {
  const registry = useFormGroups();
  const { form } = useCheloneFormContext();

  // Track membership as an external store so a mount/unmount of a member
  // re-derives with the fresh member list (reference-stable between changes).
  const members = useSyncExternalStore(
    registry.subscribe,
    () => registry.getMembers(name),
    () => registry.getMembers(name),
  );

  // The reducer runs per store notification; `members` is closed over, so the
  // selector identity changes when membership changes → useSelector re-subscribes.
  const selector = useMemo(
    () =>
      (state: { fieldMeta: Record<string, unknown> }): GroupState =>
        reduceGroupState(
          state.fieldMeta as Parameters<typeof reduceGroupState>[0],
          members,
        ),
    [members],
  );

  return useSelector(form.store, selector, { compare: sameGroupState });
}
