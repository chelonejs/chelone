import {
  DEFAULT_PER_PAGE,
  type GetListParams,
  type LooseSortPayload,
  serializeListParams,
} from "@chelone/core";

/** The state a list's URL holds, read from the params its page was fetched with. */
interface ServerListUrlState {
  page: number;
  perPage: number;
  /** The first sort key, which the headers show. */
  primary: LooseSortPayload | undefined;
  /** What a link to another page of this list keeps. */
  state: {
    sort?: LooseSortPayload;
    filter?: object;
    perPage: number;
  };
}

function readUrlState({
  pagination,
  sort,
  filter,
}: GetListParams): ServerListUrlState {
  const { page, perPage } =
    pagination && "page" in pagination
      ? pagination
      : { page: 1, perPage: DEFAULT_PER_PAGE };
  const primary = Array.isArray(sort) ? sort[0] : sort;
  // The URL holds one sort. A page link that wrote the primary key alone would
  // fetch the next page on a different order, so it leaves the sort out and
  // the loader's own multi-key sort applies again.
  const multiKey = Array.isArray(sort) && sort.length > 1;
  return {
    page,
    perPage,
    primary,
    state: { sort: multiKey ? undefined : primary, filter, perPage },
  };
}

/** The URL for the page's params with `patch` over them. */
function hrefOf(
  path: string,
  current: ServerListUrlState["state"],
  patch: { sort?: LooseSortPayload; page: number },
): string {
  const sort = patch.sort ?? current.sort;
  const filter =
    current.filter && Object.keys(current.filter).length > 0
      ? current.filter
      : undefined;
  return `${path}${serializeListParams({
    filter,
    sort: sort?.field,
    order: sort?.order,
    page: patch.page,
    perPage: current.perPage,
  })}`;
}

export { hrefOf, readUrlState };
