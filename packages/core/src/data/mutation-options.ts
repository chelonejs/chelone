import type { QueryClient, QueryKey } from "@tanstack/query-core";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import {
  patchListEntries,
  patchManyEntries,
  removeManyEntries,
} from "./cache-ops";
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
  // Optimistic update patches the getOne, getMany and list rows it knows of;
  // this refetch brings in what the patch could not know (a row that now sorts
  // or filters elsewhere, a server-computed field). Optimistic delete patches
  // getOne and getMany only, so the lists catch up here.
  return ctx.queryClient.invalidateQueries({ queryKey: resourceKey(resource) });
}

type ManySnapshot<TRecord extends ResourceRecord> = Array<
  [QueryKey, TRecord[] | undefined]
>;

interface OptimisticContext<TRecord extends ResourceRecord> {
  previous?: TRecord;
  key?: QueryKey;
  manySnapshot?: ManySnapshot<TRecord>;
  rollbackLists?: () => void;
}

/**
 * Optimistic updates that have started and not yet settled, per client and
 * resource. `isMutating` cannot stand in: TanStack runs `onSettled` before it
 * marks the mutation done, so two updates answered in the same tick each count
 * the other as pending and both would skip the refetch.
 */
const unsettledUpdates = new WeakMap<QueryClient, Map<string, number>>();

function countUpdate(queryClient: QueryClient, resource: string, by: 1 | -1) {
  const counts = unsettledUpdates.get(queryClient) ?? new Map<string, number>();
  unsettledUpdates.set(queryClient, counts);
  const next = (counts.get(resource) ?? 0) + by;
  counts.set(resource, next);
  return next;
}

/** Cancels in-flight list fetches (`getList`, `getManyReference`, `getInfiniteList`) so they cannot overwrite a patch. */
function cancelListQueries(ctx: DataContext<ResourceMap>, resource: string) {
  return ctx.queryClient.cancelQueries({
    queryKey: resourceKey(resource),
    predicate: ({ queryKey }) =>
      queryKey[1] === "getList" ||
      queryKey[1] === "getManyReference" ||
      queryKey[1] === "getInfiniteList",
  });
}

/** Cancels in-flight `getMany` fetches so they cannot overwrite the patch, then snapshots the entries. */
async function snapshotManyEntries<TRecord extends ResourceRecord>(
  ctx: DataContext<ResourceMap>,
  resource: string,
): Promise<ManySnapshot<TRecord>> {
  await ctx.queryClient.cancelQueries({ queryKey: manyKeyPrefix(resource) });
  return ctx.queryClient.getQueriesData<TRecord[]>({
    queryKey: manyKeyPrefix(resource),
  });
}

function restoreManyEntries<TRecord extends ResourceRecord>(
  ctx: DataContext<ResourceMap>,
  snapshot: ManySnapshot<TRecord> | undefined,
) {
  for (const [key, value] of snapshot ?? []) {
    ctx.queryClient.setQueryData(key, value);
  }
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
  const mutationKey = [resource, "update"];
  return {
    mutationKey,
    mutationFn: async (params: UpdateParams<RecordOf<TResources, TName>>) => {
      const result = await ctx.dataProvider.update(resource, params);
      return result.data;
    },
    onMutate: async (params: UpdateParams<RecordOf<TResources, TName>>) => {
      if (mode !== "optimistic") return {};
      // Counted before any await: `onSettled` runs even when `onMutate` throws.
      countUpdate(ctx.queryClient, resource, 1);
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
      const manySnapshot = await snapshotManyEntries<
        RecordOf<TResources, TName>
      >(ctx, resource);
      patchManyEntries<TResources, TName>(
        ctx.queryClient,
        resource,
        new Set([String(params.id)]),
        structuredClone(params.data),
      );
      await cancelListQueries(ctx, resource);
      const rollbackLists = patchListEntries<TResources, TName>(
        ctx.queryClient,
        resource,
        new Set([String(params.id)]),
        structuredClone(params.data),
      );
      return { previous, key, manySnapshot, rollbackLists };
    },
    onError: (
      _error: Error,
      _params: UpdateParams<RecordOf<TResources, TName>>,
      context: OptimisticContext<RecordOf<TResources, TName>> | undefined,
    ) => {
      if (context?.key && context.previous !== undefined) {
        ctx.queryClient.setQueryData(context.key, context.previous);
      }
      restoreManyEntries(ctx, context?.manySnapshot);
      context?.rollbackLists?.();
    },
    onSettled: () => {
      // Refetching while a later update is in flight would overwrite its patched row with the old server value.
      if (
        mode === "optimistic" &&
        countUpdate(ctx.queryClient, resource, -1) > 0
      ) {
        return;
      }
      return invalidateResource(ctx, resource);
    },
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
      const manySnapshot = await snapshotManyEntries<
        RecordOf<TResources, TName>
      >(ctx, resource);
      removeManyEntries(
        ctx.queryClient,
        resource,
        new Set([String(params.id)]),
      );
      return { previous, key, manySnapshot };
    },
    onError: (
      _error: Error,
      _params: DeleteParams<RecordOf<TResources, TName>>,
      context: OptimisticContext<RecordOf<TResources, TName>> | undefined,
    ) => {
      if (context?.key && context.previous !== undefined) {
        ctx.queryClient.setQueryData(context.key, context.previous);
      }
      restoreManyEntries(ctx, context?.manySnapshot);
    },
    onSettled: () => invalidateResource(ctx, resource),
  };
}
