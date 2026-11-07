/**
 * `FieldProps` — the props every display field that reads one field off the
 * record carries: the `source` path, the record to read it from, the
 * `defaultValue` that stands in for a missing value, the `empty` fallback text
 * and a root `class`. The Vue twin of `@chelone/react`'s `FieldProps` in
 * `lib/field-types.ts`, narrowed to the keys the Vue fields actually carry
 * (no `resource`, no DataTable column keys, `class` where React has `className`).
 */

import type {
  LooseRecord,
  ResourceRecord,
  SourceProp,
  SourceValue,
} from "@chelone/core";

export interface FieldProps<RecordType extends ResourceRecord = LooseRecord> {
  /** Name of the property to display (dot/bracket path). */
  source: SourceProp<RecordType>;
  /** The record to render. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;
  /** Replaces ONLY a resolved `undefined`, never a present `null` / `0` / `""`. */
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /** Fallback text for a nullish value, translated through the catalog. */
  empty?: string;
  /** Class applied to the field's root element. */
  class?: string;
}
