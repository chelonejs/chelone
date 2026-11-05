/**
 * Pure rules for stepping through the records of the list a record came from.
 * No react, no vue, no query client: an adapter reads the stored list params
 * and the cached page, then asks these functions what to fetch and who the
 * neighbours are.
 */

import type {
  FilterPayload,
  GetListParams,
  GetListResult,
  InfiniteListParams,
  SortPayload,
} from "../data/types";
import type { Identifier } from "../resource/identifier";

/** The list's persisted params, read from the `<resource>.listParams` store key. */
export interface PrevNextStoredParams {
  page?: number;
  perPage?: number;
  /** A list persists an array; a single sort is accepted too. */
  sort?: SortPayload | SortPayload[];
  filter?: FilterPayload;
}

export interface PrevNextOptions {
  /** Which page the neighbour links point at. Default `"edit"`. */
  linkType?: "edit" | "show";
  /** KV namespace the list persisted its params under. `false` ignores them. Default: the resource name. */
  storeKey?: string | false;
  /** Rows fetched when the cached page cannot serve. Default 1000. */
  limit?: number;
  /** Sort used when no params are stored. Default `id ASC`. */
  sort?: SortPayload | SortPayload[];
  /** Merged over the stored filter, like a list's permanent filter. */
  filter?: FilterPayload;
  /** The stored filter when no params are stored. */
  filterDefaultValues?: FilterPayload;
  meta?: unknown;
}

export interface PrevNextParams {
  /** The page the list itself showed: the key its query cached it under. */
  cached: InfiniteListParams;
  /** The first `limit` rows, for when the cached page cannot serve. */
  fetch: GetListParams;
}

export const DEFAULT_PREV_NEXT_LIMIT = 1000;
const DEFAULT_PER_PAGE = 10;
const DEFAULT_SORT: SortPayload = { field: "id", order: "ASC" };

/**
 * A list keys its query with a single sort object when there is exactly one
 * sort key, so the cached page is found only under that shape.
 */
function toListSort(
  sort: SortPayload | SortPayload[] | undefined,
): SortPayload | SortPayload[] {
  if (Array.isArray(sort)) {
    const [only] = sort;
    return sort.length === 1 && only ? { ...only } : sort;
  }
  return sort ?? { ...DEFAULT_SORT };
}

export function getPrevNextParams(
  stored: PrevNextStoredParams | undefined,
  options: PrevNextOptions = {},
): PrevNextParams {
  const persisted = options.storeKey === false ? undefined : stored;
  const page = persisted?.page ?? 1;
  const perPage = persisted?.perPage ?? DEFAULT_PER_PAGE;
  const sort = toListSort(
    persisted?.sort && (!Array.isArray(persisted.sort) || persisted.sort.length)
      ? persisted.sort
      : options.sort,
  );
  const filter = {
    ...(persisted?.filter ?? options.filterDefaultValues),
    ...options.filter,
  };
  return {
    cached: { pagination: { page, perPage }, sort, filter },
    fetch: {
      pagination: {
        page: 1,
        perPage: options.limit ?? DEFAULT_PREV_NEXT_LIMIT,
      },
      sort,
      filter,
      meta: options.meta,
    },
  };
}

/** The page a list cached, as far as these rules read it. */
export type PrevNextPage = Pick<GetListResult, "data" | "total" | "pageInfo">;

/**
 * Whether the page a list cached holds both neighbours of `id`. The first row
 * of a later page has its previous record on the page before, and the last row
 * of an earlier page has its next one on the page after.
 */
export function canUseCachedPage(
  id: Identifier,
  cached: PrevNextPage | undefined,
  page: number,
  perPage: number,
): boolean {
  if (!cached) return false;
  const index = cached.data.findIndex((record) => record.id === id);
  if (index === -1) return false;
  if (index === 0 && page > 1) return false;
  if (index === cached.data.length - 1) {
    const hasMore =
      cached.total != null
        ? page * perPage < cached.total
        : (cached.pageInfo?.hasNextPage ?? false);
    if (hasMore) return false;
  }
  return true;
}

export interface PrevNextResolution {
  prevId: Identifier | null;
  nextId: Identifier | null;
  /** Position of the record in the whole list; undefined when it is not in `records`. */
  index: number | undefined;
  total: number | undefined;
}

/**
 * The neighbours of `id` among `records`. `offset` is the number of rows that
 * precede `records` in the whole list, so `index` is a position in that list.
 */
export function resolvePrevNext(
  id: Identifier,
  records: readonly { id: Identifier }[],
  total: number | undefined,
  offset: number,
): PrevNextResolution {
  const position = records.findIndex((record) => record.id === id);
  if (position === -1) {
    return { prevId: null, nextId: null, index: undefined, total };
  }
  return {
    prevId: records[position - 1]?.id ?? null,
    nextId: records[position + 1]?.id ?? null,
    index: position + offset,
    total,
  };
}
