/**
 * Compares two record ids for equality, coercing to strings so numeric ids
 * sourced from a data provider match URL-string ids in form state. Ported
 * verbatim from shadmin's `lib/are-ids-equal` (the autocomplete inputs' default
 * option-vs-value equality check).
 */
export const areIdsEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
};
