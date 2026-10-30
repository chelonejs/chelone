/**
 * Data-fetch composables over `@tanstack/vue-query` — the Vue twin of
 * `@chelone/react`'s `hooks.ts` (`useGetOne` / `useGetMany` / `useGetList` /
 * `useGetManyAggregate` / `useGetManyReference`). A `<ReferenceField>`
 * resolves a to-one record, a `<ReferenceInput>` fetches choices. Each wraps
 * core's framework-agnostic `getOneOptions` / `getManyOptions` /
 * `getManyAggregateOptions` / `getListOptions` /
 * `getManyReferenceOptions` (queryKey + queryFn) and hands them to
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
  type GetManyParams,
  type GetManyReferenceParams,
  type GetOneParams,
  getListOptions,
  getManyAggregateOptions,
  getManyOptions,
  getManyReferenceOptions,
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

/**
 * Fetch many records by an array of ids, reactively — the Vue twin of
 * `@chelone/react`'s `useGetMany`. Backs `<ReferenceArrayField>` (resolve an
 * FK array to its records). `enabled` gates the fetch (skip an empty id list).
 */
export function useGetMany<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<GetManyParams>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery(
    computed(() => ({
      ...getManyOptions(ctx, resource, toValue(params)),
      enabled: options.enabled === undefined ? true : toValue(options.enabled),
    })),
  );
}

/**
 * Same result as `useGetMany`, but reads started in the same tick by any
 * component reach the data provider as one `getMany` per resource.
 */
export function useGetManyAggregate<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<GetManyParams>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery(
    computed(() => ({
      ...getManyAggregateOptions(ctx, resource, toValue(params)),
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

/** Fetch the records whose `target` field equals `id`, reactively. */
export function useGetManyReference<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<GetManyReferenceParams>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery(
    computed(() => ({
      ...getManyReferenceOptions(ctx, resource, toValue(params)),
      enabled: options.enabled === undefined ? true : toValue(options.enabled),
    })),
  );
}
