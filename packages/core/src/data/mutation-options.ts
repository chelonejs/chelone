import type { RecordOf, ResourceMap } from "../resource/registry";
import { patchManyEntries, removeManyEntries } from "./cache-ops";
import { manyKeyPrefix, oneKey, resourceKey } from "./keys";
import type { DataContext } from "./query-options";
import type { CreateParams, DeleteParams, UpdateParams } from "./types";

/**
 * Default: pessimistic (least surprise). `undoable` = optimistic-with-Undo:
 * the mutation is applied to the cache immediately and the dataProvider call is
 * DEFERRED (see `startUndoableMutation` in ./undoable) until the Undo window
 * closes; an Undo rolls the cache back and the server is never called.
 */
export type MutationMode = "pessimistic" | "optimistic" | "undoable";

export interface MutationModeOptions {
  mutationMode?: MutationMode;
}

function invalidateResource(ctx: DataContext<ResourceMap>, resource: string) {
  // ponytail: optimistic mode invalidates list caches instead of patching them;
  // per-list optimistic patching arrives with controllers (P4) if profiling demands.
  return ctx.queryClient.invalidateQueries({ queryKey: resourceKey(resource) });
}

export function createMutationOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName) {
  return {
    mutationFn: async (params: CreateParams<RecordOf<TResources, TName>>) => {
      const result = await ctx.dataProvider.create(resource, params);
      return result.data;
    },
    onSettled: () => invalidateResource(ctx, resource),
  };
}

export function updateMutationOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: DataContext<TResources>,
  resource: TName,
  options: MutationModeOptions = {},
) {
  const mode: MutationMode = options.mutationMode ?? "pessimistic";
  return {
    mutationFn: async (params: UpdateParams<RecordOf<TResources, TName>>) => {
      const result = await ctx.dataProvider.update(resource, params);
      return result.data;
    },
    onMutate: async (params: UpdateParams<RecordOf<TResources, TName>>) => {
      if (mode !== "optimistic") return {};
      const key = oneKey(resource, { id: params.id });
      await ctx.queryClient.cancelQueries({ queryKey: key });
      const previous =
        ctx.queryClient.getQueryData<RecordOf<TResources, TName>>(key);
      if (previous !== undefined) {
        const merged = Object.assign(
          structuredClone(previous),
          structuredClone(params.data),
        );
        ctx.queryClient.setQueryData(key, merged);
      }
      // Reference fields read the getMany entries, not oneKey.
      await ctx.queryClient.cancelQueries({
        queryKey: manyKeyPrefix(resource),
      });
      const manySnapshot = ctx.queryClient.getQueriesData({
        queryKey: manyKeyPrefix(resource),
      });
      patchManyEntries(
        ctx.queryClient,
        resource,
        new Set([String(params.id)]),
        structuredClone(params.data) as Record<string, unknown>,
      );
      return { previous, key, manySnapshot };
    },
    onError: (
      _error: unknown,
      _params: UpdateParams<RecordOf<TResources, TName>>,
      context:
        | {
            previous?: unknown;
            key?: readonly unknown[];
            manySnapshot?: Array<[readonly unknown[], unknown]>;
          }
        | undefined,
    ) => {
      if (context?.key && context.previous !== undefined) {
        ctx.queryClient.setQueryData(context.key, context.previous);
      }
      for (const [manyEntryKey, value] of context?.manySnapshot ?? []) {
        ctx.queryClient.setQueryData(manyEntryKey, value);
      }
    },
    onSettled: () => invalidateResource(ctx, resource),
  };
}

export function deleteMutationOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: DataContext<TResources>,
  resource: TName,
  options: MutationModeOptions = {},
) {
  const mode: MutationMode = options.mutationMode ?? "pessimistic";
  return {
    mutationFn: async (params: DeleteParams<RecordOf<TResources, TName>>) => {
      const result = await ctx.dataProvider.delete(resource, params);
      return result.data;
    },
    onMutate: async (params: DeleteParams<RecordOf<TResources, TName>>) => {
      if (mode !== "optimistic") return {};
      const key = oneKey(resource, { id: params.id });
      await ctx.queryClient.cancelQueries({ queryKey: key });
      const previous =
        ctx.queryClient.getQueryData<RecordOf<TResources, TName>>(key);
      ctx.queryClient.removeQueries({ queryKey: key });
      // Reference fields read the getMany entries, not oneKey.
      await ctx.queryClient.cancelQueries({
        queryKey: manyKeyPrefix(resource),
      });
      const manySnapshot = ctx.queryClient.getQueriesData({
        queryKey: manyKeyPrefix(resource),
      });
      removeManyEntries(
        ctx.queryClient,
        resource,
        new Set([String(params.id)]),
      );
      return { previous, key, manySnapshot };
    },
    onError: (
      _error: unknown,
      _params: DeleteParams<RecordOf<TResources, TName>>,
      context:
        | {
            previous?: unknown;
            key?: readonly unknown[];
            manySnapshot?: Array<[readonly unknown[], unknown]>;
          }
        | undefined,
    ) => {
      if (context?.key && context.previous !== undefined) {
        ctx.queryClient.setQueryData(context.key, context.previous);
      }
      for (const [manyEntryKey, value] of context?.manySnapshot ?? []) {
        ctx.queryClient.setQueryData(manyEntryKey, value);
      }
    },
    onSettled: () => invalidateResource(ctx, resource),
  };
}
