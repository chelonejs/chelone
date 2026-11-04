import { getAtPath } from "../resource/get-at-path";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type {
  DataProvider,
  FilterPayload,
  GetListParams,
  GetListResult,
  Pagination,
  SortPayload,
} from "./types";

/** One array of records per resource name, each typed by that resource's schema. */
type FakeTables<TResources extends ResourceMap> = {
  [N in keyof TResources & string]?: RecordOf<TResources, N>[];
};

function applyFilter<TRecord>(
  rows: TRecord[],
  filter: FilterPayload | undefined,
): TRecord[] {
  if (!filter) return rows;
  return rows.filter((row) =>
    Object.entries(filter).every(
      ([key, value]) => getAtPath(row, key) === value,
    ),
  );
}

/** Orders numbers, strings, dates and booleans as `<` does; anything else ties. */
function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date)
    return compareValues(a.getTime(), b.getTime());
  if (
    (typeof a === "number" && typeof b === "number") ||
    (typeof a === "string" && typeof b === "string") ||
    (typeof a === "boolean" && typeof b === "boolean")
  ) {
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

function applySort<TRecord>(
  rows: TRecord[],
  sort: SortPayload | SortPayload[] | undefined,
): TRecord[] {
  if (!sort) return rows;
  const keys = Array.isArray(sort) ? sort : [sort];
  if (keys.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const { field, order } of keys) {
      const dir = order === "ASC" ? 1 : -1;
      const cmp = compareValues(getAtPath(a, field), getAtPath(b, field));
      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });
}

function paginate<TRecord extends ResourceRecord>(
  rows: TRecord[],
  pagination: Pagination | undefined,
): GetListResult<TRecord> {
  if (!pagination) return { data: rows, total: rows.length };
  if ("page" in pagination) {
    const start = (pagination.page - 1) * pagination.perPage;
    return {
      data: rows.slice(start, start + pagination.perPage),
      total: rows.length,
    };
  }
  // ponytail: cursor = stringified offset into the sorted array — fine for a
  // fake; real cursor providers use keyset (last-seen sort value).
  const offset = pagination.cursor === null ? 0 : Number(pagination.cursor);
  const data = rows.slice(offset, offset + pagination.limit);
  const next = offset + pagination.limit;
  return {
    data,
    total: rows.length,
    pageInfo: {
      nextCursor: next < rows.length ? String(next) : null,
      prevCursor:
        offset > 0 ? String(Math.max(0, offset - pagination.limit)) : null,
      hasNextPage: next < rows.length,
      hasPreviousPage: offset > 0,
    },
  };
}

/** In-memory DataProvider for tests and dogfooding. Mutates its own copy of the seed. */
export function fakeDataProvider<TResources extends ResourceMap>(
  initialData: FakeTables<TResources>,
): DataProvider<TResources> {
  const store: FakeTables<TResources> = structuredClone(initialData);
  const table = <TName extends keyof TResources & string>(
    resource: TName,
  ): RecordOf<TResources, TName>[] => {
    const rows = store[resource];
    if (!rows)
      throw new Error(`fakeDataProvider: unknown resource "${resource}"`);
    return rows;
  };
  const find = <TName extends keyof TResources & string>(
    resource: TName,
    id: Identifier,
  ): RecordOf<TResources, TName> => {
    const row = table(resource).find((r) => String(r.id) === String(id));
    if (!row)
      throw new Error(`fakeDataProvider: ${resource}#${String(id)} not found`);
    return row;
  };
  let nextId = 1_000_000;

  const listLike = <TRecord extends ResourceRecord>(
    rows: TRecord[],
    params: GetListParams,
  ) =>
    paginate(
      applySort(applyFilter(rows, params.filter), params.sort),
      params.pagination,
    );

  return {
    async getList(resource, params) {
      return listLike(table(resource), params);
    },
    async getOne(resource, params) {
      return { data: structuredClone(find(resource, params.id)) };
    },
    async getMany(resource, params) {
      return {
        data: params.ids.map((id) => structuredClone(find(resource, id))),
      };
    },
    async getManyReference(resource, params) {
      const rows = table(resource).filter(
        (r) => String(getAtPath(r, params.target)) === String(params.id),
      );
      return listLike(rows, params);
    },
    async create(resource, params) {
      // type-escape: a fake cannot prove that the sent fields plus an id make a whole record
      const row = {
        id: nextId++,
        ...structuredClone(params.data),
      } as RecordOf<TResources, typeof resource>;
      table(resource).push(row);
      return { data: structuredClone(row) };
    },
    async update(resource, params) {
      const row = find(resource, params.id);
      Object.assign(row, structuredClone(params.data));
      return { data: structuredClone(row) };
    },
    async updateMany(resource, params) {
      for (const id of params.ids)
        Object.assign(find(resource, id), structuredClone(params.data));
      return { data: params.ids };
    },
    async delete(resource, params) {
      const rows = table(resource);
      const idx = rows.findIndex((r) => String(r.id) === String(params.id));
      const removed = idx === -1 ? undefined : rows.splice(idx, 1)[0];
      if (!removed)
        throw new Error(
          `fakeDataProvider: ${resource}#${String(params.id)} not found`,
        );
      return { data: structuredClone(removed) };
    },
    async deleteMany(resource, params) {
      for (const id of params.ids) {
        const rows = table(resource);
        const idx = rows.findIndex((r) => String(r.id) === String(id));
        if (idx !== -1) rows.splice(idx, 1);
      }
      return { data: params.ids };
    },
  };
}
