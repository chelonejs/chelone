import { isRecord } from "../guards";

/**
 * Does a filter value nest, so a walker descends into it? An object that is
 * not an array and not a Date. Not the prototype check: a class instance nests.
 */
export function isFilterBranch(
  value: unknown, // type-escape: a guard on `unknown` learns the keys and not the values
): value is Record<string, unknown> {
  return isRecord(value) && !(value instanceof Date);
}
