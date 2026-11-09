/**
 * `useArrayInput` — the array-input workhorse, the Vue twin of `@chelone/react`'s
 * `useArrayInput` (`array-hooks.ts`, ra's ArrayInput iterator rebridged onto
 * form-core arrays). It binds ONE array field to the ambient form through a
 * vanilla {@link ArrayBinding}, exposing stable-id rows plus the ra iterator op
 * verbs (add/insert/replace/remove/swap/reOrder/clear) and the array field's own
 * error state.
 *
 * Idiom translation from the React twin: React holds the binding in `useState`
 * and recreates it on form/source change, drives the 4R attach via a constant
 * `useSyncExternalStore`, and reads rows/total through a STRUCTURAL
 * `useSyncExternalStore` (re-renders only on row-set changes, never on row value
 * edits). Vue's `setup` runs once with a stable form + source, so the binding is
 * constructed once; the structural `subscribe` drives both the 4R attach (first
 * subscriber mounts the array field) AND the row/total `shallowRef`s — because
 * `getRows()` is reference-stable between structure changes, assigning the same
 * cached array is a no-op, so a row value edit never re-renders the iterator. The
 * array field's error/meta ride a separate {@link useSubscribable} over the field
 * binding, projected through `computed`.
 */

import type {
  ArrayBindingUpdateOptions,
  ArrayItemOf,
  ArrayRow,
  CheloneFieldState,
  SourcePath,
  SourceScope,
  TranslatableMessage,
} from "@chelone/core";
import { createArraySourceScope } from "@chelone/core";
import {
  type ComputedRef,
  computed,
  onScopeDispose,
  type Ref,
  shallowRef,
  watchEffect,
} from "vue";
import { firstFieldError } from "../form/field-error";
import { useCheloneFormContext, useSourceScope } from "../form/form-context";
import { useSubscribable } from "../form/subscribe-ref";

export interface UseArrayInputOptions<
  TRecord = unknown,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
> extends ArrayBindingUpdateOptions {
  /** The array field path RELATIVE to the ambient source scope. */
  source: TPath;
}

/** The array field's own reactive error state (min-length validators, etc.). */
export interface ArrayFieldState {
  invalid: ComputedRef<boolean>;
  isTouched: ComputedRef<boolean>;
  isDirty: ComputedRef<boolean>;
  /** The first array-field error, normalized to a displayable/translatable payload. */
  error: ComputedRef<string | TranslatableMessage | undefined>;
}

/** ra-parity iterator surface: the reactive row set plus the op verbs. */
export interface UseArrayInputResult<TItem = unknown> {
  /** The array field path (final, source-scoped). */
  source: string;
  /** Stable-id rows — reference-stable until the row STRUCTURE changes. */
  rows: Readonly<Ref<readonly ArrayRow[]>>;
  /** The current row count. */
  total: Readonly<Ref<number>>;
  /** The scope children bind under (the array's own path). */
  scope: SourceScope;
  /** Appends a row (scalar `''`, object first-row-keys-nulled + defaults). */
  add(item?: TItem): void;
  insert(index: number, item?: TItem): void;
  replace(index: number, item: TItem): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  reOrder(from: number, to: number): void;
  clear(): void;
  fieldState: ArrayFieldState;
}

function toBindingUpdate<TRecord, TPath extends SourcePath<TRecord>>(
  options: UseArrayInputOptions<TRecord, TPath>,
  // type-escape: context: the ambient form names no record.
): ArrayBindingUpdateOptions<unknown> {
  return {
    defaultValue: options.defaultValue,
    scalar: options.scalar,
    itemDefaults: options.itemDefaults,
    validate: options.validate,
    schema: options.schema,
    validatorMeta: options.validatorMeta,
  };
}

export function useArrayInput<
  TRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
>(
  options: UseArrayInputOptions<TRecord, TPath>,
): UseArrayInputResult<ArrayItemOf<TRecord, TPath>>;
export function useArrayInput(
  options: UseArrayInputOptions,
): UseArrayInputResult;
export function useArrayInput<
  TRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
>(
  options: UseArrayInputOptions<TRecord, TPath>,
): UseArrayInputResult<ArrayItemOf<TRecord, TPath>> {
  const { form } = useCheloneFormContext();
  const parentScope = useSourceScope();
  const source = parentScope.getSource(options.source);

  const binding = form.ambient.bindArray({
    ...toBindingUpdate(options),
    source,
  });

  // Structural reactivity + 4R attach: the binding's `subscribe` mounts the
  // array field on the first subscriber and notifies ONLY on row-structure
  // changes. `getRows()` is reference-stable between structure changes, so a
  // row value edit re-assigns the identical array — a shallowRef no-op.
  const rows = shallowRef<readonly ArrayRow[]>(binding.getRows());
  const total = shallowRef<number>(binding.getTotal());
  const unsubscribe = binding.subscribe(() => {
    rows.value = binding.getRows();
    total.value = binding.getTotal();
  });
  onScopeDispose(unsubscribe);

  // The array field's own state (min-length errors, touched/dirty) — a separate
  // subscription over the field binding, refcounting the SAME field mount.
  // type-escape: context: the ambient form names no record.
  const fieldState = useSubscribable<CheloneFieldState<unknown>>(binding.field);

  // Render-freshness: re-apply non-source options every time a tracked option
  // field changes (validators/itemDefaults/…). Runs once for a plain object.
  watchEffect(() => binding.update(toBindingUpdate(options)));

  // The scope children bind under: the array's own (scoped) path. An iterator
  // row layers `createRowSourceScope` on top (see provideIteratorRow).
  const scope = createArraySourceScope(parentScope, options.source);

  const error = computed(() => firstFieldError(fieldState.value.meta.errorMap));

  return {
    source,
    rows,
    total,
    scope,
    add: binding.add,
    insert: binding.insert,
    replace: binding.replace,
    remove: binding.remove,
    swap: binding.swap,
    reOrder: binding.reOrder,
    clear: binding.clear,
    fieldState: {
      invalid: computed(() => error.value !== undefined),
      isTouched: computed(() => fieldState.value.meta.isTouched),
      isDirty: computed(() => fieldState.value.meta.isDirty),
      error,
    },
  };
}
