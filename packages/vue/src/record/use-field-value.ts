/**
 * `useFieldValue({ source, record?, defaultValue? })` — read the value at a
 * (possibly deep) `source` path off the ambient record. The Vue twin of
 * `@chelone/react`'s `record/use-field-value.ts` (ra-core's `useFieldValue`,
 * clean-room, zero-lodash). Returns a `ComputedRef` so a field re-renders when
 * the ambient record resolves (React re-renders instead; Vue tracks the ref).
 *
 * Path semantics match `lodash/get` through core's `getAtPath`: dot members
 * (`author.name`), bracket indices (`tags[1].label`), numeric-dot indices
 * (`tags.0.label`) and a literal `"a.b"` key all resolve; `defaultValue`
 * replaces ONLY a resolved `undefined`, never a present `null` / `0` / `false`
 * / `""`. Reads from the RecordContext (NOT a source scope) on purpose — a
 * field tracks the record, not the form's source prefix.
 */

import { getAtPath, type LooseRecord } from "@chelone/core";
import { type ComputedRef, computed, inject } from "vue";
import { RecordContextKey, type RecordValue } from "./record-context";

export interface UseFieldValueOptions<RecordType = LooseRecord> {
  /** The field path — dot members and/or bracket/numeric indices. */
  source: string;
  /** Override the ambient record (a static record wins over the context ref). */
  record?: RecordValue<RecordType>;
  /** Returned only when the resolved value is `undefined`. */
  defaultValue?: unknown;
}

/**
 * The value at `source` off the ambient (or overridden) record, reactively.
 *
 * @example
 * const name = useFieldValue({ source: "author.name" });
 * // template: {{ name }}
 */
export function useFieldValue<RecordType = LooseRecord>(
  options: UseFieldValueOptions<RecordType>,
): ComputedRef<unknown> {
  const { source, defaultValue } = options;
  const injected = inject(RecordContextKey, null);
  return computed(() => {
    const record =
      options.record !== undefined ? options.record : injected?.value;
    const value = getAtPath(record, source);
    return value === undefined ? defaultValue : value;
  });
}
