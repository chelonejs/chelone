import type {
  DataProvider,
  FetchJsonResult,
  GetListParams,
  GetListResult,
  Identifier,
  LooseRecord,
  PageInfo,
} from "@chelone/core";
import { fetchUtils, HttpError, ValidationError } from "@chelone/core";

export interface RestDataProviderOptions {
  apiUrl: string;
  /** The URL segment for a resource; defaults to the encoded resource name. */
  path?: (resource: string) => string;
  /** Read on every call, so a refreshed token is picked up. */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  /** `"include"` sends cookies for a session. */
  credentials?: RequestCredentials;
  /** The verb `update` sends; defaults to `PUT`. */
  updateMethod?: "PUT" | "PATCH";
  /** The query parameters for a list call. */
  listQuery?: (params: GetListParams) => Record<string, unknown>;
  /** The query parameters for a `getMany` call; defaults to `{ id: ids }`. */
  getManyQuery?: (ids: Identifier[]) => Record<string, unknown>;
  /**
   * `true` (the default) fetches many records in one request. `false` makes one
   * `getOne` call per id, for an API with no multi-id filter.
   */
  batchGetMany?: boolean;
  /** Turns a list response into a page of records. */
  parseList?: (response: FetchJsonResult, resource: string) => GetListResult;
  /** Turns a single-record response into a record. */
  parseRecord?: (response: FetchJsonResult, resource: string) => LooseRecord;
  /**
   * Turns an `HttpError` into the error a call rejects with, for every verb.
   * Replaces the default, which turns a 422 with `{ errors: { field: message } }`
   * from `create`, `update` and `updateMany` into a `ValidationError`.
   */
  toError?: (error: HttpError) => Error;
}

/** What a call can pass in `meta`. */
interface RestMeta {
  /** Added to this call's headers. */
  headers?: HeadersInit;
  /** Added to this call's query parameters. */
  query?: Record<string, unknown>;
}

export const defaultListQuery = (
  params: GetListParams,
): Record<string, unknown> => {
  const query: Record<string, unknown> = {};
  const { pagination, sort, filter } = params;
  if (pagination !== undefined) {
    if ("page" in pagination) {
      query.page = pagination.page;
      query.perPage = pagination.perPage;
    } else {
      query.limit = pagination.limit;
      if (pagination.cursor !== null) query.cursor = pagination.cursor;
    }
  }
  if (sort !== undefined) {
    query.sort = [sort]
      .flat()
      .map(({ field, order }) => (order === "DESC" ? `-${field}` : field))
      .join(",");
  }
  for (const key of Object.keys(filter ?? {})) {
    if (key in query) {
      throw new Error(
        `restDataProvider: the filter key "${key}" collides with a pagination or sort parameter. Pass listQuery to rename one.`,
      );
    }
  }
  return { ...query, ...filter };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const headerTotal = (response: FetchJsonResult): number | undefined => {
  const header = response.headers.get("X-Total-Count")?.trim();
  if (!header) return undefined;
  const total = Number(header);
  return Number.isFinite(total) ? total : undefined;
};

export const defaultParseList = (
  response: FetchJsonResult,
  resource: string,
): GetListResult => {
  const { json } = response;
  const body = Array.isArray(json) ? { data: json } : json;
  if (!isObject(body) || !Array.isArray(body.data)) {
    throw new Error(
      `restDataProvider: the ${resource} list response is not an array or { data, total?, pageInfo? }. Pass parseList to read it.`,
    );
  }
  const total =
    typeof body.total === "number" ? body.total : headerTotal(response);
  return {
    data: body.data as LooseRecord[],
    ...(total === undefined ? {} : { total }),
    ...(isObject(body.pageInfo) ? { pageInfo: body.pageInfo as PageInfo } : {}),
  };
};

export const defaultParseRecord = (
  response: FetchJsonResult,
  resource: string,
): LooseRecord => {
  if (!isObject(response.json)) {
    throw new Error(
      `restDataProvider: the ${resource} response is not a JSON object. Pass parseRecord to read it.`,
    );
  }
  return response.json as LooseRecord;
};

const isFieldErrors = (
  value: unknown,
): value is Record<string, string | string[]> =>
  isObject(value) &&
  Object.values(value).every(
    (entry) =>
      typeof entry === "string" ||
      (Array.isArray(entry) && entry.every((item) => typeof item === "string")),
  );

/** A 422 whose body carries `errors` becomes a `ValidationError`; anything else stays as it is. */
const defaultToValidationError = (error: HttpError): Error => {
  const errors = isObject(error.body) ? error.body.errors : undefined;
  if (error.status !== 422 || !isFieldErrors(errors)) return error;
  return new ValidationError(error.message, errors);
};

export function restDataProvider({
  apiUrl,
  path = encodeURIComponent,
  headers,
  credentials,
  updateMethod = "PUT",
  listQuery = defaultListQuery,
  getManyQuery = (ids) => ({ id: ids }),
  batchGetMany = true,
  parseList = defaultParseList,
  parseRecord: customParseRecord,
  toError,
}: RestDataProviderOptions): DataProvider {
  const baseUrl = apiUrl.replace(/\/+$/, "");
  const parseRecord = customParseRecord ?? defaultParseRecord;

  const request = async (
    resource: string,
    meta: unknown,
    {
      id,
      query,
      write,
      ...init
    }: RequestInit & { id?: unknown; query?: object; write?: boolean },
  ) => {
    const { headers: callHeaders, query: callQuery } = (meta ?? {}) as RestMeta;
    const merged = new Headers(
      typeof headers === "function" ? await headers() : headers,
    );
    for (const [name, value] of new Headers(callHeaders)) {
      merged.set(name, value);
    }
    const queryString = fetchUtils.queryParameters({ ...query, ...callQuery });
    const segment =
      id === undefined ? "" : `/${encodeURIComponent(String(id))}`;
    try {
      return await fetchUtils.fetchJson(
        `${baseUrl}/${path(resource)}${segment}${queryString === "" ? "" : `?${queryString}`}`,
        { ...init, headers: merged, credentials },
      );
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      if (toError) throw toError(error);
      throw write ? defaultToValidationError(error) : error;
    }
  };

  const provider: DataProvider = {
    async getList(resource, params) {
      const response = await request(resource, params.meta, {
        query: listQuery(params),
      });
      return parseList(response, resource) as never;
    },
    async getOne(resource, { id, meta }) {
      const response = await request(resource, meta, { id });
      return { data: parseRecord(response, resource) } as never;
    },
    async create(resource, { data, meta }) {
      const response = await request(resource, meta, {
        method: "POST",
        write: true,
        body: JSON.stringify(data),
      });
      return { data: parseRecord(response, resource) } as never;
    },
    async update(resource, { id, data, meta, previousData }) {
      const response = await request(resource, meta, {
        id,
        method: updateMethod,
        write: true,
        body: JSON.stringify(data),
      });
      // A 204 has no body, so what the caller sent stands in for the saved record.
      if (response.body.trim() === "") {
        return { data: { ...previousData, ...data, id } } as never;
      }
      return { data: parseRecord(response, resource) } as never;
    },
    async delete(resource, { id, previousData, meta }) {
      const response = await request(resource, meta, { id, method: "DELETE" });
      // Servers often answer a delete with a 204 or an acknowledgement such
      // as `{"success":true}`; the caller's last copy then stands in for the record.
      const body = response.json;
      const isRecord = isObject(body) && "id" in body;
      const useFallback =
        response.body.trim() === "" ||
        (customParseRecord === undefined && !isRecord);
      const data = useFallback
        ? (previousData ?? { id })
        : parseRecord(response, resource);
      return { data } as never;
    },
    async getMany(resource, { ids, meta }) {
      // An empty id filter writes no parameter, so the request would list the whole resource.
      if (ids.length === 0) return { data: [] };
      if (!batchGetMany) {
        const results = await Promise.all(
          ids.map((id) => provider.getOne(resource, { id, meta })),
        );
        return { data: results.map(({ data }) => data) } as never;
      }
      const response = await request(resource, meta, {
        query: getManyQuery(ids),
      });
      return { data: parseList(response, resource).data } as never;
    },
    async getManyReference(resource, { target, id, filter, ...params }) {
      return provider.getList(resource, {
        ...params,
        filter: { ...filter, [target]: id },
      });
    },
    // REST has no standard bulk verb, so each id gets its own call.
    async updateMany(resource, { ids, data, meta }) {
      await Promise.all(
        ids.map((id) => provider.update(resource, { id, data, meta })),
      );
      return { data: ids };
    },
    async deleteMany(resource, { ids, meta }) {
      await Promise.all(
        ids.map((id) => provider.delete(resource, { id, meta })),
      );
      return { data: ids };
    },
  };
  return provider;
}
