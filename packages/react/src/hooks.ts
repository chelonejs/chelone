import {
  createMutationOptions,
  deleteMutationOptions,
  type GetListParams,
  type GetManyParams,
  type GetOneParams,
  getListOptions,
  getManyOptions,
  getOneOptions,
  type MutationModeOptions,
  type ResourceMap,
  updateMutationOptions,
} from "@chelone/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCheloneContext } from "./context";

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
  return useMutation(updateMutationOptions(ctx, resource, options));
}

export function useDelete<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(deleteMutationOptions(ctx, resource, options));
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
    ) => useGetMany<TResources, TName>(resource, params),
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
