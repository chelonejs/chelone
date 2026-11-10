/**
 * The value read and the empty text a server field prints, with no context: a
 * React Server Component may call no hook, so the record and the i18n arrive
 * as arguments.
 */

import {
  type AnyCheloneI18n,
  type ChoiceRecord,
  type FormValue,
  getAtPath,
  type LooseRecord,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";

/** What a server field needs from an i18n provider. */
export type ServerI18n = Pick<AnyCheloneI18n, "translate" | "getLocale">;

/**
 * Read the value at a (possibly deep) `source` path off `record`, as
 * `useFieldValue` does off the ambient one. `defaultValue` replaces only an
 * `undefined` value, never a present `null`, `0`, `false` or `""`.
 *
 * @example
 * const name = readFieldValue(post, "author.name");
 */
export function readFieldValue<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
>(
  record: RecordType,
  source: TPath,
  defaultValue?: NoInfer<SourceValue<RecordType, TPath>>,
): SourceValue<RecordType, TPath>;
// The implementation reads at `unknown`: `getAtPath` is untyped, and the
// overload above states the value's type.
export function readFieldValue(
  record: object,
  source: string,
  // type-escape: overload: implementation signature; the overload above states the type
  defaultValue?: unknown,
  // type-escape: overload: as above
): unknown {
  const value = getAtPath(record, source);
  return value === undefined ? defaultValue : value;
}

/**
 * The text a server field prints for an empty value: `empty` translated, with
 * itself as the fallback, when `i18n` is given, and `empty` as is otherwise.
 */
export function serverEmptyText(empty: string, i18n?: ServerI18n): string {
  return i18n ? i18n.translate(empty, { _: empty }) : empty;
}

/**
 * Read a choice option path, as `useChoices` does. An empty path reads
 * nothing: `getAtPath` returns the record itself for `""`, which would print
 * `[object Object]` as the label.
 */
export const readChoicePath = (
  choice: ChoiceRecord,
  path: string,
): FormValue => (path === "" ? undefined : getAtPath(choice, path));
