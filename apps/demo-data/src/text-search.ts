import {
  type DataProvider,
  type GetListResult,
  getAtPath,
  type Pagination,
  type ResourceMap,
} from "@chelone/core";

export interface TextSearchFields {
  /** Fields the `q` filter searches. */
  q: readonly string[];
  /** Filter keys matched by a substring of their own field, not by equality. */
  contains?: readonly string[];
}

/**
 * `fakeDataProvider` matches a filter by equality, so the `q` search a list's
 * search box sends finds nothing, and neither does a partial value typed into
 * a single-field search. This adds both for the resources named in `fields`:
 * a case-insensitive substring match, applied before sorting and paging like
 * every other filter.
 */
export function withTextSearch<TResources extends ResourceMap>(
  provider: DataProvider<TResources>,
  fields: { [N in keyof TResources & string]?: TextSearchFields },
): DataProvider<TResources> {
  return {
    ...provider,
    async getList(resource, params) {
      const searched = fields[resource];
      if (!searched) return provider.getList(resource, params);

      const contains = searched.contains ?? [];
      const { q, ...rest } = params.filter ?? {};
      const needles: { paths: readonly string[]; needle: string }[] = [];
      if (typeof q === "string" && q !== "") {
        needles.push({ paths: searched.q, needle: q.toLowerCase() });
      }
      const filter = { ...rest };
      for (const key of contains) {
        const value = filter[key];
        delete filter[key];
        if (typeof value === "string" && value !== "") {
          needles.push({ paths: [key], needle: value.toLowerCase() });
        }
      }
      if (needles.length === 0) {
        return provider.getList(resource, { ...params, filter });
      }

      const { data } = await provider.getList(resource, {
        ...params,
        filter,
        pagination: undefined,
      });
      const matches = data.filter((row) =>
        needles.every(({ paths, needle }) =>
          paths.some((path) =>
            String(getAtPath(row, path) ?? "")
              .toLowerCase()
              .includes(needle),
          ),
        ),
      );
      return paginate(matches, params.pagination);
    },
  };
}

function paginate<TRecord extends object>(
  matches: TRecord[],
  pagination: Pagination | undefined,
): GetListResult<TRecord> {
  if (!pagination) return { data: matches, total: matches.length };
  if ("page" in pagination) {
    const start = (pagination.page - 1) * pagination.perPage;
    return {
      data: matches.slice(start, start + pagination.perPage),
      total: matches.length,
    };
  }
  // The cursor is a stringified offset, as in `fakeDataProvider`.
  const offset = pagination.cursor === null ? 0 : Number(pagination.cursor);
  const next = offset + pagination.limit;
  return {
    data: matches.slice(offset, next),
    total: matches.length,
    pageInfo: {
      nextCursor: next < matches.length ? String(next) : null,
      prevCursor:
        offset > 0 ? String(Math.max(0, offset - pagination.limit)) : null,
      hasNextPage: next < matches.length,
      hasPreviousPage: offset > 0,
    },
  };
}
