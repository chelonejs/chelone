import type {
  DataProvider,
  GetListParams,
  GetManyReferenceParams,
  Pagination,
} from "@chelone/core";
import { HttpError } from "@chelone/core";
import type { SupabaseSessionSource } from "./http";
import { supabaseRequest } from "./http";
import type { PostgrestOperator } from "./postgrest/filters";
import { buildFilters } from "./postgrest/filters";
import {
  decodeId,
  getPrimaryKey,
  idFilter,
  withVirtualId,
} from "./postgrest/keys";
import type {
  PostgrestMeta,
  PostgrestSortOrder,
} from "./postgrest/order-select";
import { buildOrder, buildSelect } from "./postgrest/order-select";
import { toQueryString } from "./postgrest/query-string";

export interface SupabaseDataProviderOptions {
  instanceUrl: string;
  /** A legacy anon key or a `sb_publishable_` key. */
  apiKey: string;
  /** Supplies the session whose token authorises each call. */
  client?: SupabaseSessionSource;
  /** The operator for a filter key with no `@op` suffix. */
  defaultListOp?: PostgrestOperator;
  /** Key columns per resource; a resource not listed is keyed by `id`. */
  primaryKeys?: Record<string, string[]>;
  schema?: string | (() => string);
  sortOrder?: PostgrestSortOrder;
}

/** What a call can pass in `meta`. */
interface SupabaseMeta extends PostgrestMeta {
  /** Overrides the `schema` option for this call. */
  schema?: string;
  headers?: HeadersInit;
}

type Row = Record<string, unknown>;
type Pair = [string, string];

const OBJECT_ACCEPT = "application/vnd.pgrst.object+json";

const notImplemented = async (): Promise<never> => {
  throw new Error("not implemented");
};

export function supabaseDataProvider({
  instanceUrl,
  apiKey,
  client,
  defaultListOp = "eq",
  primaryKeys,
  schema,
  sortOrder,
}: SupabaseDataProviderOptions): DataProvider {
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
    const supabaseMeta = (meta ?? {}) as SupabaseMeta;
    const primaryKey = getPrimaryKey(resource, primaryKeys);
    const order = buildOrder(sort, primaryKey, {
      sortOrder,
      meta: supabaseMeta,
    });
    const { headers, json } = await request(
      resource,
      [
        ["select", buildSelect(supabaseMeta)],
        ...pageParams(pagination),
        ...buildFilters(filter ?? {}, { defaultListOp }),
        ...(order === undefined ? [] : ([["order", order]] as Pair[])),
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

  return {
    getList: list as DataProvider["getList"],

    async getOne(resource, { id, meta }) {
      const supabaseMeta = (meta ?? {}) as SupabaseMeta;
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
        return { data: withVirtualId(json as Row, primaryKey) } as never;
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
      const supabaseMeta = (meta ?? {}) as SupabaseMeta;
      const primaryKey = getPrimaryKey(resource, primaryKeys);
      const { json } = await request(
        resource,
        [["select", buildSelect(supabaseMeta)], ...idFilter(ids, primaryKey)],
        supabaseMeta,
      );
      return {
        data: (json as Row[]).map((row) => withVirtualId(row, primaryKey)),
      } as never;
    },

    getManyReference(resource, params: GetManyReferenceParams) {
      const { target, id, filter } = params;
      // `@eq` keeps the target an equality test whatever `defaultListOp` is.
      return list(resource, {
        ...params,
        filter: { ...filter, [`${target}@eq`]: id },
      }) as never;
    },

    create: notImplemented,
    update: notImplemented,
    delete: notImplemented,
    updateMany: notImplemented,
    deleteMany: notImplemented,
  };
}
