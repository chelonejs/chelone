import type { DeepKeys, DeepValue } from "@tanstack/form-core";

/**
 * The one place chelone speaks form-core's path types. `FieldApi` and `FormApi`
 * constrain their generics on `DeepKeys`/`DeepValue`, while chelone's own paths
 * are dot.paths' `SourcePath`/`SourceValue`. The two agree on a concrete record
 * (pinned in `field-name.test-d.ts`), but TS cannot relate them while the record
 * is a type parameter, so a path crosses over through {@link toFieldName}.
 *
 * These are renames, not aliases: a new alias of a conditional type is a
 * distinct type to TS, which form-core's own signatures then fail to match.
 */
export type { DeepKeys as FieldName, DeepValue as FieldValue };

/**
 * The widest value a runtime-composed path can address. An alias, so it is for
 * chelone's own signatures: spell `FieldValue<T, FieldName<T>>` to meet a
 * value form-core returned.
 */
export type FieldData<TRecord> = DeepValue<TRecord, DeepKeys<TRecord>>;

/** A runtime-composed path, as form-core's name for it. */
export function toFieldName<TRecord>(path: string): DeepKeys<TRecord> {
  // type-escape: form-core: a path of the record by construction, which TS cannot see.
  return path as DeepKeys<TRecord>;
}
