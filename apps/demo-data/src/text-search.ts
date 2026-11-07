import { type DataProvider, getAtPath, type ResourceMap } from "@chelone/core";

/**
 * `fakeDataProvider` matches a filter by equality, so the `q` search a list's
 * search box sends finds nothing. This adds it for the resources named in
 * `fields`: a case-insensitive substring of any of those fields, applied
 * before sorting and paging like every other filter.
 */
export function withTextSearch<TResources extends ResourceMap>(
  provider: DataProvider<TResources>,
  fields: { [N in keyof TResources & string]?: readonly string[] },
): DataProvider<TResources> {
  return {
    ...provider,
    async getList(resource, params) {
      const searched = fields[resource];
      const { q, ...filter } = params.filter ?? {};
      if (!searched) return provider.getList(resource, params);
      if (typeof q !== "string" || q === "") {
        return provider.getList(resource, { ...params, filter });
      }

      const { data } = await provider.getList(resource, {
        ...params,
        filter,
        pagination: undefined,
      });
      const needle = q.toLowerCase();
      const matches = data.filter((row) =>
        searched.some((field) =>
          String(getAtPath(row, field) ?? "")
            .toLowerCase()
            .includes(needle),
        ),
      );
      const { pagination } = params;
      const start =
        pagination && "page" in pagination
          ? (pagination.page - 1) * pagination.perPage
          : 0;
      const end =
        pagination && "page" in pagination
          ? start + pagination.perPage
          : matches.length;
      return { data: matches.slice(start, end), total: matches.length };
    },
  };
}
