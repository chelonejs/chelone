import {
  createMutationOptions,
  type DeleteParams,
  deleteMutationOptions,
  type GetListParams,
  type GetManyParams,
  type GetManyReferenceParams,
  type GetOneParams,
  getListOptions,
  getManyAggregateOptions,
  getManyOptions,
  getManyReferenceOptions,
  getOneOptions,
  type MutationModeOptions,
  type RecordOf,
  type ResourceMap,
  removeRecordsFromCache,
  type UpdateParams,
  updateMutationOptions,
  updateRecordsInCache,
} from "@chelone/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCheloneContext } from "./context";
import { useUndoable } from "./undoable-hooks";

export function useGetList<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: GetListParams = {},
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({ ...getListOptions(ctx, resource, params), ...options });
}

export function useGetOne<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: GetOneParams,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({ ...getOneOptions(ctx, resource, params), ...options });
}

export function useGetMany<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: GetManyParams,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({ ...getManyOptions(ctx, resource, params), ...options });
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
  params: GetManyParams,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({
    ...getManyAggregateOptions(ctx, resource, params),
    ...options,
  });
}

export function useGetManyReference<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: GetManyReferenceParams,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({
    ...getManyReferenceOptions(ctx, resource, params),
    ...options,
  });
}

export function useCreate<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(createMutationOptions(ctx, resource));
}

export function useUpdate<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  const queryClient = useQueryClient();
  const runUndoable = useUndoable();
  const mutation = useMutation(updateMutationOptions(ctx, resource, options));
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: patch the cache now, defer the update, notify with Undo. `mutate`
  // is fire-and-forget (the server call is withheld until the undo window
  // closes); `mutateAsync` resolves once the undoable is enqueued, not on the
  // deferred server response.
  const mutate = (params: UpdateParams<RecordOf<TResources, TName>>) => {
    runUndoable({
      queryKeys: [[resource]],
      applyOptimistic: () =>
        updateRecordsInCache(
          queryClient,
          resource,
          [params.id],
          params.data as Record<string, unknown>,
        ),
      commit: () => ctx.dataProvider.update(resource, params),
      message: "chelone.notification.updated",
      messageArgs: { smart_count: 1 },
    });
  };
  return {
    ...mutation,
    mutate: mutate as unknown as typeof mutation.mutate,
    mutateAsync: (async (params: UpdateParams<RecordOf<TResources, TName>>) => {
      mutate(params);
    }) as unknown as typeof mutation.mutateAsync,
  };
}

export function useDelete<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  const queryClient = useQueryClient();
  const runUndoable = useUndoable();
  const mutation = useMutation(deleteMutationOptions(ctx, resource, options));
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: remove the row now, defer the delete, notify with Undo. See
  // `useUpdate` for the `mutate`/`mutateAsync` semantics.
  const mutate = (params: DeleteParams<RecordOf<TResources, TName>>) => {
    runUndoable({
      queryKeys: [[resource]],
      applyOptimistic: () =>
        removeRecordsFromCache(queryClient, resource, [params.id]),
      commit: () => ctx.dataProvider.delete(resource, params),
      message: "chelone.notification.deleted",
      messageArgs: { smart_count: 1 },
    });
  };
  return {
    ...mutation,
    mutate: mutate as unknown as typeof mutation.mutate,
    mutateAsync: (async (params: DeleteParams<RecordOf<TResources, TName>>) => {
      mutate(params);
    }) as unknown as typeof mutation.mutateAsync,
  };
}

/**
 * Bind the hooks to a registry type once — full inference at every call site:
 *   const hooks = createCheloneHooks<typeof resources>();
 *   hooks.useGetList('posts')  // data: Post[]; 'nope' rejects
 */
export function createCheloneHooks<TResources extends ResourceMap>() {
  return {
    useGetList: <TName extends keyof TResources & string>(
      resource: TName,
      params?: GetListParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetList<TResources, TName>(resource, params, options),
    useGetOne: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetOneParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetOne<TResources, TName>(resource, params, options),
    useGetMany: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetManyParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetMany<TResources, TName>(resource, params, options),
    useGetManyAggregate: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetManyParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetManyAggregate<TResources, TName>(resource, params, options),
    useGetManyReference: <TName extends keyof TResources & string>(
      resource: TName,
      params: GetManyReferenceParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetManyReference<TResources, TName>(resource, params, options),
    useCreate: <TName extends keyof TResources & string>(resource: TName) =>
      useCreate<TResources, TName>(resource),
    useUpdate: <TName extends keyof TResources & string>(
      resource: TName,
      options?: MutationModeOptions,
    ) => useUpdate<TResources, TName>(resource, options),
    useDelete: <TName extends keyof TResources & string>(
      resource: TName,
      options?: MutationModeOptions,
    ) => useDelete<TResources, TName>(resource, options),
  };
}
