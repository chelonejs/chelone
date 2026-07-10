/**
 * Data-mutation composables over `@tanstack/vue-query` — the Vue twin of the
 * mutation half of `@chelone/react`'s `hooks.ts` (`useUpdate`). Wraps core's
 * framework-agnostic `updateMutationOptions` (`mutationFn` + cache invalidation)
 * and hands it to vue-query's `useMutation`, reusing the SAME `dataProvider` +
 * `queryClient` `<Admin>` provides. `<ApiKeyInput>` is the first consumer: it is
 * NOT form-bound — it reads the ambient record/resource and dispatches this
 * mutation directly to trigger a server-side key rotation.
 */

import {
  type DeleteManyParams,
  deleteMutationOptions,
  type MutationModeOptions,
  type RecordOf,
  type ResourceMap,
  resourceKey,
  type UpdateManyParams,
  updateMutationOptions,
} from "@chelone/core";
import { useMutation } from "@tanstack/vue-query";
import { useCheloneContext } from "../context";

/**
 * Update-one mutation for `resource`. Returns vue-query's mutation object; call
 * `.mutateAsync({ id, data, previousData })` to dispatch. Mirrors the React
 * `useUpdate(resource)` — `updateMutationOptions` binds the resource at call
 * time and invalidates that resource's caches on settle.
 */
export function useUpdate<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(updateMutationOptions(ctx, resource, options));
}

/**
 * Delete-one mutation for `resource`. Returns vue-query's mutation object; call
 * `.mutateAsync({ id, previousData })` to dispatch. Mirrors the React delete
 * stack — `deleteMutationOptions` binds the resource at call time and
 * invalidates that resource's caches on settle. `<DeleteButton>` is the first
 * consumer: it dispatches this on confirm, then redirects + notifies itself
 * (chelone has no baked-in delete controller yet — see the button's header).
 */
export function useDelete<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(deleteMutationOptions(ctx, resource, options));
}

/**
 * Delete-many mutation for `resource` — the Vue twin of the bulk delete path
 * `@chelone/react`'s `<BulkDeleteButton>` fires against
 * `dataProvider.deleteMany`. Core carries NO `deleteManyMutationOptions` (there
 * is no bulk mutation-options helper), so this wraps `dataProvider.deleteMany`
 * itself and invalidates the resource's caches on settle (the same
 * `resourceKey` scope core's single-record helpers invalidate). Call
 * `.mutateAsync({ ids })` to dispatch; `<BulkDeleteButton>` then clears the
 * selection + notifies. `options.mutationMode` is accepted for API parity but
 * has no undoable path yet (pessimistic only).
 */
export function useDeleteMany<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, _options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  return useMutation({
    mutationFn: async (params: DeleteManyParams) => {
      const result = await ctx.dataProvider.deleteMany(resource, params);
      return result.data;
    },
    onSettled: () =>
      ctx.queryClient.invalidateQueries({ queryKey: resourceKey(resource) }),
  });
}

/**
 * Update-many mutation for `resource` — the Vue twin of the bulk update path
 * `@chelone/react`'s `<BulkUpdateButton>` fires against
 * `dataProvider.updateMany`. Like {@link useDeleteMany}, core has no bulk
 * mutation-options helper, so this wraps `dataProvider.updateMany` itself and
 * invalidates the resource's caches on settle. Call `.mutateAsync({ ids, data })`
 * to dispatch; `<BulkUpdateButton>` then clears the selection + notifies.
 */
export function useUpdateMany<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, _options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  return useMutation({
    mutationFn: async (
      params: UpdateManyParams<RecordOf<TResources, TName>>,
    ) => {
      const result = await ctx.dataProvider.updateMany(resource, params);
      return result.data;
    },
    onSettled: () =>
      ctx.queryClient.invalidateQueries({ queryKey: resourceKey(resource) }),
  });
}
