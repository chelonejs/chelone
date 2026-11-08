/**
 * `ListContext` — the ambient list surface a `<List>` view publishes so every
 * descendant (the `<DataTable>`, a future filter/pagination) reads the SAME
 * list-controller result. The Vue twin of `@chelone/react`'s `ListContext`
 * (`form/filter-live-form.tsx` — `ListContextProvider` + `useListContext`).
 *
 * Idiom translation: React threads the controller result through a
 * `createContext` provider. Vue `provide`s it under a typed `InjectionKey`. The
 * value is the `reactive` result of `useListController` (Task 5) — a live view
 * whose `data` / `isPending` / `selectedIds` update in place — so descendants
 * read it directly with no ref juggling. `useListContext` throws without a
 * provider (parity with the React twin).
 */

import type {
  ListContextSurface,
  LooseRecord,
  ResourceRecord,
} from "@chelone/core";
import { type InjectionKey, inject, provide } from "vue";

/**
 * The ambient list surface — the reactive `useListController` result.
 *
 * `ListContextSurface` erases the filter members and keeps `data` typed: an
 * injection key cannot be generic, so a controller typed to any record must be
 * assignable to the one value this key carries. `ResourceRecord` is the widest
 * record `data` can hold; `useListContext<T>()` reads it back typed.
 */
export type ListContextValue<TRecord = ResourceRecord> =
  ListContextSurface<TRecord>;

/** The provide/inject key for the ambient list surface. */
export const ListContextKey: InjectionKey<ListContextValue> = Symbol(
  "chelone-list-context",
);

/** Provide the ambient list surface (called by `<List>` in `setup`). */
export function provideListContext(value: ListContextValue): void {
  provide(ListContextKey, value);
}

/**
 * The ambient list surface; throws without a `<List>`/provider above.
 * `TRecord` is unconstrained: a `RecordOf` is not always a `ResourceRecord`.
 */
export function useListContext<
  TRecord = LooseRecord,
>(): ListContextValue<TRecord> {
  const ctx = inject(ListContextKey, null);
  if (!ctx) {
    throw new Error("useListContext: no <List> found above this component.");
  }
  // type-escape: an injection key cannot carry the caller's record type, so the
  // provided `LooseRecord` list is read back as the record type the caller names
  return ctx as ListContextValue<TRecord>;
}
