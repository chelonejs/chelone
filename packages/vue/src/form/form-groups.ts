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
  computed,
  type InjectionKey,
  inject,
  type MaybeRefOrGetter,
  onScopeDispose,
  provide,
  type Ref,
  shallowRef,
  toValue,
  watch,
  watchEffect,
} from "vue";
import { useCheloneFormContext } from "./form-context";
import { subscribeStore } from "./subscribe-ref";

const FormGroupsKey: InjectionKey<Readonly<Ref<FormGroups>>> = Symbol(
  "chelone-form-groups",
);
const FormGroupNameKey: InjectionKey<Readonly<Ref<string>>> = Symbol(
  "chelone-form-group-name",
);

/**
 * Provides one {@link FormGroups} registry to the subtree and returns the one
 * in effect now. Made with `createFormGroups()` unless an external registry is
 * passed. Pass a ref or getter to follow a changing prop: consumers switch to
 * the new registry.
 */
export function provideFormGroups(
  groups?: MaybeRefOrGetter<FormGroups | undefined>,
): FormGroups {
  let created: FormGroups | undefined;
  const registry = computed(() => {
    const given = toValue(groups);
    if (given) return given;
    created ??= createFormGroups();
    return created;
  });
  provide(FormGroupsKey, registry);
  return registry.value;
}

/** The ambient registry as a ref, so consumers can follow a swapped registry. */
function useFormGroupsRef(): Readonly<Ref<FormGroups>> | undefined {
  return inject(FormGroupsKey, null) ?? undefined;
}

/** The ambient {@link FormGroups} registry; throws without a provider. */
export function useFormGroups(): FormGroups {
  const registry = useFormGroupsRef();
  if (!registry) {
    throw new Error(
      "useFormGroups: no <FormGroupsProvider> found above this component.",
    );
  }
  return registry.value;
}

/** The ambient registry, or `undefined` so `useInput` never throws outside a grouped form. */
export function useOptionalFormGroups(): FormGroups | undefined {
  return useFormGroupsRef()?.value;
}

/**
 * Scopes every `useInput` below into the group `name`. Pass a ref or getter to
 * follow a changing prop: inputs move to the new group.
 */
export function provideFormGroup(name: MaybeRefOrGetter<string>): void {
  provide(
    FormGroupNameKey,
    computed(() => toValue(name)),
  );
}

/** The ambient group name as a ref, `undefined` outside a `<FormGroupProvider>`. */
export function useFormGroupName(): Readonly<Ref<string | undefined>> {
  return computed(() => inject(FormGroupNameKey, undefined)?.value);
}

/**
 * Registers `source` into the ambient group in setup, re-registers when the
 * group or registry changes, and unregisters on scope disposal. Does nothing
 * without a registry or a group name.
 */
export function useRegisterFieldGroup(source: string): void {
  const registry = useFormGroupsRef();
  const group = inject(FormGroupNameKey, undefined);
  if (!registry || !group) return;
  watchEffect(
    (onCleanup) => {
      const target = registry.value;
      const name = group.value;
      target.register(name, source);
      onCleanup(() => target.unregister(name, source));
    },
    { flush: "sync" },
  );
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
 * over the ambient form's `fieldMeta` for the group's current members. Pass a
 * ref or getter for `name` to follow a changing prop.
 */
export function useFormGroup(
  name: MaybeRefOrGetter<string>,
): Readonly<Ref<GroupState>> {
  useFormGroups();
  const registry = useFormGroupsRef() as Readonly<Ref<FormGroups>>;
  const { form } = useCheloneFormContext();

  const reduce = (): GroupState =>
    reduceGroupState(
      form.store.state.fieldMeta as Parameters<typeof reduceGroupState>[0],
      registry.value.getMembers(toValue(name)),
    );

  const state = shallowRef<GroupState>(reduce());
  const refresh = (): void => {
    const next = reduce();
    if (!sameGroupState(state.value, next)) state.value = next;
  };

  const stopStore = subscribeStore(form.store, refresh);
  // Re-subscribes when the registry is swapped; refreshes when `name` changes.
  const stopWatch = watch(
    [registry, () => toValue(name)],
    (_, __, onCleanup) => {
      onCleanup(registry.value.subscribe(refresh));
      refresh();
    },
    { immediate: true, flush: "sync" },
  );
  onScopeDispose(() => {
    stopStore();
    stopWatch();
  });
  return state;
}
