/**
 * `useInfiniteGetList` — the Vue twin of `@chelone/react`'s
 * `useInfiniteGetList`: `useInfiniteQuery` over core's
 * `getInfiniteListOptions`. A new `params` value is a new query and starts
 * over. Kept apart from `queries.ts` so the two grow independently.
 */

import {
  getInfiniteListOptions,
  type InfiniteListParams,
  type ResourceMap,
} from "@chelone/core";
import { useInfiniteQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useCheloneContext } from "../context";

/** Read a list page by page, reactively. `enabled` gates the fetch. */
export function useInfiniteGetList<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<InfiniteListParams>,
  options: {
    enabled?: MaybeRefOrGetter<boolean>;
    staleTime?: MaybeRefOrGetter<number>;
  } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useInfiniteQuery(
    computed(() => ({
      ...getInfiniteListOptions(ctx, resource, toValue(params)),
      enabled: options.enabled === undefined ? true : toValue(options.enabled),
      ...(options.staleTime === undefined
        ? {}
        : { staleTime: toValue(options.staleTime) }),
    })),
  );
}
