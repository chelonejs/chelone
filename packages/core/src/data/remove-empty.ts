import type { FilterPayload } from "./types";

/** Strips `''`, `null` and `undefined` values. Always returns a FRESH object. */
export function removeEmpty(filter: FilterPayload): FilterPayload {
  const result: FilterPayload = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value === "" || value === null || value === undefined) continue;
    result[key] = value;
  }
  return result;
}
