import type { QueryClient } from "@tanstack/query-core";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { listKey, manyKey, oneKey } from "./keys";
import type {
  DataProvider,
  GetListParams,
  GetManyParams,
  GetOneParams,
} from "./types";

/** Everything the data runtime needs — framework adapters provide this via their own context. */
export interface DataContext<TResources extends ResourceMap = ResourceMap> {
  dataProvider: DataProvider<TResources>;
  queryClient: QueryClient;
}

function seedRecords(
  queryClient: QueryClient,
  resource: string,
  records: Array<{ id: string | number }>,
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
