import {
  createMutationOptions,
  type DataContext,
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
  patchedRecord,
  type RegisteredResources,
  type ResourceMap,
  type ResourceNameArg,
  type ResourceRecordArg,
  type UndoableDeleteCallbacks,
  type UndoableUpdateCallbacks,
  type UpdateParams,
  undoableCallbacks,
  undoableDeleteOptions,
  undoableUpdateOptions,
  updateMutationOptions,
} from "@chelone/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCheloneContext } from "./context";
import { useUndoable } from "./undoable-hooks";

/** `refetchInterval` is in ms; `0`, a negative number or `false` turns polling off. */
type ListQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
};

export function useGetList<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  params: GetListParams = {},
  options: ListQueryOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const { refetchInterval, ...rest } = options;
  return useQuery({
    ...getListOptions(ctx, resource, params),
    ...rest,
    refetchInterval:
      typeof refetchInterval === "number" && refetchInterval > 0
        ? refetchInterval
        : false,
  });
}

export function useGetOne<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  params: GetOneParams,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({ ...getOneOptions(ctx, resource, params), ...options });
}

export function useGetMany<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
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
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
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
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
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
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(resource: TName & ResourceNameArg<TResources, TName>) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(createMutationOptions(ctx, resource));
}

export function useUpdate<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const queryClient = useQueryClient();
  const runUndoable = useUndoable();
  const mutation = useMutation(updateMutationOptions(ctx, resource, options));
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: patch the cache now, defer the update, notify with Undo. `mutate`
  // is fire-and-forget (the server call is withheld until the undo window
  // closes); `mutateAsync` resolves once the undoable is enqueued, not on the
  // deferred server response. The callbacks of `mutate`'s second argument are
  // the undoable ones: see `UndoableCallbacks`.
  const mutate = (
    params: UpdateParams<ResourceRecordArg<TResources, TName>>,
    callbacks?: UndoableUpdateCallbacks<ResourceRecordArg<TResources, TName>>,
  ) => {
    const settle = undoableCallbacks(params, callbacks);
    const { id, data } = params;
    // The deferred call carries the name the hook was handed, which may be a
    // `string` the map cannot pin, so it runs on the loose context.
    const dataContext: DataContext = ctx;
    runUndoable({
      ...undoableUpdateOptions(queryClient, resource, [id], data),
      commit: settle.commit(() =>
        dataContext.dataProvider.update(resource, params),
      ),
    });
    settle.success(patchedRecord(params));
  };
  return {
    ...mutation,
    mutate,
    mutateAsync: async (
      params: UpdateParams<ResourceRecordArg<TResources, TName>>,
    ) => {
      mutate(params);
    },
  };
}

export function useDelete<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: TName & ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const queryClient = useQueryClient();
  const runUndoable = useUndoable();
  const mutation = useMutation(deleteMutationOptions(ctx, resource, options));
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: remove the row now, defer the delete, notify with Undo. See
  // `useUpdate` for the `mutate`/`mutateAsync` semantics.
  const mutate = (
    params: DeleteParams<ResourceRecordArg<TResources, TName>>,
    callbacks?: UndoableDeleteCallbacks<ResourceRecordArg<TResources, TName>>,
  ) => {
    const settle = undoableCallbacks(params, callbacks);
    const dataContext: DataContext = ctx;
    runUndoable({
      ...undoableDeleteOptions(queryClient, resource, [params.id]),
      commit: settle.commit(() =>
        dataContext.dataProvider.delete(resource, params),
      ),
    });
    settle.success(params.previousData);
  };
  return {
    ...mutation,
    mutate,
    mutateAsync: async (
      params: DeleteParams<ResourceRecordArg<TResources, TName>>,
    ) => {
      mutate(params);
    },
  };
}

/**
 * Bind the hooks to a registry type once — full inference at every call site:
 *   const hooks = createCheloneHooks<typeof resources>();
 *   hooks.useGetList('posts')  // data: Post[]; 'nope' rejects
 *
 * Each wrapper names the resource the hook itself names, so a bound call site
 * types `data` by name and an unbound `string` still reaches the loose arm.
 */
export function createCheloneHooks<TResources extends ResourceMap>() {
  return {
    useGetList: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params?: GetListParams,
      options?: ListQueryOptions,
    ) => useGetList<TResources, TName>(resource, params, options),
    useGetOne: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: GetOneParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetOne<TResources, TName>(resource, params, options),
    useGetMany: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: GetManyParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetMany<TResources, TName>(resource, params, options),
    useGetManyAggregate: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: GetManyParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetManyAggregate<TResources, TName>(resource, params, options),
    useGetManyReference: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      params: GetManyReferenceParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetManyReference<TResources, TName>(resource, params, options),
    useCreate: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
    ) => useCreate<TResources, TName>(resource),
    useUpdate: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useUpdate<TResources, TName>(resource, options),
    useDelete: <TName extends keyof TResources & string>(
      resource: TName & ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useDelete<TResources, TName>(resource, options),
  };
}
