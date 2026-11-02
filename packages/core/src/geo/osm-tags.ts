/** `key=value`, or `key=*` for any value. Catches a missing `=` in the editor. */
export type OsmTagInput = `${string}=${string}`;

export type OsmTagFilter =
  | { key: string; value: string }
  | { key: string; values: string[] }
  | { key: string; any: true };

/** `natural=water` is `{ key, value }`; `building=*` matches any value. */
export function tagToFilter(tag: OsmTagInput): OsmTagFilter {
  const separator = tag.indexOf("=");
  const key = separator < 0 ? "" : tag.slice(0, separator).trim();
  const value = separator < 0 ? "" : tag.slice(separator + 1).trim();
  if (!key || !value) {
    throw new TypeError(
      `Invalid OSM tag "${tag}": expected "key=value" or "key=*"`,
    );
  }
  return value === "*" ? { key, any: true } : { key, value };
}
