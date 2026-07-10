/**
 * `areIdsEqual` — compares two record ids for equality, coercing to strings so a
 * numeric id sourced from a data provider matches a string id held in form
 * state. The Vue twin of `@chelone/react`'s `lib/are-ids-equal.ts` (the
 * autocomplete inputs' default option-vs-value equality check).
 */
export function areIdsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
