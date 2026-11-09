import {
  createMutationOptions,
  type DataContext,
  type DeleteManyParams,
  deleteManyMutationOptions,
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
  type Identifier,
  type MutationModeOptions,
  type RegisteredResources,
  type ResourceMap,
  type ResourceNameArg,
  type ResourceRecordArg,
  type UndoableCallbacks,
  type UndoableUpdateManyCallbacks,
  type UpdateManyParams,
  undoableCallbacks,
  undoableDeleteMutators,
  undoableDeleteOptions,
  undoableUpdateMutators,
  undoableUpdateOptions,
  updateManyMutationOptions,
  updateMutationOptions,
} from "@chelone/core";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  resource: ResourceNameArg<TResources, TName>,
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
  resource: ResourceNameArg<TResources, TName>,
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
  resource: ResourceNameArg<TResources, TName>,
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
  resource: ResourceNameArg<TResources, TName>,
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
  resource: ResourceNameArg<TResources, TName>,
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
>(resource: ResourceNameArg<TResources, TName>) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(createMutationOptions(ctx, resource));
}

export function useUpdate<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const mutation = useMutation(updateMutationOptions(ctx, resource, options));
  // Built whether or not the mode is undoable: `useUndoable` is a hook, and a
  // hook may not be called behind a branch.
  const undoable = undoableUpdateMutators(ctx, resource, useUndoable());
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: patch the cache now, defer the update, notify with Undo. The pair
  // core builds is fire-and-forget (`mutateAsync` resolves once the undoable is
  // enqueued, not on the deferred server response), and the callbacks of
  // `mutate`'s second argument are the undoable ones: see `UndoableCallbacks`.
  return { ...mutation, ...undoable };
}

export function useDelete<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const mutation = useMutation(deleteMutationOptions(ctx, resource, options));
  const undoable = undoableDeleteMutators(ctx, resource, useUndoable());
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: remove the row now, defer the delete, notify with Undo. See
  // `useUpdate` for the pair core builds.
  return { ...mutation, ...undoable };
}

export function useDeleteMany<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const mutation = useMutation(deleteManyMutationOptions(ctx, resource));
  const runUndoable = useUndoable();
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: remove the selected rows now, defer `deleteMany`, notify with
  // Undo. See `useUpdate` for the `mutate` / `mutateAsync` semantics.
  const mutate = (
    params: DeleteManyParams,
    callbacks?: UndoableCallbacks<Identifier[], DeleteManyParams>,
  ) => {
    const settle = undoableCallbacks(params, callbacks);
    runUndoable({
      ...undoableDeleteOptions(ctx.queryClient, resource, params.ids),
      commit: settle.commit(() =>
        ctx.dataProvider.deleteMany(resource, params),
      ),
    });
    settle.success(params.ids);
  };
  return {
    ...mutation,
    mutate,
    mutateAsync: async (params: DeleteManyParams) => {
      mutate(params);
    },
  };
}

export function useUpdateMany<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const mutation = useMutation(updateManyMutationOptions(ctx, resource));
  // The deferred call carries the name the hook was handed, which may be a
  // `string` the map cannot pin, so it runs on the loose context.
  const dataContext: DataContext = ctx;
  const runUndoable = useUndoable();
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: patch the selected rows now, defer `updateMany`, notify with Undo.
  const mutate = (
    params: UpdateManyParams<ResourceRecordArg<TResources, TName>>,
    callbacks?: UndoableUpdateManyCallbacks<
      ResourceRecordArg<TResources, TName>
    >,
  ) => {
    const settle = undoableCallbacks(params, callbacks);
    runUndoable({
      ...undoableUpdateOptions(
        ctx.queryClient,
        resource,
        params.ids,
        params.data,
      ),
      commit: settle.commit(() =>
        dataContext.dataProvider.updateMany(resource, params),
      ),
    });
    settle.success(params.ids);
  };
  return {
    ...mutation,
    mutate,
    mutateAsync: async (
      params: UpdateManyParams<ResourceRecordArg<TResources, TName>>,
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
      resource: ResourceNameArg<TResources, TName>,
      params?: GetListParams,
      options?: ListQueryOptions,
    ) => useGetList<TResources, TName>(resource, params, options),
    useGetOne: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      params: GetOneParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetOne<TResources, TName>(resource, params, options),
    useGetMany: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      params: GetManyParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetMany<TResources, TName>(resource, params, options),
    useGetManyAggregate: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      params: GetManyParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetManyAggregate<TResources, TName>(resource, params, options),
    useGetManyReference: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      params: GetManyReferenceParams,
      options?: { enabled?: boolean; staleTime?: number },
    ) => useGetManyReference<TResources, TName>(resource, params, options),
    useCreate: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
    ) => useCreate<TResources, TName>(resource),
    useUpdate: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useUpdate<TResources, TName>(resource, options),
    useDelete: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useDelete<TResources, TName>(resource, options),
    useUpdateMany: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useUpdateMany<TResources, TName>(resource, options),
    useDeleteMany: <TName extends keyof TResources & string>(
      resource: ResourceNameArg<TResources, TName>,
      options?: MutationModeOptions,
    ) => useDeleteMany<TResources, TName>(resource, options),
  };
}
