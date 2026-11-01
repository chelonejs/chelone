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
export function getDirtyFormValues(
  values: Record<string, unknown>,
  fieldMeta: Record<string, { isDirty: boolean } | undefined>,
): Record<string, unknown> {
  const dirty: Record<string, unknown> = {};
  for (const [path, meta] of Object.entries(fieldMeta)) {
    if (!meta?.isDirty) continue;
    const name = topLevelName(path);
    dirty[name] = values[name];
  }
  return dirty;
}
