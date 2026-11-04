import type { InfiniteData, QueryClient } from "@tanstack/query-core";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import { infiniteListKeyPrefix, manyKeyPrefix, oneKey } from "./keys";
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

/** Partial-match keys of the caches holding one `GetListResult` per query (not one per page). */
function singleResultListKeyPrefixes(resource: string) {
  return [
    [resource, "getList"],
    [resource, "getManyReference"],
  ] as const;
}

/** Filters ids out of a page; `undefined` when it holds none, so the cached object is kept. */
function withoutIds(
  page: GetListResult,
  idSet: Set<string>,
): GetListResult | undefined {
  const kept = page.data.filter((record) => !idSet.has(String(record.id)));
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
    if (idSet.has(String(record.id))) {
      changed = true;
      return { ...record, ...data };
    }
    return record;
  });
  return changed ? { ...page, data: nextData } : undefined;
}

/** `total` after `removed` rows left; stays at 0 if a stale total is lower than the rows removed. */
function lowerTotal(total: number | undefined, removed: number) {
  return total == null ? total : Math.max(0, total - removed);
}

/**
 * Optimistically remove records: drop each `getOne` entry and filter the id(s)
 * out of every cached `getList`, `getManyReference` and `getInfiniteList` page
 * (decrementing `total` when known) and `getMany` entry.
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
  for (const queryKey of singleResultListKeyPrefixes(resource)) {
    for (const [key, value] of queryClient.getQueriesData<GetListResult>({
      queryKey,
    })) {
      if (!value) continue;
      const next = withoutIds(value, idSet);
      if (!next) continue;
      const removed = value.data.length - next.data.length;
      queryClient.setQueryData<GetListResult>(key, {
        ...next,
        total: lowerTotal(value.total, removed),
      });
    }
  }
  const infinite = queryClient.getQueriesData<
    InfiniteData<GetListResult, unknown>
  >({ queryKey: infiniteListKeyPrefix(resource) });
  for (const [key, value] of infinite) {
    if (!value) continue;
    const kept = value.pages.map((page) => withoutIds(page, idSet) ?? page);
    // `total` counts the whole list, so every page drops by the rows removed across all pages.
    const removed = value.pages.reduce(
      (n, page, i) => n + page.data.length - (kept[i]?.data.length ?? 0),
      0,
    );
    if (removed === 0) continue;
    queryClient.setQueryData<InfiniteData<GetListResult, unknown>>(key, {
      ...value,
      pages: kept.map((page) => ({
        ...page,
        total: lowerTotal(page.total, removed),
      })),
    });
  }
  removeManyEntries(queryClient, resource, idSet);
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
  for (const queryKey of singleResultListKeyPrefixes(resource)) {
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
  >({ queryKey: infiniteListKeyPrefix(resource) });
  for (const [key, value] of infinite) {
    if (!value) continue;
    const pages = value.pages.map(
      (page) => withPatchedRows(page, idSet, data) ?? page,
    );
    if (pages.every((page, i) => page === value.pages[i])) continue;
    queryClient.setQueryData<InfiniteData<GetListResult, unknown>>(key, {
      ...value,
      pages,
    });
  }
  patchManyEntries(queryClient, resource, idSet, data);
}

const ABSENT = Symbol("absent");

/** Row id -> the values of the patched keys before the patch; `ABSENT` marks a key the row lacked. */
type RowPriors = Map<string, Record<string, unknown>>;

function priorsOf(
  page: GetListResult,
  idSet: Set<string>,
  data: Record<string, unknown>,
): RowPriors {
  const priors: RowPriors = new Map();
  for (const row of page.data) {
    const id = String(row.id);
    if (!idSet.has(id)) continue;
    const prior: Record<string, unknown> = {};
    for (const field of Object.keys(data)) {
      prior[field] = field in row ? row[field] : ABSENT;
    }
    priors.set(id, prior);
  }
  return priors;
}

/** Puts the prior values back into the rows they were taken from. */
function withRestoredRows(
  page: GetListResult,
  priors: RowPriors,
): GetListResult {
  return {
    ...page,
    data: page.data.map((record) => {
      const prior = priors.get(String(record.id));
      if (!prior) return record;
      const restored: Record<string, unknown> & ResourceRecord = { ...record };
      for (const [field, value] of Object.entries(prior)) {
        if (value === ABSENT) delete restored[field];
        else restored[field] = value;
      }
      return restored;
    }),
  };
}

/**
 * Shallow-merge `data` into the matching rows of every cached `getList`,
 * `getManyReference` and `getInfiniteList` page, and return a `rollback` that
 * puts back only the patched keys of those rows into whatever each entry holds
 * when it is called, so another update's patch to a different row survives.
 * An entry that holds none of the ids keeps its cached object.
 */
export function patchListEntries(
  queryClient: QueryClient,
  resource: string,
  idSet: Set<string>,
  data: Record<string, unknown>,
): () => void {
  const rollbacks: Array<() => void> = [];

  for (const queryKey of singleResultListKeyPrefixes(resource)) {
    for (const [key, value] of queryClient.getQueriesData<GetListResult>({
      queryKey,
    })) {
      if (!value) continue;
      const next = withPatchedRows(value, idSet, data);
      if (!next) continue;
      const priors = priorsOf(value, idSet, data);
      queryClient.setQueryData<GetListResult>(key, next);
      rollbacks.push(() => {
        const current = queryClient.getQueryData<GetListResult>(key);
        if (current) {
          queryClient.setQueryData<GetListResult>(
            key,
            withRestoredRows(current, priors),
          );
        }
      });
    }
  }
  const infinite = queryClient.getQueriesData<
    InfiniteData<GetListResult, unknown>
  >({ queryKey: infiniteListKeyPrefix(resource) });
  for (const [key, value] of infinite) {
    if (!value) continue;
    const pages = value.pages.map(
      (page) => withPatchedRows(page, idSet, data) ?? page,
    );
    if (pages.every((page, i) => page === value.pages[i])) continue;
    const priorsByPage = value.pages.map((page) => priorsOf(page, idSet, data));
    queryClient.setQueryData<InfiniteData<GetListResult, unknown>>(key, {
      ...value,
      pages,
    });
    rollbacks.push(() => {
      const current =
        queryClient.getQueryData<InfiniteData<GetListResult, unknown>>(key);
      if (!current) return;
      queryClient.setQueryData<InfiniteData<GetListResult, unknown>>(key, {
        ...current,
        pages: current.pages.map((page, i) => {
          const priors = priorsByPage[i];
          return priors && priors.size > 0
            ? withRestoredRows(page, priors)
            : page;
        }),
      });
    });
  }

  return () => {
    for (const rollback of rollbacks) rollback();
  };
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

/**
 * Drop the matching records from every cached `getMany` entry (what
 * `ReferenceField` and `ReferenceArrayField` read through). An entry that
 * holds none of the ids keeps its cached object.
 */
export function removeManyEntries(
  queryClient: QueryClient,
  resource: string,
  idSet: Set<string>,
): void {
  const manys = queryClient.getQueriesData<ResourceRecord[]>({
    queryKey: manyKeyPrefix(resource),
  });
  for (const [key, value] of manys) {
    if (!value) continue;
    const kept = value.filter((record) => !idSet.has(String(record.id)));
    if (kept.length !== value.length) {
      queryClient.setQueryData<ResourceRecord[]>(key, kept);
    }
  }
}
