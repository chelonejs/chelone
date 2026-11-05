import type {
  AmbientForm,
  ArrayBinding,
  ArrayBindingUpdateOptions,
  ArrayRow,
  SourcePath,
  SourceScope,
  TranslatableMessage,
} from "@chelone/core";
import { createArraySourceScope, createRowSourceScope } from "@chelone/core";
import { useSelector } from "@tanstack/react-store";
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { firstFieldError, sameDisplayError } from "./field-error";
import {
  SourceContextProvider,
  useCheloneFormContext,
  useSourceContext,
} from "./form-context";

/** Constant snapshot for mount-driving subscriptions — never re-renders. */
const attachSnapshot = (): true => true;

/**
 * The commit-phase ATTACH DRIVER (shared with `useInput`): the subscribe
 * performs the refcounted attach (first subscriber mounts the array field,
 * last unsubscribe unmounts — the ratified 4R lifecycle). The constant
 * snapshot means this subscription NEVER re-renders; reactivity is the narrow
 * structural subscription below.
 */
function useAttach(subscribe: (listener: () => void) => () => void): void {
  useSyncExternalStore(subscribe, attachSnapshot, attachSnapshot);
}

export interface UseArrayInputOptions<TRecord = unknown>
  extends ArrayBindingUpdateOptions {
  /** The array field path RELATIVE to the ambient source scope. */
  source: SourcePath<TRecord>;
}

/** The array field's own error state (min-length validators, etc.). */
export interface ArrayFieldState {
  invalid: boolean;
  isTouched: boolean;
  isDirty: boolean;
  /** The first array-field error, normalized to a displayable/translatable payload. */
  error: string | TranslatableMessage | undefined;
}

/** ra-parity iterator surface: the row set plus the op verbs. */
export interface UseArrayInputResult {
  /** The array field path (final, source-scoped). */
  source: string;
  /** Stable-id rows — reference-stable until the row STRUCTURE changes. */
  rows: readonly ArrayRow[];
  /** The current row count. */
  total: number;
  /** The scope children bind under (the array's own path). */
  scope: SourceScope;
  /** Appends a row (scalar `''`, object first-row-keys-nulled + defaults). */
  add(item?: unknown): void;
  insert(index: number, item?: unknown): void;
  replace(index: number, item: unknown): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  reOrder(from: number, to: number): void;
  clear(): void;
  fieldState: ArrayFieldState;
}

/** One binding per (form, final source) pair — the useArrayInput identity key. */
interface ArrayBindingHolder {
  form: AmbientForm;
  binding: ArrayBinding<unknown>;
}

function toBindingUpdate<TRecord>(
  options: UseArrayInputOptions<TRecord>,
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

/**
 * The array-input workhorse (ra's ArrayInput iterator rebridged onto
 * form-core arrays).
 *
 * Consumes the ambient `<CheloneFormProvider>` form and SourceContext scope.
 * Follows the `useInput` binding shape over the ratified 4R lifecycle: the
 * {@link ArrayBinding} (T6) is constructed INERTLY in a render-phase
 * `useState` and RECREATED when the form or the final source changes; the
 * commit-phase attach driver routes `field.mount()` through the binding's
 * refcounted subscribe (never a bare render-phase mount). Row re-render
 * reactivity is the binding's STRUCTURAL subscription (`_arrayVersion` / length
 * bumps only) — typing into a row never re-renders the iterator, and the row
 * set is reference-stable between structure changes so React reuses fibers by
 * `row.id`.
 */
export function useArrayInput<TRecord>(
  options: UseArrayInputOptions<TRecord>,
): UseArrayInputResult;
export function useArrayInput(
  options: UseArrayInputOptions,
): UseArrayInputResult;
export function useArrayInput<TRecord>(
  options: UseArrayInputOptions<TRecord>,
): UseArrayInputResult {
  const { ambient: form } = useCheloneFormContext().form;
  const parentScope = useSourceContext();
  const source = parentScope.getSource(options.source);

  const [holder, setHolder] = useState<ArrayBindingHolder>(() => ({
    form,
    binding: form.bindArray({
      ...toBindingUpdate(options),
      source,
    }),
  }));
  let active = holder;
  if (active.form !== form || active.binding.source !== source) {
    // Render-phase derived-state reset (react-form recreates the same way).
    active = {
      form,
      binding: form.bindArray({
        ...toBindingUpdate(options),
        source,
      }),
    };
    setHolder(active);
  }
  const { binding } = active;

  useAttach(binding.subscribe);

  // Structural reactivity: re-render only when the row set changes.
  const rows = useSyncExternalStore(
    binding.subscribe,
    binding.getRows,
    binding.getRows,
  );
  const total = useSyncExternalStore(
    binding.subscribe,
    binding.getTotal,
    binding.getTotal,
  );

  // Array-field error slices over the identity-memoized field.store.
  const fieldStore = binding.field.store;
  const isTouched = useSelector(fieldStore, (s) => s.meta.isTouched);
  const isDirty = useSelector(fieldStore, (s) => s.meta.isDirty);
  // Subscribe to the DISPLAYABLE error (not the raw errorMap object) with
  // value-equality: a form/array-level validator rewrites the array field's
  // errorMap ref per keystroke, but the iterator must NOT re-render unless its
  // own displayed message changes (mirrors useInput; see field-error.ts).
  const error = useSelector(
    fieldStore,
    (s) => firstFieldError(s.meta.errorMap),
    { compare: sameDisplayError },
  );

  // Freshness after every commit — deliberately no dependency array.
  useEffect(() => {
    binding.update(toBindingUpdate(options));
  });

  // The scope children bind under: the array's own (scoped) path. An iterator
  // row layers `createRowSourceScope` on top of this (see IteratorRowProvider).
  const scope = useMemo(
    () => createArraySourceScope(parentScope, options.source),
    [parentScope, options.source],
  );

  return useMemo(
    () => ({
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
        invalid: error !== undefined,
        isTouched,
        isDirty,
        error,
      },
    }),
    [source, rows, total, scope, binding, error, isTouched, isDirty],
  );
}

/**
 * Ambient array-input context: the iterator + row op verbs an iterator row
 * needs (via {@link useIteratorItem}). Provided by {@link ArrayInputProvider}.
 */
export interface ArrayInputContextValue {
  total: number;
  /** Removes the row at `index`. */
  remove(index: number): void;
  /** Moves the row at `from` to `to`. */
  reOrder(from: number, to: number): void;
}

const ArrayInputContext = createContext<ArrayInputContextValue | null>(null);

export interface ArrayInputProviderProps {
  array: UseArrayInputResult;
  children: ReactNode;
}

/**
 * Provides the array iterator to its rows and scopes children under the
 * array's own path (so a scalar `<input source="">` binds the array field).
 * Wrap the mapped {@link IteratorRowProvider}s in this.
 */
export function ArrayInputProvider({
  array,
  children,
}: ArrayInputProviderProps): ReactNode {
  const value = useMemo<ArrayInputContextValue>(
    () => ({
      total: array.total,
      remove: array.remove,
      reOrder: array.reOrder,
    }),
    [array.total, array.remove, array.reOrder],
  );
  return createElement(
    ArrayInputContext.Provider,
    { value },
    createElement(SourceContextProvider, { scope: array.scope, children }),
  );
}

/** The ambient array-input context; throws without an `<ArrayInputProvider>`. */
function useArrayInputContext(): ArrayInputContextValue {
  const ctx = useContext(ArrayInputContext);
  if (!ctx) {
    throw new Error(
      "useIteratorItem: no <ArrayInputProvider> found above this row.",
    );
  }
  return ctx;
}

/** What a single iterator row exposes to its children (ra's iterator item). */
export interface IteratorItem {
  /** The row's current position. */
  index: number;
  /** The total row count. */
  total: number;
  /** Removes THIS row. */
  remove(): void;
  /** Moves THIS row to `newIndex`. */
  reOrder(newIndex: number): void;
}

const IteratorRowContext = createContext<ArrayRow | null>(null);

export interface IteratorRowProviderProps {
  row: ArrayRow;
  children: ReactNode;
}

/**
 * Wraps one iterator row: exposes it to {@link useIteratorItem} and scopes
 * children under `${arraySource}[${index}]` (so `<input source="sku">` binds
 * `items[0].sku`, and a sourceless scalar child binds `tags[0]`). Labels stay
 * index-free (`items.sku`) — one catalog entry per field.
 *
 * Key each mapped provider with `row.id` (NOT the index) so React reuses the
 * fiber through reorders, preserving focus and DOM node identity.
 */
export function IteratorRowProvider({
  row,
  children,
}: IteratorRowProviderProps): ReactNode {
  const parentScope = useSourceContext();
  const scope = useMemo(
    () => createRowSourceScope(parentScope, row.index),
    [parentScope, row.index],
  );
  return createElement(
    IteratorRowContext.Provider,
    { value: row },
    createElement(SourceContextProvider, { scope, children }),
  );
}

/**
 * The current iterator row: `{ index, total, remove, reOrder }`. Throws
 * outside an {@link IteratorRowProvider}. `remove`/`reOrder` act on THIS row.
 */
export function useIteratorItem(): IteratorItem {
  const row = useContext(IteratorRowContext);
  if (!row) {
    throw new Error(
      "useIteratorItem: no <IteratorRowProvider> found above this component.",
    );
  }
  const array = useArrayInputContext();
  return useMemo(
    () => ({
      index: row.index,
      total: array.total,
      remove: () => array.remove(row.index),
      reOrder: (newIndex: number) => array.reOrder(row.index, newIndex),
    }),
    [row, array],
  );
}
