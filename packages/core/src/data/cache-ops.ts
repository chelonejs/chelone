import type { QueryClient } from "@tanstack/query-core";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import { manyKeyPrefix, oneKey } from "./keys";
import type { GetListResult } from "./types";

/**
 * Vanilla (react/vue-free) query-cache mutations shared by the undoable
 * orchestration in BOTH adapters. They are the `applyOptimistic` bodies passed
 * to {@link startUndoableMutation}: an optimistic delete removes rows now, an
 * optimistic update patches them now, and the deferred dataProvider call is
 * withheld until commit. Rollback is handled by the undoable snapshot (these
 * never mutate an existing cache object in place — every write is a fresh
 * object — so the pre-apply snapshot stays a valid rollback target).
 */

/** Partial-match key covering every `getList` cache variant of a resource. */
function listQueryKey(resource: string) {
  return [resource, "getList"] as const;
}

/**
 * Optimistically remove records: drop each `getOne` entry and filter the id(s)
 * out of every cached `getList` page (decrementing its `total` when known).
 */
export function removeRecordsFromCache(
  queryClient: QueryClient,
  resource: string,
  ids: Identifier[],
): void {
  const idSet = new Set(ids.map(String));
  for (const id of ids) {
    queryClient.removeQueries({ queryKey: oneKey(resource, { id }) });
  }
  const lists = queryClient.getQueriesData<GetListResult>({
    queryKey: listQueryKey(resource),
  });
  for (const [key, value] of lists) {
    if (!value) continue;
    const kept = value.data.filter(
      (record) => !idSet.has(String((record as ResourceRecord).id)),
    );
    if (kept.length === value.data.length) continue;
    const removed = value.data.length - kept.length;
    queryClient.setQueryData<GetListResult>(key, {
      ...value,
      data: kept,
      total: value.total == null ? value.total : value.total - removed,
    });
  }
}

/**
 * Optimistically patch records: shallow-merge `data` into each matching
 * `getOne` entry and every matching row of every cached `getList` page and
 * `getMany` entry.
 */
export function updateRecordsInCache(
  queryClient: QueryClient,
  resource: string,
  ids: Identifier[],
  data: Record<string, unknown>,
): void {
  const idSet = new Set(ids.map(String));
  for (const id of ids) {
    const key = oneKey(resource, { id });
    const previous = queryClient.getQueryData<ResourceRecord>(key);
    if (previous !== undefined) {
      queryClient.setQueryData(key, { ...previous, ...data });
    }
  }
  const lists = queryClient.getQueriesData<GetListResult>({
    queryKey: listQueryKey(resource),
  });
  for (const [key, value] of lists) {
    if (!value) continue;
    let changed = false;
    const nextData = value.data.map((record) => {
      if (idSet.has(String((record as ResourceRecord).id))) {
        changed = true;
        return { ...record, ...data };
      }
      return record;
    });
    if (changed) {
      queryClient.setQueryData<GetListResult>(key, {
        ...value,
        data: nextData,
      });
    }
  }
  patchManyEntries(queryClient, resource, idSet, data);
}

/**
 * Shallow-merge `data` into the matching records of every cached `getMany`
 * entry (what `ReferenceField` and `ReferenceArrayField` read through).
 */
export function patchManyEntries(
  queryClient: QueryClient,
  resource: string,
  idSet: Set<string>,
  data: Record<string, unknown>,
): void {
  const manys = queryClient.getQueriesData<ResourceRecord[]>({
    queryKey: manyKeyPrefix(resource),
  });
  for (const [key, value] of manys) {
    if (!value) continue;
    let changed = false;
    const next = value.map((record) => {
      if (idSet.has(String(record.id))) {
        changed = true;
        return { ...record, ...data };
      }
      return record;
    });
    if (changed) queryClient.setQueryData<ResourceRecord[]>(key, next);
  }
}
