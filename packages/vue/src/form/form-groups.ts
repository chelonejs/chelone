/**
 * FormGroups Vue layer — the twin of `@chelone/react`'s `group-hooks.tsx`. Wires
 * core's string-membership `createFormGroups` registry to the ambient form's
 * `form.store.state.fieldMeta` so a tab/step badge reads just its own members'
 * validity.
 *
 * `useFormGroup` runs the reducer inside the consuming badge and swaps its ref
 * only when the aggregate differs by value, so a keystroke in a field outside
 * the group never wakes the badge.
 */

import {
  createFormGroups,
  type FormGroups,
  type GroupState,
  reduceGroupState,
  type TranslatableMessage,
} from "@chelone/core";
import {
  type InjectionKey,
  inject,
  onScopeDispose,
  provide,
  type Ref,
  shallowRef,
} from "vue";
import { useCheloneFormContext } from "./form-context";
import { subscribeStore } from "./subscribe-ref";

const FormGroupsKey: InjectionKey<FormGroups> = Symbol("chelone-form-groups");
const FormGroupNameKey: InjectionKey<string> = Symbol(
  "chelone-form-group-name",
);

/**
 * Provides one {@link FormGroups} registry to the subtree and returns it. Made
 * with `createFormGroups()` unless an external registry is passed.
 */
export function provideFormGroups(groups?: FormGroups): FormGroups {
  const registry = groups ?? createFormGroups();
  provide(FormGroupsKey, registry);
  return registry;
}

/** The ambient {@link FormGroups} registry; throws without a provider. */
export function useFormGroups(): FormGroups {
  const registry = inject(FormGroupsKey, null);
  if (!registry) {
    throw new Error(
      "useFormGroups: no <FormGroupsProvider> found above this component.",
    );
  }
  return registry;
}

/** The ambient registry, or `undefined` so `useInput` never throws outside a grouped form. */
export function useOptionalFormGroups(): FormGroups | undefined {
  return inject(FormGroupsKey, null) ?? undefined;
}

/** Scopes every `useInput` below into the group `name`. */
export function provideFormGroup(name: string): void {
  provide(FormGroupNameKey, name);
}

/** The ambient group name, or `undefined` outside a `<FormGroupProvider>`. */
export function useFormGroupName(): string | undefined {
  return inject(FormGroupNameKey, undefined);
}

/**
 * Registers `source` into the ambient group in setup and unregisters on scope
 * disposal. Does nothing without a registry or a group name.
 */
export function useRegisterFieldGroup(source: string): void {
  const registry = useOptionalFormGroups();
  const group = useFormGroupName();
  if (!registry || group === undefined) return;
  registry.register(group, source);
  onScopeDispose(() => registry.unregister(group, source));
}

type DisplayError = string | TranslatableMessage;

function sameDisplayError(a: DisplayError, b: DisplayError): boolean {
  if (a === b) return true;
  if (typeof a === "string" || typeof b === "string") return false;
  if (a.message !== b.message) return false;
  const aArgs = a.args ?? {};
  const bArgs = b.args ?? {};
  const aKeys = Object.keys(aArgs);
  if (aKeys.length !== Object.keys(bArgs).length) return false;
  return aKeys.every((key) => aArgs[key] === bArgs[key]);
}

function sameGroupState(a: GroupState, b: GroupState): boolean {
  if (
    a.isValid !== b.isValid ||
    a.isDirty !== b.isDirty ||
    a.isTouched !== b.isTouched ||
    a.isValidating !== b.isValidating
  ) {
    return false;
  }
  const aKeys = Object.keys(a.errors);
  if (aKeys.length !== Object.keys(b.errors).length) return false;
  return aKeys.every((key) => {
    const other = b.errors[key];
    return (
      other !== undefined &&
      sameDisplayError(a.errors[key] as DisplayError, other)
    );
  });
}

/**
 * The reactive aggregated state of the named group (tab/step badge), reduced
 * over the ambient form's `fieldMeta` for the group's current members.
 */
export function useFormGroup(name: string): Readonly<Ref<GroupState>> {
  const registry = useFormGroups();
  const { form } = useCheloneFormContext();

  const reduce = (): GroupState =>
    reduceGroupState(
      form.store.state.fieldMeta as Parameters<typeof reduceGroupState>[0],
      registry.getMembers(name),
    );

  const state = shallowRef<GroupState>(reduce());
  const refresh = (): void => {
    const next = reduce();
    if (!sameGroupState(state.value, next)) state.value = next;
  };

  const stopStore = subscribeStore(form.store, refresh);
  const stopRegistry = registry.subscribe(refresh);
  onScopeDispose(() => {
    stopStore();
    stopRegistry();
  });
  return state;
}
