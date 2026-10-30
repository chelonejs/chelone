import type { QueryClient } from "@tanstack/query-core";
import type { Identifier } from "../resource/identifier";
import type { RecordOf, ResourceMap } from "../resource/registry";
import {
  infiniteListKey,
  listKey,
  manyKey,
  manyReferenceKey,
  oneKey,
} from "./keys";
import type {
  DataProvider,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyReferenceParams,
  GetManyReferenceResult,
  GetOneParams,
  InfiniteListParams,
} from "./types";

/** Everything the data runtime needs — framework adapters provide this via their own context. */
export interface DataContext<TResources extends ResourceMap = ResourceMap> {
  dataProvider: DataProvider<TResources>;
  queryClient: QueryClient;
}

function seedRecords(
  queryClient: QueryClient,
  resource: string,
  records: Array<{ id: Identifier }>,
): void {
  for (const record of records) {
    queryClient.setQueryData(oneKey(resource, { id: record.id }), record);
  }
}

/** Plain option objects — consumable by any framework's useQuery AND server-side prefetchQuery. */
export function getListOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName, params: GetListParams = {}) {
  return {
    queryKey: listKey(resource, params),
    queryFn: async () => {
      const result = await ctx.dataProvider.getList(resource, params);
      seedRecords(ctx.queryClient, resource, result.data);
      return result;
    },
  };
}

/**
 * One query that gathers pages: an infinite observer or `fetchInfiniteQuery`
 * consumes it. The page param is the page number; rows are seeded into
 * `oneKey` like `getListOptions` does.
 */
export function getInfiniteListOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName, params: InfiniteListParams) {
  const { page, perPage } = params.pagination;
  return {
    queryKey: infiniteListKey(resource, params),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const result = await ctx.dataProvider.getList(resource, {
        ...params,
        pagination: { page: pageParam, perPage },
      });
      seedRecords(ctx.queryClient, resource, result.data);
      return result;
    },
    initialPageParam: page,
    getNextPageParam: (
      lastPage: GetListResult<RecordOf<TResources, TName>>,
      allPages: GetListResult<RecordOf<TResources, TName>>[],
      lastPageParam: number,
      allPageParams: number[],
    ): number | undefined => {
      const { pageInfo, total } = lastPage;
      if (pageInfo?.hasNextPage !== undefined) {
        return pageInfo.hasNextPage ? lastPageParam + 1 : undefined;
      }
      if (total != null) {
        // Rows before the first loaded page count as loaded: the query may start past page 1.
        const skipped = Math.max(
          0,
          ((allPageParams[0] ?? page) - 1) * perPage,
        );
        const loaded = allPages.reduce((n, p) => n + p.data.length, skipped);
        return loaded < total ? lastPageParam + 1 : undefined;
      }
      // An empty page ends the list even when perPage is 0 or negative.
      const { length } = lastPage.data;
      return length > 0 && length >= perPage ? lastPageParam + 1 : undefined;
    },
    getPreviousPageParam: (
      _firstPage: GetListResult<RecordOf<TResources, TName>>,
      _allPages: GetListResult<RecordOf<TResources, TName>>[],
      firstPageParam: number,
      _allPageParams: number[],
    ): number | undefined =>
      firstPageParam > 1 ? firstPageParam - 1 : undefined,
  };
}

/** One record by id, cached under `oneKey`. */
export function getOneOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName, params: GetOneParams) {
  return {
    queryKey: oneKey(resource, params),
    queryFn: async (): Promise<RecordOf<TResources, TName>> => {
      const result = await ctx.dataProvider.getOne(resource, params);
      return result.data;
    },
  };
}

/** Records for an array of ids, seeded into `oneKey`. Resolves to the rows only. */
export function getManyOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName, params: GetManyParams) {
  return {
    queryKey: manyKey(resource, params),
    queryFn: async () => {
      const result = await ctx.dataProvider.getMany(resource, params);
      seedRecords(ctx.queryClient, resource, result.data);
      return result.data;
    },
  };
}

/**
 * Records whose `params.target` field equals `params.id` (the FK on the
 * referenced-FROM side). Keeps the whole `GetManyReferenceResult` (rows and
 * `total`) and seeds each row into the `oneKey` cache.
 */
export function getManyReferenceOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(
  ctx: DataContext<TResources>,
  resource: TName,
  params: GetManyReferenceParams,
) {
  return {
    queryKey: manyReferenceKey(resource, params),
    queryFn: async (): Promise<
      GetManyReferenceResult<RecordOf<TResources, TName>>
    > => {
      const result = await ctx.dataProvider.getManyReference(resource, params);
      seedRecords(ctx.queryClient, resource, result.data);
      return result;
    },
  };
}
