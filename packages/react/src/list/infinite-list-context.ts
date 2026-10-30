import type { ResourceRecord } from "@chelone/core";
import { useListContext } from "../form";
import type { UseInfiniteListControllerResult } from "../infinite-hooks";

/**
 * The ambient list, as an infinite one. Throws when the nearest list context
 * comes from a plain `useListController`: there is no next page to ask for.
 */
export function useInfiniteListContext(): UseInfiniteListControllerResult<ResourceRecord> {
  const list = useListContext();
  if (!("fetchNextPage" in list)) {
    throw new Error(
      "useInfiniteListContext: the ambient list is not an infinite list",
    );
  }
  return list as UseInfiniteListControllerResult<ResourceRecord>;
}
