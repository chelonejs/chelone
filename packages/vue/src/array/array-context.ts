/**
 * The array-input iterator contexts — the Vue twin of `@chelone/react`'s
 * `ArrayInputProvider` / `IteratorRowProvider` / `useIteratorItem`
 * (`array-hooks.ts`). They carry the iterator + per-row op verbs down to an
 * iterator row, and scope each row's children under `${arraySource}[${index}]`
 * so a child `<input source="sku">` binds `items[0].sku` (and a sourceless
 * scalar child binds `tags[0]`).
 *
 * Idiom translation from the React twin: React threads two `createContext`
 * providers (the array iterator + the current row) and wraps children in a
 * `SourceContextProvider`. Vue `provide`s each under a typed `InjectionKey`;
 * {@link provideArrayInput} and {@link provideIteratorRow} additionally
 * `provideSourceScope` (the array's scope, then the row's `[index]` layer) — the
 * two responsibilities React's `<…Provider>` components fold together. `total`
 * travels as a reactive ref so a row reading it re-renders on structure changes.
 */

import type { ArrayRow } from "@chelone/core";
import { createRowSourceScope } from "@chelone/core";
import { type InjectionKey, inject, provide, type Ref } from "vue";
import { provideSourceScope, useSourceScope } from "../form/form-context";
import type { UseArrayInputResult } from "./use-array-input";

/** The iterator + per-row op verbs an iterator row consumes via {@link useIteratorItem}. */
export interface ArrayInputContextValue {
  /** The reactive row count. */
  total: Readonly<Ref<number>>;
  /** Removes the row at `index`. */
  remove(index: number): void;
  /** Moves the row at `from` to `to`. */
  reOrder(from: number, to: number): void;
}

/** The provide/inject key for the ambient array iterator. */
export const ArrayInputContextKey: InjectionKey<ArrayInputContextValue> =
  Symbol("chelone-array-input-context");

/**
 * Provides the array iterator to its rows AND scopes children under the array's
 * own path (so a scalar `<input source="">` binds the array field). Call in the
 * array-input component's `setup`, then render one {@link provideIteratorRow}
 * per row.
 */
export function provideArrayInput(array: UseArrayInputResult): void {
  provide(ArrayInputContextKey, {
    total: array.total,
    remove: array.remove,
    reOrder: array.reOrder,
  });
  provideSourceScope(array.scope);
}

/** The ambient array iterator; throws without a {@link provideArrayInput} above. */
function useArrayInputContext(): ArrayInputContextValue {
  const ctx = inject(ArrayInputContextKey, null);
  if (!ctx) {
    throw new Error(
      "useIteratorItem: no provideArrayInput() found above this row.",
    );
  }
  return ctx;
}

/** The provide/inject key for the current iterator row. */
export const IteratorRowContextKey: InjectionKey<ArrayRow> = Symbol(
  "chelone-iterator-row",
);

/**
 * Wraps one iterator row: exposes it to {@link useIteratorItem} and scopes
 * children under `${arraySource}[${index}]` (labels stay index-free — the row
 * scope passes labels through unchanged). Call in a row component whose instance
 * is keyed by `row.id` (NOT the index) so Vue reuses it through reorders,
 * preserving focus and DOM identity.
 */
export function provideIteratorRow(row: ArrayRow): void {
  const parentScope = useSourceScope();
  provide(IteratorRowContextKey, row);
  provideSourceScope(createRowSourceScope(parentScope, row.index));
}

/** What a single iterator row exposes to its children (ra's iterator item). */
export interface IteratorItem {
  /** The row's current position. */
  index: number;
  /** The reactive total row count. */
  total: Readonly<Ref<number>>;
  /** Removes THIS row. */
  remove(): void;
  /** Moves THIS row to `newIndex`. */
  reOrder(newIndex: number): void;
}

/**
 * The current iterator row: `{ index, total, remove, reOrder }`. Throws outside a
 * {@link provideIteratorRow}. `remove`/`reOrder` act on THIS row.
 */
export function useIteratorItem(): IteratorItem {
  const row = inject(IteratorRowContextKey, null);
  if (!row) {
    throw new Error(
      "useIteratorItem: no provideIteratorRow() found above this component.",
    );
  }
  const array = useArrayInputContext();
  return {
    index: row.index,
    total: array.total,
    remove: () => array.remove(row.index),
    reOrder: (newIndex: number) => array.reOrder(row.index, newIndex),
  };
}
