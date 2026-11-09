/**
 * `createCheloneHooks` — the Vue twin of `@chelone/react`'s factory. Binds every
 * data composable to a registry type once, so each call site infers its record
 * type and rejects an unknown resource name. Each member forwards the Vue
 * composable's own signature, so `MaybeRefOrGetter` params stay reactive.
 * Adds `useUpdateMany` and `useDeleteMany`, which React does not export.
 */

import type {
  GetListParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  MutationModeOptions,
  ResourceMap,
  ResourceNameArg,
} from "@chelone/core";
import type { MaybeRefOrGetter } from "vue";
import {
  useCreate,
  useDelete,
  useDeleteMany,
  useUpdate,
  useUpdateMany,
} from "./mutations";
import {
  type ListQueryOptions,
  useGetList,
  useGetMany,
  useGetManyAggregate,
  useGetManyReference,
  useGetOne,
} from "./queries";

type QueryOptions = { enabled?: MaybeRefOrGetter<boolean> };

/**
 * Bind the composables to a registry type once:
 *   const hooks = createCheloneHooks<typeof resources>();
 *   hooks.useGetList('posts')  // data: Post[]; 'nope' rejects
 */
export function createCheloneHooks<TResources extends ResourceMap>() {
  return {
    useGetList: <TName extends keyof TResources & string>(
      resource: MaybeRefOrGetter<TName & ResourceNameArg<TResources, TName>>,
      params?: MaybeRefOrGetter<GetListParams>,
      options?: ListQueryOptions,
    ) => useGetList<TResources, TName>(resource, params, options),
    useGetOne: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: MaybeRefOrGetter<GetOneParams>,
      options?: QueryOptions,
    ) => useGetOne<TResources, TName>(resource, params, options),
    useGetMany: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: MaybeRefOrGetter<GetManyParams>,
      options?: QueryOptions,
    ) => useGetMany<TResources, TName>(resource, params, options),
    useGetManyAggregate: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: MaybeRefOrGetter<GetManyParams>,
      options?: QueryOptions,
    ) => useGetManyAggregate<TResources, TName>(resource, params, options),
    useGetManyReference: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: MaybeRefOrGetter<GetManyReferenceParams>,
      options?: QueryOptions,
    ) => useGetManyReference<TResources, TName>(resource, params, options),
    useCreate: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
    ) => useCreate<TResources, TName>(resource),
    useUpdate: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useUpdate<TResources, TName>(resource, options),
    useUpdateMany: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useUpdateMany<TResources, TName>(resource, options),
    useDelete: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useDelete<TResources, TName>(resource, options),
    useDeleteMany: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useDeleteMany<TResources, TName>(resource, options),
  };
}
