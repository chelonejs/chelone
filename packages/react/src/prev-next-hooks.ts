import {
  canUseCachedPage,
  type GetListResult,
  getListOptions,
  getPrevNextParams,
  type PrevNextOptions,
  type PrevNextStoredParams,
  resolvePrevNext,
} from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { useCheloneContext } from "./context";
import { useRecordContext } from "./record/record-context";
import { useResourceContext } from "./resource";
import { useCreatePath } from "./router";
import { useStoreItem } from "./store-hooks";

const FIVE_MINUTES = 5 * 60 * 1000;

export type UsePrevNextControllerOptions = PrevNextOptions;

/**
 * The neighbours of the ambient record in the list the user came from: the
 * list's persisted sort and filter, read from the page its query cached, or
 * from a `limit`-row fetch when that page cannot serve. Needs a record and a
 * resource in context.
 *
 * Hooks over pure core functions rather than a `MicroStore` controller: the
 * record id changes each time the user steps.
 */
export function usePrevNextController(
  options: UsePrevNextControllerOptions = {},
) {
  const { linkType = "edit", storeKey } = options;
  const resource = useResourceContext();
  const record = useRecordContext();
  const ctx = useCheloneContext();
  const createPath = useCreatePath();
  const [stored] = useStoreItem<PrevNextStoredParams>(
    `${storeKey || resource}.listParams`,
  );
  const { cached, fetch } = getPrevNextParams(stored, options);

  const cachedPage = resource
    ? ctx.queryClient.getQueryData<GetListResult>(
        getListOptions(ctx, resource, cached).queryKey,
      )
    : undefined;
  const { page, perPage } = cached.pagination as {
    page: number;
    perPage: number;
  };
  const canUseCache =
    record != null && canUseCachedPage(record.id, cachedPage, page, perPage);

  const query = useQuery({
    ...getListOptions(ctx, resource ?? "", fetch),
    enabled: !!resource && record != null && !canUseCache,
    staleTime: FIVE_MINUTES,
  });

  const list = canUseCache ? cachedPage : query.data;
  const resolved =
    record != null && list
      ? resolvePrevNext(
          record.id,
          list.data,
          list.total,
          canUseCache ? (page - 1) * perPage : 0,
        )
      : undefined;
  const { prevId = null, nextId = null } = resolved ?? {};
  const pathTo = (id: typeof prevId) =>
    id == null ? undefined : createPath({ type: linkType, resource, id });

  return {
    hasPrev: prevId != null,
    hasNext: nextId != null,
    prevPath: pathTo(prevId),
    nextPath: pathTo(nextId),
    index: resolved?.index,
    total: resolved?.total,
    error: canUseCache ? null : query.error,
    isPending: record == null || (!canUseCache && query.isPending),
    isFetching: !canUseCache && query.isFetching,
  };
}
