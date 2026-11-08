import type {
  DataProvider,
  GetListParams,
  GetManyReferenceParams,
  Pagination,
  RecordOf,
  RegisteredResources,
  ResourceMap,
  SourceKey,
} from "@chelone/core";
import { HttpError, isHeadersInit, isRecord } from "@chelone/core";
import type { SupabaseSessionSource } from "./http";
import { supabaseRequest } from "./http";
import type { PostgrestOperator } from "./postgrest/filters";
import { buildFilters } from "./postgrest/filters";
import {
  decodeId,
  encodeId,
  getPrimaryKey,
  idFilter,
  removePrimaryKey,
  withoutVirtualId,
  withVirtualId,
} from "./postgrest/keys";
import type {
  PostgrestMeta,
  PostgrestSortOrder,
} from "./postgrest/order-select";
import { buildOrder, buildSelect } from "./postgrest/order-select";
import { toQueryString } from "./postgrest/query-string";

export interface SupabaseDataProviderOptions<
  TResources extends ResourceMap = RegisteredResources,
> {
  instanceUrl: string;
  /** A legacy anon key or a `sb_publishable_` key. */
  apiKey: string;
  /** Supplies the session whose token authorises each call. */
  client?: SupabaseSessionSource;
  /** The operator for a filter key with no `@op` suffix. */
  defaultListOp?: PostgrestOperator;
  /** Key columns per resource; a resource not listed is keyed by `id`. */
  primaryKeys?: {
    [TName in keyof TResources & string]?: readonly SourceKey<
      RecordOf<TResources, TName>
    >[];
  };
  schema?: string | (() => string);
  sortOrder?: PostgrestSortOrder;
}

/** What a call can pass in `meta`. */
interface SupabaseMeta extends PostgrestMeta {
  /** Overrides the `schema` option for this call. */
  schema?: string;
  headers?: HeadersInit;
}

/** A `meta` key this provider reads, refused for the shape it cannot use. */
function badMeta(key: string, expected: string): never {
  throw new TypeError(`supabaseDataProvider: meta.${key} must be ${expected}`);
}

/** A list of column or table names, as `columns` and `embed` take them. */
function isNameList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((name) => typeof name === "string")
  );
}

/**
 * The `meta` this provider reads, narrowed once per call. `undefined` and
 * `null` are an empty meta, a key this provider does not know is dropped, and
 * a key it does know is kept only in the shape it can use: a wrong one throws
 * naming the field, rather than the call going out without the header or the
 * schema the caller meant to send.
 */
function supabaseMetaOf(meta: unknown): SupabaseMeta {
  if (meta === undefined || meta === null) return {};
  if (!isRecord(meta)) {
    throw new TypeError(
      "supabaseDataProvider: meta must be an object, undefined or null",
    );
  }
  const narrowed: SupabaseMeta = {};
  const { schema, headers, columns, embed } = meta;
  if (schema !== undefined) {
    if (typeof schema === "string") narrowed.schema = schema;
    else badMeta("schema", "a string");
  }
  if (headers !== undefined) {
    if (isHeadersInit(headers)) narrowed.headers = headers;
    else
      badMeta(
        "headers",
        "a Headers, a list of [name, value] pairs or a record of strings",
      );
  }
  if (columns !== undefined) {
    if (typeof columns === "string") narrowed.columns = columns;
    else if (isNameList(columns)) narrowed.columns = columns;
    else badMeta("columns", "a string or a list of columns");
  }
  if (embed !== undefined) {
    if (isNameList(embed)) narrowed.embed = embed;
    else badMeta("embed", "a list of tables");
  }
  for (const key of ["nullsfirst", "nullslast"] as const) {
    const placement = meta[key];
    if (placement === undefined) continue;
    if (typeof placement === "boolean") narrowed[key] = placement;
    else if (isNameList(placement)) narrowed[key] = placement;
    else badMeta(key, "true or a list of columns");
  }
  return narrowed;
}

type Row = Record<string, unknown>;
type Pair = [string, string];

const OBJECT_ACCEPT = "application/vnd.pgrst.object+json";

const RETURN_REPRESENTATION = { Prefer: "return=representation" };

// Key options must not infer a map that bypasses the registered resources.
export function supabaseDataProvider<
  TResources extends ResourceMap = RegisteredResources,
>({
  instanceUrl,
  apiKey,
  client,
  defaultListOp = "eq",
  primaryKeys,
  schema,
  sortOrder,
}: SupabaseDataProviderOptions<NoInfer<TResources>>): DataProvider {
  const baseUrl = `${instanceUrl.replace(/\/+$/, "")}/rest/v1`;

  const request = (
    resource: string,
    pairs: Pair[],
    meta: SupabaseMeta,
    init: RequestInit = {},
  ) =>
    supabaseRequest(
      {
        baseUrl,
        apiKey,
        client,
        schema:
          meta.schema ?? (typeof schema === "function" ? schema() : schema),
        headers: meta.headers,
      },
      `/${encodeURIComponent(resource)}?${toQueryString(pairs)}`,
      init,
    );

  const pageParams = (pagination: Pagination | undefined): Pair[] => {
    if (!pagination) return [];
    if ("cursor" in pagination) {
      throw new Error(
        "supabaseDataProvider does not support cursor pagination",
      );
    }
    const { page, perPage } = pagination;
    return [
      ["offset", String((page - 1) * perPage)],
      ["limit", String(perPage)],
    ];
  };

  async function list(
    resource: string,
    { pagination, sort, filter, meta }: GetListParams,
  ) {
    const supabaseMeta = supabaseMetaOf(meta);
    const primaryKey = getPrimaryKey(resource, primaryKeys);
    const order = buildOrder(sort, primaryKey, {
      sortOrder,
      meta: supabaseMeta,
    });
    const orderPairs: Pair[] = order === undefined ? [] : [["order", order]];
    const { headers, json } = await request(
      resource,
      [
        ["select", buildSelect(supabaseMeta)],
        ...pageParams(pagination),
        ...buildFilters(filter ?? {}, { defaultListOp }),
        ...orderPairs,
      ],
      supabaseMeta,
      { headers: { Prefer: "count=exact" } },
    );

    const range = headers.get("Content-Range");
    if (range === null) {
      throw new Error(
        "The Content-Range header is missing in the HTTP response. The data provider reads the total number of results from it to build the pagination. If you are using CORS, did you declare Content-Range in the Access-Control-Expose-Headers header?",
      );
    }
    const total = range.split("/").pop();
    return {
      data: (json as Row[]).map((row) => withVirtualId(row, primaryKey)),
      total: total === undefined || total === "*" ? undefined : Number(total),
    };
  }

  /** A write that answers one row; PostgREST answers 406 when none matched. */
  async function writeOne(
    resource: string,
    pairs: Pair[],
    meta: SupabaseMeta,
    init: RequestInit,
  ) {
    try {
      const { json } = await request(resource, pairs, meta, {
        ...init,
        headers: { ...RETURN_REPRESENTATION, Accept: OBJECT_ACCEPT },
      });
      return json as Row;
    } catch (error) {
      if (error instanceof HttpError && error.status === 406) {
        throw new HttpError(error.message, 404, error.body);
      }
      throw error;
    }
  }

  async function writeMany(
    resource: string,
    pairs: Pair[],
    meta: SupabaseMeta,
    init: RequestInit,
    primaryKey: readonly string[],
  ) {
    const { json } = await request(resource, pairs, meta, {
      ...init,
      headers: RETURN_REPRESENTATION,
    });
    return (json as Row[]).map((row) => encodeId(row, primaryKey));
  }

  return {
    getList: list,

    async getOne(resource, { id, meta }) {
      const supabaseMeta = supabaseMetaOf(meta);
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      const key = Object.entries(decodeId(id, primaryKey)).map(
        ([column, value]): Pair => [column, `eq.${value}`],
      );
      try {
        const { json } = await request(
          resource,
          [["select", buildSelect(supabaseMeta)], ...key],
          supabaseMeta,
          { headers: { Accept: OBJECT_ACCEPT } },
        );
        return { data: withVirtualId(json as Row, primaryKey) };
      } catch (error) {
        // PostgREST answers a single-object request that matches no row with 406.
        if (error instanceof HttpError && error.status === 406) {
          throw new HttpError(error.message, 404, error.body);
        }
        throw error;
      }
    },

    async getMany(resource, { ids, meta }) {
      if (ids.length === 0) return { data: [] };
      const supabaseMeta = supabaseMetaOf(meta);
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      const { json } = await request(
        resource,
        [["select", buildSelect(supabaseMeta)], ...idFilter(ids, primaryKey)],
        supabaseMeta,
      );
      return {
        data: (json as Row[]).map((row) => withVirtualId(row, primaryKey)),
      };
    },

    getManyReference(resource, params: GetManyReferenceParams) {
      const { target, id, filter } = params;
      // `@eq` keeps the target an equality test whatever `defaultListOp` is.
      return list(resource, {
        ...params,
        filter: { ...filter, [`${target}@eq`]: id },
      });
    },

    async create(resource, { data, meta }) {
      const supabaseMeta = supabaseMetaOf(meta);
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      const row = await writeOne(resource, [], supabaseMeta, {
        method: "POST",
        body: JSON.stringify(withoutVirtualId(data, primaryKey)),
      });
      return { data: withVirtualId(row, primaryKey) };
    },

    async update(resource, { id, data, meta }) {
      const supabaseMeta = supabaseMetaOf(meta);
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      const row = await writeOne(
        resource,
        idFilter([id], primaryKey),
        supabaseMeta,
        {
          method: "PATCH",
          body: JSON.stringify(
            removePrimaryKey(withoutVirtualId(data, primaryKey), primaryKey),
          ),
        },
      );
      return { data: withVirtualId(row, primaryKey) };
    },

    async updateMany(resource, { ids, data, meta }) {
      if (ids.length === 0) return { data: [] };
      const supabaseMeta = supabaseMetaOf(meta);
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      return {
        data: await writeMany(
          resource,
          idFilter(ids, primaryKey),
          supabaseMeta,
          {
            method: "PATCH",
            body: JSON.stringify(
              removePrimaryKey(withoutVirtualId(data, primaryKey), primaryKey),
            ),
          },
          primaryKey,
        ),
      };
    },

    async delete(resource, { id, meta }) {
      const supabaseMeta = supabaseMetaOf(meta);
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      const row = await writeOne(
        resource,
        idFilter([id], primaryKey),
        supabaseMeta,
        { method: "DELETE" },
      );
      return { data: withVirtualId(row, primaryKey) };
    },

    async deleteMany(resource, { ids, meta }) {
      if (ids.length === 0) return { data: [] };
      const supabaseMeta = supabaseMetaOf(meta);
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      return {
        data: await writeMany(
          resource,
          idFilter(ids, primaryKey),
          supabaseMeta,
          { method: "DELETE" },
          primaryKey,
        ),
      };
    },
  };
}
