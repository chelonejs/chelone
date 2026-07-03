/**
 * `useFieldValue({ source, record?, defaultValue? })` — read the value at a
 * (possibly deep) `source` path off the ambient record (parity: ra-core's
 * `useFieldValue`, which wraps `lodash/get(record, source, defaultValue)`).
 *
 * Reimplemented clean-room so chelone keeps its zero-lodash footprint. The path
 * getter matches `lodash/get`'s relevant semantics: dot members (`author.name`),
 * bracket indices (`tags[1].label`), and numeric-dot indices (`tags.0.label`)
 * all resolve; `defaultValue` replaces ONLY a resolved `undefined`, never a
 * present `null` / `0` / `false` / `""`.
 *
 * Reads from the RecordContext (via `useRecordContext`), NOT a SourceContext,
 * on purpose (ra-core note): a component may nest a sub RecordContext
 * (iterator rows, translatable inputs); fields must track the record, not the
 * form's source scope.
 */

import type { LooseRecord } from "@chelone/core";
import {
  type UseRecordContextOptions,
  useRecordContext,
} from "./record-context";

export interface UseFieldValueOptions<RecordType = LooseRecord>
  extends UseRecordContextOptions<RecordType> {
  /** The field path — dot members and/or bracket/numeric indices. */
  source: string;
  /** Returned only when the resolved value is `undefined`. */
  defaultValue?: unknown;
}

/**
 * Split a lodash-style path into its segments: `a.b[0].c` → `["a","b","0","c"]`.
 * Bracket indices are normalized to their inner key so both `a[0]` and `a.0`
 * traverse identically.
 */
function toPathSegments(source: string): string[] {
  if (source === "") return [];
  const segments: string[] = [];
  // Match either a `[index]` bracket group or a run of non-`.`/non-`[` chars.
  const pattern = /\[([^\]]*)\]|[^.[\]]+/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match !== null) {
    // Group 1 is the bracket's inner content; otherwise the whole dot member.
    segments.push(match[1] !== undefined ? match[1] : match[0]);
    match = pattern.exec(source);
  }
  return segments;
}

/**
 * Read the value at `source` off `record`, returning `defaultValue` when the
 * resolved value is `undefined`. Clean-room parity with `lodash/get`.
 */
function getAtPath(
  record: unknown,
  source: string,
  defaultValue?: unknown,
): unknown {
  let current: unknown = record;
  for (const key of toPathSegments(source)) {
    if (current == null || typeof current !== "object") {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined ? defaultValue : current;
}

/**
 * Get the value of a field of the current record.
 *
 * @example
 * const value = useFieldValue({ source: "author.name" });
 */
export function useFieldValue<RecordType = LooseRecord>(
  params: UseFieldValueOptions<RecordType>,
): unknown {
  const { defaultValue, source } = params;
  const record = useRecordContext<RecordType>(params);
  return getAtPath(record, source, defaultValue);
}
