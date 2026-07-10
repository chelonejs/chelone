/**
 * Read a value at a dot path off `record`. Clean-room stand-in for
 * `lodash/get(record, path)` (chelone stays zero-lodash) — shared by the
 * per-item title/src lookups in `<FileField>` / `<ImageField>`'s array branch.
 * Mirrors the identical helper in the React twins.
 */
export function getPath(record: unknown, path: string): unknown {
  if (record != null && typeof record === "object" && path in record) {
    return (record as Record<string, unknown>)[path];
  }
  let current: unknown = record;
  for (const key of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
