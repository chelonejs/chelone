/**
 * The select and toggle rules behind a one-click list filter (ra-core's
 * `FilterListItem` and `ToggleFilterButton`), pure so both adapters share them.
 *
 * Chelone divergence: arrays compare for deep equality, not lodash's
 * contains-all rule.
 */

import type { FilterPayload, LooseFilterPayload } from "../data/types";
import { isPlainObject } from "../guards";
import type { LooseRecord } from "../resource/record";
import { deepEqual } from "./deep-equal";

// Nested plain objects match partially: `{ range: { gte: 1 } }` is held by
// `{ range: { gte: 1, lte: 9 } }`.
function matches(expected: unknown, actual: unknown): boolean {
  if (isPlainObject(expected)) {
    return (
      isPlainObject(actual) &&
      Object.keys(expected).every(
        (key) =>
          expected[key] === undefined || matches(expected[key], actual[key]),
      )
    );
  }
  return deepEqual(expected, actual);
}

/** True when every defined key of `value` is held by `filters`. */
export function isFilterSelected<TRecord = LooseRecord>(
  value: FilterPayload<TRecord>,
  filters: FilterPayload<TRecord>,
): boolean {
  return matches(value, filters);
}

// Drops only the leaves `value` holds, so a nested value leaves the sibling
// sub-keys another control set; a parent left empty goes with its last leaf.
function omitValue(
  filters: LooseFilterPayload,
  value: LooseFilterPayload,
): LooseFilterPayload {
  const next = { ...filters };
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) continue;
    const held = next[key];
    if (isPlainObject(value[key]) && isPlainObject(held)) {
      const rest = omitValue(held, value[key]);
      if (Object.keys(rest).length > 0) next[key] = rest;
      else delete next[key];
    } else {
      delete next[key];
    }
  }
  return next;
}

/**
 * Selecting a value merges it into the filters; toggling a selected one drops
 * the keys it holds, down to nested sub-keys, and keeps the rest. Neither
 * argument is mutated.
 */
export function toggleFilterValue(
  value: LooseFilterPayload,
  filters: LooseFilterPayload,
): LooseFilterPayload {
  if (!isFilterSelected(value, filters)) return { ...filters, ...value };
  return omitValue(filters, value);
}
