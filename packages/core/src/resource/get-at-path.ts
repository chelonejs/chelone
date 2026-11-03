/**
 * The one path grammar chelone reads a record with. Dot members (`a.b`),
 * bracket indices (`a[0].b`) and numeric-dot indices (`a.0.b`) all resolve to
 * the same value, matching `lodash/get`'s relevant semantics.
 *
 * The core tree, calendar and client-list readers read through this, and so do
 * both adapters' `useFieldValue` and `useGetRecordRepresentation`: a `source`
 * written one way reads the same record everywhere, and one walker is left.
 */

/** Matches a `[index]` bracket group or a run of non-`.` / non-`[` characters. */
const PATH_SEGMENT = /\[([^\]]*)\]|[^.[\]]+/g;

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
  // `a.b[0].c` walks ["a", "b", "0", "c"]: group 1 is a bracket's inner key,
  // so a bracket index and a dot index (`a.0.c`) traverse identically.
  for (const match of source.matchAll(PATH_SEGMENT)) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[
      match[1] !== undefined ? match[1] : match[0]
    ];
  }
  return current;
}
