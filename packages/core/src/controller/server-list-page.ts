import type { GetListParams, PageInfo } from "../data/types";
import { getAtPath } from "../resource/get-at-path";
import type { Identifier } from "../resource/identifier";
import { isIdentifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type { SourceKey } from "../resource/source-path";
import {
  type ListControllerContext,
  type ListControllerOptions,
  listFetchParams,
} from "./list-controller";

export interface ServerListPageInput<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
  TReferences extends Record<string, keyof TResources & string>,
> {
  options?: ListControllerOptions<RecordOf<TResources, TName>>;
  /** The raw query string, with or without the leading `?`. */
  search?: string;
  /** `{ author_id: "users" }`: each key names the resource its ids live in. */
  references: TReferences & {
    [K in keyof TReferences]: K extends SourceKey<RecordOf<TResources, TName>>
      ? TReferences[K]
      : never;
  };
}

export interface ServerListPage<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
  TReferences extends Record<string, keyof TResources & string>,
> {
  /** The `getList` params the page was fetched with. */
  params: GetListParams;
  data: RecordOf<TResources, TName>[];
  total?: number;
  pageInfo?: PageInfo;
  /**
   * The referenced records by id, one map per key. Keys naming one resource
   * share its fetch, so each map holds every id fetched for that resource.
   */
  references: {
    [K in keyof TReferences]: ReadonlyMap<
      Identifier,
      RecordOf<TResources, TReferences[K]>
    >;
  };
}

/** The ids a column holds on one row: a scalar key or a to-many array, nullish dropped. */
function idsOf(row: ResourceRecord, key: string): Identifier[] {
  const value = getAtPath(row, key);
  if (Array.isArray(value)) return value.filter(isIdentifier);
  return isIdentifier(value) ? [value] : [];
}

/**
 * Fetches a list page and the records it references in one pass, for a server
 * render with no query cache to batch lookups. `getList` runs once with
 * `listFetchParams`, then one `getMany` per distinct referenced resource in
 * parallel, over every row and every key naming it, deduplicated in first-seen
 * order. A resource with no ids gets no call. A rejection rejects the load.
 */
export async function loadServerListPage<
  TResources extends ResourceMap,
  TName extends keyof TResources & string,
  const TReferences extends Record<string, keyof TResources & string>,
>(
  ctx: ListControllerContext<TResources>,
  resource: TName,
  input: ServerListPageInput<TResources, TName, TReferences>,
): Promise<ServerListPage<TResources, TName, TReferences>> {
  const params = listFetchParams(ctx, resource, input.options, input.search);
  const page = await ctx.dataProvider.getList(resource, params);

  const references: Record<string, keyof TResources & string> =
    input.references;
  const idsByResource = new Map<string, Set<Identifier>>();
  for (const row of page.data) {
    for (const [key, target] of Object.entries(references)) {
      const ids = idsByResource.get(target) ?? new Set<Identifier>();
      for (const id of idsOf(row, key)) ids.add(id);
      idsByResource.set(target, ids);
    }
  }

  const fetched = await Promise.all(
    [...idsByResource].flatMap(([target, ids]) =>
      ids.size === 0
        ? []
        : [
            ctx.dataProvider
              .getMany(target, { ids: [...ids] })
              .then(({ data }) => [target, data] as const),
          ],
    ),
  );
  const recordsByResource = new Map(
    fetched.map(([target, data]) => [
      target,
      new Map(data.map((record) => [record.id, record])),
    ]),
  );

  const loaded: Record<
    string,
    ReadonlyMap<Identifier, ResourceRecord>
  > = Object.fromEntries(
    Object.entries(references).map(([key, target]) => [
      key,
      recordsByResource.get(target) ?? new Map<Identifier, ResourceRecord>(),
    ]),
  );
  return {
    params,
    data: page.data,
    total: page.total,
    pageInfo: page.pageInfo,
    // type-escape: each key maps to the map of its resource's records, which `Object.fromEntries` widens to a string index
    references: loaded as ServerListPage<
      TResources,
      TName,
      TReferences
    >["references"],
  };
}
