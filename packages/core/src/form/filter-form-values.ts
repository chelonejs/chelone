import { isFilterBranch } from "../data/filter-branch";
import type { FilterPayload, LooseFilterPayload } from "../data/types";
import { isRecord } from "../guards";
import type { LooseRecord } from "../resource/record";

/**
 * Pure helpers a live filter form uses to keep its values and the list filter
 * in sync. Shared by the React and Vue adapters so the merge and reflect rules
 * live once.
 */

// type-escape: filter-value: a resolved filter value is whatever the form or filter held
const resolveFilterValue = (
  formValues: LooseFilterPayload,
  key: string,
  filter: LooseFilterPayload,
): unknown => {
  const formValue = formValues[key];
  // Nullish, arrays and Dates: take the filter value (fallback '') as-is; do
  // NOT recurse into them (a Date/array is a leaf for filter purposes).
  if (
    formValue === undefined ||
    formValue === null ||
    Array.isArray(formValue) ||
    formValue instanceof Date
  ) {
    return key in filter ? filter[key] : "";
  }
  // Nested object: rebuild every inner key too, defaulting each to ''.
  if (isRecord(formValue)) {
    const heldFilter = filter[key];
    const nestedFilter = isRecord(heldFilter) ? heldFilter : {};
    // type-escape: filter-value: the inner keys of a nested filter value are open
    const rebuilt: Record<string, unknown> = {};
    for (const innerKey of Object.keys(formValue)) {
      rebuilt[innerKey] = resolveFilterValue(formValue, innerKey, nestedFilter);
    }
    if (Object.keys(rebuilt).length === 0) return "";
    return rebuilt;
  }
  return key in filter ? filter[key] : "";
};

/**
 * Rebuild form values from the incoming filter so EVERY current form key is
 * present with a defined value (an empty string when the filter lacks it).
 *
 * form-core (like RHF) re-applies a field's CURRENT value when `reset(values)`
 * omits that key — which would silently ignore an external filter clear. So a
 * reset must carry a value for every mounted input. This never produces
 * `undefined`/`null` for a present form key.
 */
export function getFilterFormValues<TRecord = LooseRecord>(
  formValues: FilterPayload<TRecord>,
  filter: FilterPayload<TRecord>,
): FilterPayload<TRecord> {
  const result: FilterPayload<TRecord> = {};
  // Key-wise reads and writes use the open shape of these same filter maps.
  const incoming: LooseFilterPayload = formValues;
  const incomingFilter: LooseFilterPayload = filter;
  const target: LooseFilterPayload = result;
  for (const key of Object.keys(incoming)) {
    target[key] = resolveFilterValue(incoming, key, incomingFilter);
  }
  return result;
}

/**
 * The form shape the external-reflect must cover: every key that is either a
 * current form value, a REGISTERED field (form-core tracks these in `fieldMeta`
 * even when unset), or present on the incoming filter. Existing values are
 * carried through; registered-but-unset / filter-only keys seed to `undefined`
 * so {@link getFilterFormValues} resolves them from the filter (fallback `''`).
 */
export function filterFormReflectShape<TRecord = LooseRecord>(
  values: FilterPayload<TRecord>,
  // type-escape: form-core: only the keys of form-core's `fieldMeta` are read
  fieldMeta: Record<string, unknown>,
  filter: FilterPayload<TRecord>,
): FilterPayload<TRecord> {
  const result: FilterPayload<TRecord> = { ...values };
  // Key-wise reads and writes use the open shape of these same filter maps.
  const shape: LooseFilterPayload = result;
  for (const key of Object.keys(fieldMeta)) {
    // fieldMeta keys are full field paths (e.g. `a.b`); only the TOP-LEVEL
    // segment is a form-values key. Nested paths are covered by their parent.
    const top = key.split(/[.[]/, 1)[0];
    if (top && !(top in shape)) shape[top] = undefined;
  }
  for (const key of Object.keys(filter)) {
    if (!(key in shape)) shape[key] = undefined;
  }
  return result;
}

/**
 * Merge form values OVER the existing filter, one level deep, with arrays
 * REPLACED (never element-merged) — matching ra's mergeObjNotArray. The result
 * is a fresh object (no mutation of the inputs).
 */
export function mergeFilterValues<TRecord = LooseRecord>(
  filter: FilterPayload<TRecord>,
  values: FilterPayload<TRecord>,
): FilterPayload<TRecord> {
  const merged: FilterPayload<TRecord> = { ...filter };
  // Key-wise reads and writes use the open shape of these same filter maps.
  const incoming: LooseFilterPayload = values;
  const target: LooseFilterPayload = merged;
  for (const key of Object.keys(incoming)) {
    const next = incoming[key];
    const prev = target[key];
    if (isFilterBranch(next) && isFilterBranch(prev)) {
      target[key] = { ...prev, ...next };
    } else {
      target[key] = next;
    }
  }
  return merged;
}
