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

import type { RecordOf, ResourceMap } from "@chelone/core";
import { type InjectionKey, inject, provide } from "vue";
import type { UseListControllerReturn } from "../controllers/use-list-controller";

/** The ambient list surface — the reactive `useListController` result. */
export type ListContextValue<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
> = UseListControllerReturn<RecordOf<TResources, TName>>;

/** The provide/inject key for the ambient list surface. */
export const ListContextKey: InjectionKey<ListContextValue> = Symbol(
  "chelone-list-context",
);

/** Provide the ambient list surface (called by `<List>` in `setup`). */
export function provideListContext(value: ListContextValue): void {
  provide(ListContextKey, value);
}

/** The ambient list surface; throws without a `<List>`/provider above. */
export function useListContext<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(): ListContextValue<TResources, TName> {
  const ctx = inject(ListContextKey, null);
  if (!ctx) {
    throw new Error("useListContext: no <List> found above this component.");
  }
  return ctx as ListContextValue<TResources, TName>;
}
