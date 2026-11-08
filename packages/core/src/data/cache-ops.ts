import type { InfiniteData, QueryClient } from "@tanstack/query-core";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
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

/** The fields a patch may set on a record of the named resource. */
type Patch<
  TResources extends ResourceMap,
  TName extends keyof TResources,
> = Partial<RecordOf<TResources, TName>>;

/** The page param is the page number `getInfiniteListOptions` sets. */
type InfiniteList<TRecord extends ResourceRecord> = InfiniteData<
  GetListResult<TRecord>,
  number
>;

function singleResultEntries<TRecord extends ResourceRecord>(
  queryClient: QueryClient,
  queryKey: readonly [string, string],
) {
  return queryClient.getQueriesData<GetListResult<TRecord>>({ queryKey });
}

function infiniteEntries<TRecord extends ResourceRecord>(
  queryClient: QueryClient,
  resource: string,
) {
  return queryClient.getQueriesData<InfiniteList<TRecord>>({
    queryKey: infiniteListKeyPrefix(resource),
  });
}

/** Filters ids out of a page; `undefined` when it holds none, so the cached object is kept. */
function withoutIds<TRecord extends ResourceRecord>(
  page: GetListResult<TRecord>,
  idSet: Set<string>,
): GetListResult<TRecord> | undefined {
  const kept = page.data.filter((record) => !idSet.has(String(record.id)));
  return kept.length === page.data.length ? undefined : { ...page, data: kept };
}

/** Shallow-merges `data` into the matching rows; `undefined` when none match. */
function withPatchedRows<TRecord extends ResourceRecord>(
  page: GetListResult<TRecord>,
  idSet: Set<string>,
  data: Partial<TRecord>,
): GetListResult<TRecord> | undefined {
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
export function removeRecordsFromCache<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(queryClient: QueryClient, resource: TName, ids: Identifier[]): void {
  type TRecord = RecordOf<TResources, TName>;
  const idSet = new Set(ids.map(String));
  for (const id of ids) {
    queryClient.removeQueries({ queryKey: oneKey(resource, { id }) });
  }
  for (const queryKey of singleResultListKeyPrefixes(resource)) {
    for (const [key, value] of singleResultEntries<TRecord>(
      queryClient,
      queryKey,
    )) {
      if (!value) continue;
      const next = withoutIds(value, idSet);
      if (!next) continue;
      const removed = value.data.length - next.data.length;
      queryClient.setQueryData<GetListResult<TRecord>>(key, {
        ...next,
        total: lowerTotal(value.total, removed),
      });
    }
  }
  const infinite = infiniteEntries<TRecord>(queryClient, resource);
  for (const [key, value] of infinite) {
    if (!value) continue;
    const kept = value.pages.map((page) => withoutIds(page, idSet) ?? page);
    // `total` counts the whole list, so every page drops by the rows removed across all pages.
    const removed = value.pages.reduce(
      (n, page, i) => n + page.data.length - (kept[i]?.data.length ?? 0),
      0,
    );
    if (removed === 0) continue;
    queryClient.setQueryData<InfiniteList<TRecord>>(key, {
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
export function updateRecordsInCache<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  queryClient: QueryClient,
  resource: TName,
  ids: Identifier[],
  data: Patch<TResources, TName>,
): void {
  type TRecord = RecordOf<TResources, TName>;
  const idSet = new Set(ids.map(String));
  for (const id of ids) {
    const key = oneKey(resource, { id });
    const previous = queryClient.getQueryData<TRecord>(key);
    if (previous !== undefined) {
      queryClient.setQueryData(key, { ...previous, ...data });
    }
  }
  for (const queryKey of singleResultListKeyPrefixes(resource)) {
    for (const [key, value] of singleResultEntries<TRecord>(
      queryClient,
      queryKey,
    )) {
      if (!value) continue;
      const next = withPatchedRows(value, idSet, data);
      if (next) queryClient.setQueryData<GetListResult<TRecord>>(key, next);
    }
  }
  const infinite = infiniteEntries<TRecord>(queryClient, resource);
  for (const [key, value] of infinite) {
    if (!value) continue;
    const pages = value.pages.map(
      (page) => withPatchedRows(page, idSet, data) ?? page,
    );
    if (pages.every((page, i) => page === value.pages[i])) continue;
    queryClient.setQueryData<InfiniteList<TRecord>>(key, {
      ...value,
      pages,
    });
  }
  patchManyEntries(queryClient, resource, idSet, data);
}

const ABSENT = Symbol("absent");

/** Row id -> the values of the patched keys before the patch; `ABSENT` marks a key the row lacked. */
type RowPriors<TRecord extends ResourceRecord> = Map<
  string,
  { [K in keyof TRecord]?: TRecord[K] | typeof ABSENT }
>;

function priorsOf<TRecord extends ResourceRecord>(
  page: GetListResult<TRecord>,
  idSet: Set<string>,
  data: Partial<TRecord>,
): RowPriors<TRecord> {
  const priors: RowPriors<TRecord> = new Map();
  for (const row of page.data) {
    const id = String(row.id);
    if (!idSet.has(id)) continue;
    const prior: { [K in keyof TRecord]?: TRecord[K] | typeof ABSENT } = {};
    for (const field in data) {
      if (!Object.hasOwn(data, field)) continue;
      prior[field] = field in row ? row[field] : ABSENT;
    }
    priors.set(id, prior);
  }
  return priors;
}

/** Puts the prior values back into the rows they were taken from. */
function withRestoredRows<TRecord extends ResourceRecord>(
  page: GetListResult<TRecord>,
  priors: RowPriors<TRecord>,
): GetListResult<TRecord> {
  return {
    ...page,
    data: page.data.map((record) => {
      const prior = priors.get(String(record.id));
      if (!prior) return record;
      // The spread writes every prior back, `ABSENT` markers included; the loop then drops those keys.
      const restored: TRecord = { ...record, ...prior };
      for (const field in prior) {
        if (prior[field] === ABSENT) delete restored[field];
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
export function patchListEntries<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  queryClient: QueryClient,
  resource: TName,
  idSet: Set<string>,
  data: Patch<TResources, TName>,
): () => void {
  type TRecord = RecordOf<TResources, TName>;
  const rollbacks: Array<() => void> = [];

  for (const queryKey of singleResultListKeyPrefixes(resource)) {
    for (const [key, value] of singleResultEntries<TRecord>(
      queryClient,
      queryKey,
    )) {
      if (!value) continue;
      const next = withPatchedRows(value, idSet, data);
      if (!next) continue;
      const priors = priorsOf(value, idSet, data);
      queryClient.setQueryData<GetListResult<TRecord>>(key, next);
      rollbacks.push(() => {
        const current = queryClient.getQueryData<GetListResult<TRecord>>(key);
        if (current) {
          queryClient.setQueryData<GetListResult<TRecord>>(
            key,
            withRestoredRows(current, priors),
          );
        }
      });
    }
  }
  const infinite = infiniteEntries<TRecord>(queryClient, resource);
  for (const [key, value] of infinite) {
    if (!value) continue;
    const pages = value.pages.map(
      (page) => withPatchedRows(page, idSet, data) ?? page,
    );
    if (pages.every((page, i) => page === value.pages[i])) continue;
    const priorsByPage = value.pages.map((page) => priorsOf(page, idSet, data));
    queryClient.setQueryData<InfiniteList<TRecord>>(key, {
      ...value,
      pages,
    });
    rollbacks.push(() => {
      const current = queryClient.getQueryData<InfiniteList<TRecord>>(key);
      if (!current) return;
      queryClient.setQueryData<InfiniteList<TRecord>>(key, {
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
export function patchManyEntries<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  queryClient: QueryClient,
  resource: TName,
  idSet: Set<string>,
  data: Patch<TResources, TName>,
): void {
  type TRecord = RecordOf<TResources, TName>;
  const manys = queryClient.getQueriesData<TRecord[]>({
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
    if (changed) queryClient.setQueryData<TRecord[]>(key, next);
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
