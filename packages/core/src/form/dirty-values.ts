/**
 * Reads the touched fields off a form-core form, so both adapters report the
 * same diff. form-core has no `dirtyFields` twin: its `fieldMeta` is keyed by
 * leaf path and each entry carries a sticky `isDirty`.
 */

/** `address.city` and `tags[0]` both belong to the top-level field. */
const topLevelName = (path: string): string => path.split(/[.[]/, 1)[0] ?? path;

/**
 * Returns `{ [topLevelName]: values[topLevelName] }` for every field path whose
 * meta is dirty. A dirty nested path yields the whole top-level value, so
 * `address.city` yields `address`. A field never touched, or only registered,
 * is left out.
 */
export function getDirtyFormValues<TValues extends object>(
  values: TValues,
  fieldMeta: Record<string, { isDirty: boolean } | undefined>,
): Partial<TValues> {
  const dirty: Partial<TValues> = {};
  for (const [path, meta] of Object.entries(fieldMeta)) {
    if (!meta?.isDirty) continue;
    // type-escape: form-core: the name comes from a runtime path, which the compiler cannot tie to a key of TValues
    const name = topLevelName(path) as keyof TValues;
    dirty[name] = values[name];
  }
  return dirty;
}
