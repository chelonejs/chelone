/**
 * Pure, framework-agnostic serialization between list parameters and a URL
 * query string. No router, no react, no vue — just strings and plain objects,
 * so it is safe to import in `@chelone/core`, a loader, node, or the browser.
 *
 * The wire FORMAT mirrors react-admin's `useListParams`
 * (`?filter=<json>&displayedFilters=<json>&sort=<field>&order=<ASC|DESC>&page=<n>&perPage=<n>`):
 * `filter` and `displayedFilters` are JSON-encoded; `sort` is the field name
 * with a sibling `order`; `page`/`perPage` are decimal integers. The logic is
 * re-derived, not copied — Chelone owns malformed-input handling (bad JSON,
 * non-numeric page, invalid order are ignored rather than thrown or trusted).
 *
 * Chelone's controller state carries a multi-sort `SortPayload[]`; the URL is
 * single-sort (`field` + `order`), faithful to react-admin.
 * {@link serializeListState} and {@link listPatchFromSearch} map between the
 * two (primary key) for the adapters' location sync.
 */

import type {
  DisplayedFilters,
  FilterPayload,
  SortPayload,
} from "../data/types";
import { isRecord } from "../guards";
import type { LooseRecord } from "../resource/record";
import type { ListParamsPatch } from "./list-controller";

type SortOrder = "ASC" | "DESC";

/**
 * The URL-shaped list params. A flat mirror of the query string: `sort` is the
 * field name and `order` its direction (not a `SortPayload`), so this maps 1:1
 * onto the wire format. Every field is optional — absent means "not in the URL".
 * `TRecord` keys `filter` and `displayedFilters`: a parse hands back what the
 * URL names, and a list hands it to its own controller.
 */
export interface ListParamsQuery<TRecord = LooseRecord> {
  filter?: FilterPayload<TRecord>;
  displayedFilters?: DisplayedFilters<TRecord>;
  sort?: string;
  order?: SortOrder;
  page?: number;
  perPage?: number;
}

function isSortOrder(value: string): value is SortOrder {
  return value === "ASC" || value === "DESC";
}

/**
 * Serialize URL-shaped list params into a query string (with a leading `?`,
 * or `''` when no field is set). Only defined fields are emitted; `filter` and
 * `displayedFilters` are JSON-encoded (an empty object serializes as `{}`).
 */
export function serializeListParams<TRecord = LooseRecord>(
  params: ListParamsQuery<TRecord>,
): string {
  const search = new URLSearchParams();
  if (params.filter !== undefined) {
    search.set("filter", JSON.stringify(params.filter));
  }
  if (params.displayedFilters !== undefined) {
    search.set("displayedFilters", JSON.stringify(params.displayedFilters));
  }
  if (params.sort !== undefined) {
    search.set("sort", params.sort);
  }
  if (params.order !== undefined) {
    search.set("order", params.order);
  }
  if (params.page !== undefined) {
    search.set("page", String(params.page));
  }
  if (params.perPage !== undefined) {
    search.set("perPage", String(params.perPage));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

/**
 * Parse a JSON-encoded object param; returns `undefined` on absence, bad JSON,
 * or JSON that is not a plain object (`null`, an array, a primitive).
 */
function parseJsonObjectParam<T>(raw: string | null): T | undefined {
  if (raw === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return undefined;
    return parsed as T;
  } catch {
    return undefined;
  }
}

/** Parse a positive integer param; returns `undefined` on absence, non-numeric input, or a value below 1. */
function parsePositiveIntParam(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return parsed >= 1 ? parsed : undefined;
}

/**
 * Parse a query string (with or without a leading `?`) into URL-shaped list
 * params. Malformed values are ignored, never trusted or thrown: bad JSON, or
 * JSON that is not an object, on `filter`/`displayedFilters`; a non-numeric
 * `page`/`perPage`, or one below 1; and an `order` outside `ASC`/`DESC` are
 * simply omitted. `order` is upper-cased first.
 */
export function parseListParams<TRecord = LooseRecord>(
  search: string,
): ListParamsQuery<TRecord> {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const result: ListParamsQuery<TRecord> = {};

  const filter = parseJsonObjectParam<FilterPayload<TRecord>>(
    params.get("filter"),
  );
  if (filter !== undefined) result.filter = filter;

  const displayedFilters = parseJsonObjectParam<DisplayedFilters<TRecord>>(
    params.get("displayedFilters"),
  );
  if (displayedFilters !== undefined)
    result.displayedFilters = displayedFilters;

  const sort = params.get("sort");
  if (sort !== null) result.sort = sort;

  const rawOrder = params.get("order");
  if (rawOrder !== null) {
    const order = rawOrder.toUpperCase();
    if (isSortOrder(order)) result.order = order;
  }

  const page = parsePositiveIntParam(params.get("page"));
  if (page !== undefined) result.page = page;

  const perPage = parsePositiveIntParam(params.get("perPage"));
  if (perPage !== undefined) result.perPage = perPage;

  return result;
}

/**
 * Whether the user has set any non-default list param — a filter with keys, an
 * explicit sort/order, a page other than 1, or a perPage. Used by adapters to
 * decide whether to seed the URL/store from these params or fall back to option
 * defaults. Mirrors react-admin's `hasCustomParams` semantics (an empty filter
 * and `page === 1` are not "custom"), without its filter-must-be-present guard.
 */
export function hasCustomParams<TRecord = LooseRecord>(
  params: ListParamsQuery<TRecord>,
): boolean {
  return (
    (params.filter !== undefined && Object.keys(params.filter).length > 0) ||
    params.sort !== undefined ||
    params.order !== undefined ||
    (params.page !== undefined && params.page !== 1) ||
    params.perPage !== undefined
  );
}

/** The list-controller state a URL carries. */
export interface ListUrlState<TRecord = LooseRecord> {
  page: number;
  perPage: number;
  sort: SortPayload<TRecord>[];
  filter: FilterPayload<TRecord>;
  displayedFilters: DisplayedFilters<TRecord>;
}

/** The query string for a list's state; the primary sort becomes `sort`/`order`. */
export function serializeListState<TRecord = LooseRecord>(
  state: ListUrlState<TRecord>,
): string {
  const primary = state.sort[0];
  return serializeListParams({
    filter: state.filter,
    displayedFilters: state.displayedFilters,
    sort: primary?.field,
    order: primary?.order,
    page: state.page,
    perPage: state.perPage,
  });
}

/**
 * The params a URL query string sets, as one `setParams` patch, or `null` when
 * it sets none of {@link hasCustomParams}, so a clean URL keeps the option and
 * store defaults. Shown filter inputs without a filter clear the filter.
 */
export function listPatchFromSearch<TRecord = LooseRecord>(
  search: string,
): ListParamsPatch<TRecord> | null {
  const query = parseListParams<TRecord>(search);
  if (!hasCustomParams(query)) return null;
  const patch: ListParamsPatch<TRecord> = {};
  if (query.filter !== undefined || query.displayedFilters !== undefined) {
    patch.filter = query.filter ?? {};
    patch.displayedFilters = query.displayedFilters;
  }
  if (query.sort !== undefined) {
    patch.sort = {
      // type-escape: a URL names no record, so its sort field is the wire name a provider resolves, exactly as a parsed `filter` key is (see `parseJsonObjectParam`). `serializeListState` writes this value from a controller's own sort.
      field: query.sort as SortPayload<TRecord>["field"],
      order: query.order ?? "ASC",
    };
  }
  if (query.perPage !== undefined) patch.perPage = query.perPage;
  if (query.page !== undefined) patch.page = query.page;
  return patch;
}
