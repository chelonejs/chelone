import {
  createInfiniteListController,
  getInfiniteListOptions,
  type InfiniteListController,
  type InfiniteListControllerState,
  type InfiniteListParams,
  type ListControllerOptions,
  listControllerActions,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
} from "@chelone/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useCheloneContext } from "./context";
import { toControllerContext } from "./controller-hooks";

/** Reactive infinite controller state plus the controller's stable actions. */
export type UseInfiniteListControllerResult<TRecord> =
  InfiniteListControllerState<TRecord> &
    Omit<
      InfiniteListController<TRecord>,
      keyof MicroStore<InfiniteListControllerState<TRecord>>
    >;

/**
 * React bridge for the vanilla infinite list controller, bound like
 * `useListController` (see its doc block): inert controller in a render-phase
 * `useState`, attach and release through `useSyncExternalStore`, no destroy
 * effect. Filters and sort live in the store only; the location is not read.
 */
export function useInfiniteListController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  options?: ListControllerOptions<RecordOf<TResources, TName>>,
): UseInfiniteListControllerResult<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();

  const [controller] = useState<InfiniteListController<TRecord>>(() =>
    createInfiniteListController(toControllerContext(ctx), resource, options),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      ...listControllerActions(controller),
      fetchNextPage: controller.fetchNextPage,
      fetchPreviousPage: controller.fetchPreviousPage,
    }),
    [snapshot, controller],
  );
}

/**
 * Read a list page by page: the data is the loaded pages, `fetchNextPage`
 * appends the next one. A new `params` value is a new query and starts over.
 */
export function useInfiniteGetList<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: InfiniteListParams,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useInfiniteQuery({
    ...getInfiniteListOptions(ctx, resource, params),
    ...options,
  });
}
