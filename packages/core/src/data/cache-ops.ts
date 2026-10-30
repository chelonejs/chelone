import type { InfiniteData, QueryClient } from "@tanstack/query-core";
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

/** Partial-match keys covering the flat `GetListResult` caches of a resource. */
function flatListQueryKeys(resource: string) {
  return [
    [resource, "getList"],
    [resource, "getManyReference"],
  ] as const;
}

/** Partial-match key covering every `getInfiniteList` cache variant of a resource. */
function infiniteQueryKey(resource: string) {
  return [resource, "getInfiniteList"] as const;
}

/** Filters ids out of a page; `undefined` when it holds none, so the cached object is kept. */
function withoutIds(
  page: GetListResult,
  idSet: Set<string>,
): GetListResult | undefined {
  const kept = page.data.filter(
    (record) => !idSet.has(String((record as ResourceRecord).id)),
  );
  return kept.length === page.data.length ? undefined : { ...page, data: kept };
}

/** Shallow-merges `data` into the matching rows; `undefined` when none match. */
function withPatchedRows(
  page: GetListResult,
  idSet: Set<string>,
  data: Record<string, unknown>,
): GetListResult | undefined {
  let changed = false;
  const nextData = page.data.map((record) => {
    if (idSet.has(String((record as ResourceRecord).id))) {
      changed = true;
      return { ...record, ...data };
    }
    return record;
  });
  return changed ? { ...page, data: nextData } : undefined;
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
  for (const queryKey of flatListQueryKeys(resource)) {
    for (const [key, value] of queryClient.getQueriesData<GetListResult>({
      queryKey,
    })) {
      if (!value) continue;
      const next = withoutIds(value, idSet);
      if (!next) continue;
      const removed = value.data.length - next.data.length;
      queryClient.setQueryData<GetListResult>(key, {
        ...next,
        total: value.total == null ? value.total : value.total - removed,
      });
    }
  }
  const infinite = queryClient.getQueriesData<
    InfiniteData<GetListResult, unknown>
  >({ queryKey: infiniteQueryKey(resource) });
  for (const [key, value] of infinite) {
    if (!value) continue;
    const pages = value.pages.map((page) => withoutIds(page, idSet));
    if (pages.every((page) => page === undefined)) continue;
    // `total` counts the whole list, so every page drops by the rows removed across all pages.
    const removed = value.pages.reduce(
      (n, page, i) =>
        n + page.data.length - (pages[i]?.data.length ?? page.data.length),
      0,
    );
    queryClient.setQueryData<InfiniteData<GetListResult, unknown>>(key, {
      ...value,
      pages: value.pages.map((page, i) => {
        const next = pages[i] ?? page;
        return {
          ...next,
          total: next.total == null ? next.total : next.total - removed,
        };
      }),
    });
  }
}

/**
 * Optimistically patch records: shallow-merge `data` into each matching
 * `getOne` entry and every matching row of every cached `getList`,
 * `getManyReference`, `getInfiniteList` page and `getMany` entry.
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
  for (const queryKey of flatListQueryKeys(resource)) {
    for (const [key, value] of queryClient.getQueriesData<GetListResult>({
      queryKey,
    })) {
      if (!value) continue;
      const next = withPatchedRows(value, idSet, data);
      if (next) queryClient.setQueryData<GetListResult>(key, next);
    }
  }
  const infinite = queryClient.getQueriesData<
    InfiniteData<GetListResult, unknown>
  >({ queryKey: infiniteQueryKey(resource) });
  for (const [key, value] of infinite) {
    if (!value) continue;
    const pages = value.pages.map((page) => withPatchedRows(page, idSet, data));
    if (pages.every((page) => page === undefined)) continue;
    queryClient.setQueryData<InfiniteData<GetListResult, unknown>>(key, {
      ...value,
      pages: value.pages.map((page, i) => pages[i] ?? page),
    });
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
