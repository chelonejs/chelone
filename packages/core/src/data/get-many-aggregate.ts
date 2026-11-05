import { hashKey, type QueryClient } from "@tanstack/query-core";
import type { Identifier } from "../resource/identifier";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { manyKey, oneKey } from "./keys";
import type { DataContext } from "./query-options";
import type { GetManyParams } from "./types";

interface Caller {
  queryClient: QueryClient;
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

/**
 * One pending batch per resource and meta, per provider. A flushed batch leaves
 * the map. Contexts that share a provider share a batch, so the flush seeds the
 * cache of every caller's `queryClient`.
 */
const pending = new WeakMap<object, Map<string, Batch>>();

function flush(ctx: DataContext, batchKey: string, batch: Batch): void {
  pending.get(ctx.dataProvider)?.delete(batchKey);
  void settle(ctx, batch);
}

/**
 * Every failure on the way, a synchronous throw from the provider or a
 * malformed result included, rejects the whole batch. Rejecting a caller that
 * already resolved is a no-op.
 */
async function settle(ctx: DataContext, batch: Batch): Promise<void> {
  try {
    const provider = ctx.dataProvider;
    const params: GetManyParams = { ids: [...batch.ids.values()] };
    if (batch.meta !== undefined) params.meta = batch.meta;
    const result = await provider.getMany(batch.resource, params);
    const queryClients = new Set(batch.callers.map((c) => c.queryClient));
    const byId = new Map<string, { id: Identifier }>();
    for (const record of result.data) {
      byId.set(String(record.id), record);
      for (const queryClient of queryClients) {
        queryClient.setQueryData(
          oneKey(batch.resource, { id: record.id }),
          record,
        );
      }
    }
    for (const caller of batch.callers) {
      const own = new Map<string, { id: Identifier }>();
      for (const id of caller.ids) {
        const record = byId.get(String(id));
        if (record) own.set(String(id), record);
      }
      caller.resolve([...own.values()]);
    }
  } catch (error) {
    for (const caller of batch.callers) caller.reject(error);
  }
}

/**
 * Joins the pending batch for this provider, resource and `meta`, opening it
 * and scheduling its `setTimeout(0)` flush if there is none. Resolves once the
 * flush has the provider's answer, with this caller's own records in its own id
 * order, repeated ids once and ids the provider omitted left out. Rejects with
 * the batch's error.
 */
function enqueue(
  ctx: DataContext,
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
    // Copied: the caller may reuse its array before the flush runs.
    target.callers.push({
      queryClient: ctx.queryClient,
      ids: [...params.ids],
      resolve,
      reject,
    });
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
      const records = await enqueue(ctx, resource, params);
      return records as RecordOf<TResources, TName>[];
    },
  };
}
