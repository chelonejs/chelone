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

type Row = ResourceRecord & Record<string, unknown>;

function applyFilter(rows: Row[], filter: FilterPayload | undefined): Row[] {
  if (!filter) return rows;
  return rows.filter((row) =>
    Object.entries(filter).every(([key, value]) => row[key] === value),
  );
}

function applySort(rows: Row[], sort: SortPayload | undefined): Row[] {
  if (!sort) return rows;
  const dir = sort.order === "ASC" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sort.field] as never;
    const bv = b[sort.field] as never;
    return av < bv ? -dir : av > bv ? dir : 0;
  });
}

function paginate(
  rows: Row[],
  pagination: Pagination | undefined,
): GetListResult<Row> {
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
  initialData: {
    [K in keyof TResources]?: RecordOf<TResources, K>[];
  },
): DataProvider<TResources> {
  const store = new Map<string, Row[]>();
  for (const [resource, rows] of Object.entries(initialData)) {
    store.set(resource, structuredClone(rows ?? []) as Row[]);
  }
  const table = (resource: string): Row[] => {
    const rows = store.get(resource);
    if (!rows)
      throw new Error(`fakeDataProvider: unknown resource "${resource}"`);
    return rows;
  };
  const find = (resource: string, id: unknown): Row => {
    const row = table(resource).find((r) => String(r.id) === String(id));
    if (!row)
      throw new Error(`fakeDataProvider: ${resource}#${String(id)} not found`);
    return row;
  };
  let nextId = 1_000_000;

  const listLike = (rows: Row[], params: GetListParams) =>
    paginate(
      applySort(applyFilter(rows, params.filter), params.sort),
      params.pagination,
    );

  return {
    async getList(resource, params) {
      return listLike(table(resource), params) as never;
    },
    async getOne(resource, params) {
      return { data: structuredClone(find(resource, params.id)) } as never;
    },
    async getMany(resource, params) {
      return {
        data: params.ids.map((id) => structuredClone(find(resource, id))),
      } as never;
    },
    async getManyReference(resource, params) {
      const rows = table(resource).filter(
        (r) => String(r[params.target]) === String(params.id),
      );
      return listLike(rows, params) as never;
    },
    async create(resource, params) {
      const row = { id: nextId++, ...structuredClone(params.data) } as Row;
      table(resource).push(row);
      return { data: structuredClone(row) } as never;
    },
    async update(resource, params) {
      const row = find(resource, params.id);
      Object.assign(row, structuredClone(params.data));
      return { data: structuredClone(row) } as never;
    },
    async updateMany(resource, params) {
      for (const id of params.ids)
        Object.assign(find(resource, id), structuredClone(params.data));
      return { data: params.ids };
    },
    async delete(resource, params) {
      const rows = table(resource);
      const idx = rows.findIndex((r) => String(r.id) === String(params.id));
      if (idx === -1)
        throw new Error(
          `fakeDataProvider: ${resource}#${String(params.id)} not found`,
        );
      const [removed] = rows.splice(idx, 1);
      return { data: structuredClone(removed) } as never;
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
