/**
 * `useFieldValue({ source, record?, defaultValue? })` — read the value at a
 * (possibly deep) `source` path off the ambient record. The Vue twin of
 * `@chelone/react`'s `record/use-field-value.ts` (ra-core's `useFieldValue`,
 * clean-room, zero-lodash). Returns a `ComputedRef` so a field re-renders when
 * the ambient record resolves (React re-renders instead; Vue tracks the ref).
 *
 * Path semantics match `lodash/get`: dot members (`author.name`), bracket
 * indices (`tags[1].label`), and numeric-dot indices (`tags.0.label`) resolve;
 * `defaultValue` replaces ONLY a resolved `undefined`, never a present `null` /
 * `0` / `false` / `""`. Reads from the RecordContext (NOT a source scope) on
 * purpose — a field tracks the record, not the form's source prefix.
 */

import type { LooseRecord } from "@chelone/core";
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

/** Split a lodash-style path into segments: `a.b[0].c` → `["a","b","0","c"]`. */
function toPathSegments(source: string): string[] {
  if (source === "") return [];
  const segments: string[] = [];
  const pattern = /\[([^\]]*)\]|[^.[\]]+/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match !== null) {
    segments.push(match[1] !== undefined ? match[1] : match[0]);
    match = pattern.exec(source);
  }
  return segments;
}

/** Read the value at `source` off `record`, defaulting only a resolved `undefined`. */
function getAtPath(
  record: unknown,
  source: string,
  defaultValue?: unknown,
): unknown {
  let current: unknown = record;
  for (const key of toPathSegments(source)) {
    if (current == null || typeof current !== "object") return defaultValue;
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined ? defaultValue : current;
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
    return getAtPath(record, source, defaultValue);
  });
}
