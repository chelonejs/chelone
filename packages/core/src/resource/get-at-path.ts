/**
 * The one path grammar chelone reads a record with. Dot members (`a.b`),
 * bracket indices (`a[0].b`) and numeric-dot indices (`a.0.b`) all resolve to
 * the same value, matching `lodash/get`'s relevant semantics.
 *
 * The core tree, calendar and client-list readers read through this, so a
 * `source` written one way reads the same record everywhere. The adapters'
 * `useFieldValue` reads the same grammar and moves onto this helper next.
 */

/** Matches a `[index]` bracket group or a run of non-`.` / non-`[` characters. */
const PATH_SEGMENT = /\[([^\]]*)\]|[^.[\]]+/g;

/** `a.b[0].c` → `["a", "b", "0", "c"]`: a bracket index normalizes to its inner key. */
const toPathSegments = (source: string): string[] => {
  const segments: string[] = [];
  for (const match of source.matchAll(PATH_SEGMENT)) {
    // Group 1 is the bracket's inner content; otherwise the whole dot member.
    segments.push(match[1] !== undefined ? match[1] : match[0]);
  }
  return segments;
};

/**
 * Read the value at `source` off `record`. An empty `source` returns the record
 * itself; a step that is null, undefined or a primitive returns `undefined`.
 *
 * An own key equal to the whole `source` wins before any split, as in
 * `lodash/get`: a record that literally holds a `"nested.level"` key — a
 * flattened filter payload, for instance — still reads.
 */
export function getAtPath(record: unknown, source: string): unknown {
  if (source === "") return record;
  if (
    record !== null &&
    typeof record === "object" &&
    Object.hasOwn(record, source)
  ) {
    return (record as Record<string, unknown>)[source];
  }
  let current: unknown = record;
  for (const key of toPathSegments(source)) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
