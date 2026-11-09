/**
 * A zod schema for the list params in a URL query, shaped for a router's
 * `validateSearch`.
 *
 * A router hands `validateSearch` what its own search parser produced, so a key
 * arrives as the wire string (`page=2`, a JSON `filter`) or already parsed
 * (`2`, an object). Every key takes both. A malformed key becomes absent and
 * nothing throws, as in {@link parseListParams}: bad JSON, JSON that is not an
 * object, a `page` or `perPage` below 1, an `order` outside `ASC` and `DESC`.
 * A key the list does not have is dropped, which is zod's default for an
 * object. The output is mutually assignable with {@link ListParamsQuery}.
 *
 * `filter` keys stay an open map, the way {@link parseListParams} returns them:
 * the schema is for a loose record, and a schema typed per resource waits for a
 * request. An app adds its own keys with `.extend`, which keeps these.
 *
 * Only the zod calls both 3.25 and 4 have appear here, since the peer range
 * allows either.
 */

import { z } from "zod";
import type { DisplayedFilters, FilterPayload } from "../data/types";
import {
  parseJsonObjectParam,
  parsePositiveIntParam,
  parseSortOrderParam,
} from "./list-params";

/** A key that takes the wire string or the object a router already parsed. */
function objectKey<TValue>() {
  return z
    .unknown()
    .transform((value) =>
      typeof value === "string" || typeof value === "object"
        ? parseJsonObjectParam<TValue>(value)
        : undefined,
    )
    .optional();
}

/** A key that takes the wire string or the number a router already parsed. */
function intKey() {
  return z
    .unknown()
    .transform((value) =>
      typeof value === "string" || typeof value === "number"
        ? parsePositiveIntParam(value)
        : undefined,
    )
    .optional();
}

/** A key that takes a string and nothing else. */
function stringKey() {
  return z
    .unknown()
    .transform((value) => (typeof value === "string" ? value : undefined))
    .optional();
}

/** `order`, upper-cased first, then only `ASC` or `DESC`. */
function orderKey() {
  return z
    .unknown()
    .transform((value) =>
      typeof value === "string" ? parseSortOrderParam(value) : undefined,
    )
    .optional();
}

/**
 * The list keys a route validates: `filter`, `displayedFilters`, `sort`,
 * `order`, `page` and `perPage`, each optional. Pass it to `validateSearch`
 * as-is, or `listSearchSchema.extend({ ... })` with the app's own keys.
 */
export const listSearchSchema = z.object({
  filter: objectKey<FilterPayload>(),
  displayedFilters: objectKey<DisplayedFilters>(),
  sort: stringKey(),
  order: orderKey(),
  page: intKey(),
  perPage: intKey(),
});
