/**
 * `useInfiniteListContext` — the ambient list, as an infinite one. The Vue twin
 * of `@chelone/react`'s hook. Throws when the nearest list context comes from a
 * plain `useListController`: there is no next page to ask for.
 */

import type { RecordOf, ResourceMap } from "@chelone/core";
import type { UseInfiniteListControllerReturn } from "../controllers/use-infinite-list-controller";
import { useListContext } from "./list-context";

function isInfiniteList<TRecord>(
  list: unknown,
): list is UseInfiniteListControllerReturn<TRecord> {
  const candidate = list as Partial<UseInfiniteListControllerReturn<TRecord>>;
  return (
    typeof candidate.fetchNextPage === "function" &&
    typeof candidate.fetchPreviousPage === "function"
  );
}

export function useInfiniteListContext<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(): UseInfiniteListControllerReturn<RecordOf<TResources, TName>> {
  const list = useListContext<RecordOf<TResources, TName>>();
  if (!isInfiniteList<RecordOf<TResources, TName>>(list)) {
    throw new Error(
      "useInfiniteListContext: the ambient list is not an infinite list",
    );
  }
  return list;
}
