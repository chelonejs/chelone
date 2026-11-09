/**
 * Data-mutation composables over `@tanstack/vue-query` — the Vue twin of the
 * mutation half of `@chelone/react`'s `hooks.ts` (`useUpdate` / `useDelete` +
 * the bulk pair). Wraps core's framework-agnostic `updateMutationOptions` /
 * `deleteMutationOptions` (`mutationFn` + cache invalidation) and hands it to
 * vue-query's `useMutation`, reusing the SAME `dataProvider` + `queryClient`
 * `<Admin>` provides. `<ApiKeyInput>` is the first consumer: it is NOT form-bound
 * — it reads the ambient record/resource and dispatches this mutation directly
 * to trigger a server-side key rotation.
 *
 * R3: each composable honors `options.mutationMode: "undoable"` by swapping its
 * `mutate` / `mutateAsync` for the optimistic-with-Undo flow (apply the cache
 * change now, defer the dataProvider call until the Undo window closes) via the
 * vanilla `startUndoableMutation` engine + an Undo notification. The default
 * (`"pessimistic"`) path is unchanged.
 */

import {
  createMutationOptions,
  type DataContext,
  type DeleteManyParams,
  type DeleteParams,
  deleteMutationOptions,
  type Identifier,
  type MutationModeOptions,
  type RegisteredResources,
  type ResourceMap,
  type ResourceNameArg,
  type ResourceRecordArg,
  resourceKey,
  type UndoableCallbacks,
  type UndoableUpdateManyCallbacks,
  type UpdateManyParams,
  type UpdateParams,
  undoableCallbacks,
  undoableDeleteMutators,
  undoableDeleteOptions,
  undoableUpdateMutators,
  undoableUpdateOptions,
  updateMutationOptions,
} from "@chelone/core";
import { useMutation } from "@tanstack/vue-query";
import { useCheloneContext } from "../context";
import { useUndoable } from "./undoable";

/**
 * A mutation whose `mutate` / `mutateAsync` are swapped for the undoable pair,
 * the state refs untouched. Naming it keeps the hook's inferred type
 * declaration-emittable: spreading vue-query's refs over a generic record type
 * would expand to `@vue/shared` types a `.d.ts` cannot name.
 */
type Undoable<TMutation, TParams, TData> = Omit<
  TMutation,
  "mutate" | "mutateAsync"
> & {
  mutate: (
    params: TParams,
    callbacks?: UndoableCallbacks<TData, TParams>,
  ) => void;
  mutateAsync: (params: TParams) => Promise<void>;
};

/**
 * Create mutation for `resource` — the Vue twin of `@chelone/react`'s
 * `useCreate(resource)`. Call `.mutateAsync({ data })` to dispatch; the
 * resource's caches are invalidated on settle. Takes no mutation mode (create
 * has no record to patch optimistically), as React's does not.
 */
export function useCreate<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(resource: ResourceNameArg<TResources, TName>) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(createMutationOptions(ctx, resource));
}

/**
 * Update-one mutation for `resource`. Returns vue-query's mutation object; call
 * `.mutateAsync({ id, data, previousData })` to dispatch. Mirrors the React
 * `useUpdate(resource)` — `updateMutationOptions` binds the resource at call
 * time and invalidates that resource's caches on settle.
 */
export function useUpdate<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const runUndoable = useUndoable();
  const mutation = useMutation(updateMutationOptions(ctx, resource, options));
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: patch the cache now, defer the update, notify with Undo. `mutate`
  // is fire-and-forget (the server call is withheld until the undo window
  // closes); `mutateAsync` resolves once the undoable is enqueued, not on the
  // deferred server response. Only the two action functions are swapped — the
  // spread keeps the reactive state refs (`isPending`, …) as the same objects.
  // The callbacks of `mutate`'s second argument are the undoable ones: see
  // `UndoableCallbacks`.
  const undoable: Undoable<
    typeof mutation,
    UpdateParams<ResourceRecordArg<TResources, TName>>,
    ResourceRecordArg<TResources, TName>
  > = {
    ...mutation,
    ...undoableUpdateMutators(ctx, resource, runUndoable),
  };
  return undoable;
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
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const runUndoable = useUndoable();
  const mutation = useMutation(deleteMutationOptions(ctx, resource, options));
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: remove the row now, defer the delete, notify with Undo. See
  // `useUpdate` for the `mutate`/`mutateAsync` semantics.
  const undoable: Undoable<
    typeof mutation,
    DeleteParams<ResourceRecordArg<TResources, TName>>,
    ResourceRecordArg<TResources, TName> | undefined
  > = {
    ...mutation,
    ...undoableDeleteMutators(ctx, resource, runUndoable),
  };
  return undoable;
}

/**
 * Delete-many mutation for `resource` — the Vue twin of the bulk delete path
 * `@chelone/react`'s `<BulkDeleteButton>` fires against
 * `dataProvider.deleteMany`. Core carries NO `deleteManyMutationOptions` (there
 * is no bulk mutation-options helper), so this wraps `dataProvider.deleteMany`
 * itself and invalidates the resource's caches on settle (the same
 * `resourceKey` scope core's single-record helpers invalidate). Call
 * `.mutateAsync({ ids })` to dispatch; `<BulkDeleteButton>` then clears the
 * selection + notifies. `options.mutationMode: "undoable"` swaps `mutate` /
 * `mutateAsync` for the optimistic-with-Undo flow (remove the rows now, defer the
 * server call until the Undo window closes) via the core `startUndoableMutation`.
 */
export function useDeleteMany<
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const mutation = useMutation({
    mutationFn: async (params: DeleteManyParams) => {
      const result = await ctx.dataProvider.deleteMany(resource, params);
      return result.data;
    },
    onSettled: () =>
      ctx.queryClient.invalidateQueries({ queryKey: resourceKey(resource) }),
  });
  const runUndoable = useUndoable();
  if (options.mutationMode !== "undoable") return mutation;
  // Undoable: remove the selected rows now, defer `deleteMany`, notify with Undo.
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
  const undoable: Undoable<typeof mutation, DeleteManyParams, Identifier[]> = {
    ...mutation,
    mutate,
    mutateAsync: async (params) => {
      mutate(params);
    },
  };
  return undoable;
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
  TResources extends ResourceMap = RegisteredResources,
  TName extends string = keyof TResources & string,
>(
  resource: ResourceNameArg<TResources, TName>,
  options: MutationModeOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  // The provider call carries the name the hook was handed, which may be a
  // `string` the map cannot pin, so it runs on the loose context.
  const dataContext: DataContext = ctx;
  const mutation = useMutation({
    mutationFn: async (
      params: UpdateManyParams<ResourceRecordArg<TResources, TName>>,
    ) => {
      const result = await dataContext.dataProvider.updateMany(
        resource,
        params,
      );
      return result.data;
    },
    onSettled: () =>
      ctx.queryClient.invalidateQueries({ queryKey: resourceKey(resource) }),
  });
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
  const undoable: Undoable<
    typeof mutation,
    UpdateManyParams<ResourceRecordArg<TResources, TName>>,
    Identifier[]
  > = {
    ...mutation,
    mutate,
    mutateAsync: async (params) => {
      mutate(params);
    },
  };
  return undoable;
}
