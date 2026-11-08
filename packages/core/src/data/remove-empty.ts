import type { LooseRecord } from "../resource/record";
import type { FilterPayload } from "./types";

/** Strips `''`, `null` and `undefined` values. Always returns a FRESH object. */
export function removeEmpty<TRecord = LooseRecord>(
  filter: FilterPayload<TRecord>,
): FilterPayload<TRecord> {
  const result: FilterPayload<TRecord> = { ...filter };
  // Key-wise writes need an index signature, which a typed filter has none of:
  // `pruned` is the fresh copy seen through its loose shape, so deleting a key
  // here deletes it from `result`.
  const pruned: FilterPayload = result;
  for (const [key, value] of Object.entries(pruned)) {
    if (value === "" || value === null || value === undefined) {
      delete pruned[key];
    }
  }
  return result;
}
