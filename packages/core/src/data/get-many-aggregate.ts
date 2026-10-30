import { hashKey } from "@tanstack/query-core";
import type { Identifier } from "../resource/identifier";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { manyKey, oneKey } from "./keys";
import type { DataContext } from "./query-options";
import type { DataProvider, GetManyParams } from "./types";

interface Caller {
  ids: Identifier[];
  resolve: (records: Array<{ id: Identifier }>) => void;
  reject: (error: unknown) => void;
}

interface Batch {
  resource: string;
  meta: unknown;
  ids: Map<string, Identifier>;
  callers: Caller[];
}

/** One pending batch per resource and meta, per provider. A flushed batch leaves the map. */
const pending = new WeakMap<object, Map<string, Batch>>();

function flush(ctx: DataContext<never>, batchKey: string, batch: Batch): void {
  pending.get(ctx.dataProvider)?.delete(batchKey);
  const provider = ctx.dataProvider as DataProvider<ResourceMap>;
  const params: GetManyParams = { ids: [...batch.ids.values()] };
  if (batch.meta !== undefined) params.meta = batch.meta;
  provider.getMany(batch.resource, params).then(
    (result) => {
      const byId = new Map<string, { id: Identifier }>();
      for (const record of result.data) {
        byId.set(String(record.id), record);
        ctx.queryClient.setQueryData(
          oneKey(batch.resource, { id: record.id }),
          record,
        );
      }
      for (const caller of batch.callers) {
        const own: Array<{ id: Identifier }> = [];
        for (const id of caller.ids) {
          const record = byId.get(String(id));
          if (record) own.push(record);
        }
        caller.resolve(own);
      }
    },
    (error: unknown) => {
      for (const caller of batch.callers) caller.reject(error);
    },
  );
}

function enqueue(
  ctx: DataContext<never>,
  resource: string,
  params: GetManyParams,
): Promise<Array<{ id: Identifier }>> {
  const batchKey = hashKey([resource, { meta: params.meta }]);
  let batches = pending.get(ctx.dataProvider);
  if (!batches) {
    batches = new Map();
    pending.set(ctx.dataProvider, batches);
  }
  let batch = batches.get(batchKey);
  if (!batch) {
    const created: Batch = {
      resource,
      meta: params.meta,
      ids: new Map(),
      callers: [],
    };
    batch = created;
    batches.set(batchKey, created);
    setTimeout(() => flush(ctx, batchKey, created), 0);
  }
  for (const id of params.ids) {
    if (!batch.ids.has(String(id))) batch.ids.set(String(id), id);
  }
  const target = batch;
  return new Promise((resolve, reject) => {
    target.callers.push({ ids: params.ids, resolve, reject });
  });
}

/**
 * Same signature and result as `getManyOptions`, but reads started in the same
 * tick reach the data provider as one `getMany` per resource and `meta`.
 */
export function getManyAggregateOptions<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
>(ctx: DataContext<TResources>, resource: TName, params: GetManyParams) {
  return {
    queryKey: manyKey(resource, params),
    queryFn: async (): Promise<RecordOf<TResources, TName>[]> => {
      if (params.ids.length === 0) return [];
      const records = await enqueue(
        ctx as DataContext<never>,
        resource,
        params,
      );
      return records as RecordOf<TResources, TName>[];
    },
  };
}
