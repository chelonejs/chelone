/**
 * `useFieldValue({ source, record?, defaultValue? })` — read the value at a
 * (possibly deep) `source` path off the ambient record (parity: ra-core's
 * `useFieldValue`, which wraps `lodash/get(record, source, defaultValue)`).
 *
 * Reimplemented clean-room so chelone keeps its zero-lodash footprint. The path
 * read is core's `getAtPath`, which matches `lodash/get`'s relevant semantics:
 * dot members (`author.name`), bracket indices (`tags[1].label`), numeric-dot
 * indices (`tags.0.label`) and a literal `"a.b"` key all resolve; `defaultValue`
 * replaces ONLY a resolved `undefined`, never a present `null` / `0` / `false`
 * / `""`.
 *
 * Reads from the RecordContext (via `useRecordContext`), NOT a SourceContext,
 * on purpose (ra-core note): a component may nest a sub RecordContext
 * (iterator rows, translatable inputs); fields must track the record, not the
 * form's source scope.
 */

import { getAtPath, type LooseRecord } from "@chelone/core";
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
  const value = getAtPath(record, source);
  return value === undefined ? defaultValue : value;
}
