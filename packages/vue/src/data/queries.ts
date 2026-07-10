/**
 * Data-fetch composables over `@tanstack/vue-query` — the Vue twin of
 * `@chelone/react`'s `hooks.ts` (`useGetOne` / `useGetList`), the ONE reference
 * path the V1 vertical needs (a `<ReferenceField>` resolves a to-one record; a
 * `<ReferenceInput>` fetches choices). Both wrap core's framework-agnostic
 * `getOneOptions` / `getListOptions` (queryKey + queryFn) and hand them to
 * vue-query's `useQuery`, reusing the SAME `dataProvider` + `queryClient`
 * `<Admin>` provides (it installs the vue-query client under `VUE_QUERY_CLIENT`).
 *
 * The controllers (Task 5) drive their fetches through core's own query-core
 * observers; these standalone reads use vue-query directly because a field /
 * choices fetch has no controller — it is a plain cached query. Options are
 * passed as a `computed` so a reactive param (the FK id off a resolving record)
 * re-keys the query when it changes.
 */

import {
  type GetListParams,
  type GetOneParams,
  getListOptions,
  getOneOptions,
  type ResourceMap,
} from "@chelone/core";
import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useCheloneContext } from "../context";

/** Fetch one record by id, reactively. `enabled` gates the fetch (skip a null id). */
export function useGetOne<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<GetOneParams>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery(
    computed(() => ({
      ...getOneOptions(ctx, resource, toValue(params)),
      enabled: options.enabled === undefined ? true : toValue(options.enabled),
    })),
  );
}

/** Fetch a page of records, reactively. */
export function useGetList<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<GetListParams> = {},
  options: { enabled?: MaybeRefOrGetter<boolean> } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery(
    computed(() => ({
      ...getListOptions(ctx, resource, toValue(params)),
      enabled: options.enabled === undefined ? true : toValue(options.enabled),
    })),
  );
}
