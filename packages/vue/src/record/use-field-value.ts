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

import {
  getAtPath,
  type LooseRecord,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import { type ComputedRef, computed, inject } from "vue";
import { RecordContextKey, type RecordValue } from "./record-context";

export interface UseFieldValueOptions<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> {
  /** The field path — dot members and/or bracket/numeric indices. */
  source: TPath;
  /** Override the ambient record (a static record wins over the context ref). */
  record?: RecordValue<RecordType>;
  /**
   * Returned only when the resolved value is `undefined`; it has the type of
   * the value at `source`.
   */
  defaultValue?: NoInfer<SourceValue<RecordType, TPath>>;
}

/**
 * The value at `source` off the ambient (or overridden) record, reactively. A
 * typed `record` and a literal `source` give the value's type;
 * `useFieldValue<Post>(...)` alone infers no path, so the value is the union of
 * Post's value types.
 *
 * The type does not include `undefined` for a record that has not loaded: before
 * the ambient record resolves, `.value` is `undefined`, so guard it in a view
 * that renders while loading.
 *
 * @example
 * const name = useFieldValue({ source: "author.name" });
 * // template: {{ name }}
 */
export function useFieldValue<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
>(
  options: UseFieldValueOptions<RecordType, TPath>,
): ComputedRef<SourceValue<RecordType, TPath>>;
// The implementation reads at `unknown`: `getAtPath` is untyped, and the
// overload above states the value's type.
export function useFieldValue(options: {
  source: string;
  // type-escape: context: the record-free implementation signature; the overload above states the type
  record?: unknown;
  // type-escape: context: the record-free implementation signature; the overload above states the type
  defaultValue?: unknown;
  // type-escape: context: as above
}): ComputedRef<unknown> {
  const { source, defaultValue } = options;
  const injected = inject(RecordContextKey, null);
  return computed(() => {
    const record =
      options.record !== undefined ? options.record : injected?.value;
    const value = getAtPath(record, source);
    return value === undefined ? defaultValue : value;
  });
}
