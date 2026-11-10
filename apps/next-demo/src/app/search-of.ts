export type SearchParams = Record<string, string | string[] | undefined>;

/** The URL's query string, as the list controller reads it from the location. */
export function searchOf(params: SearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value ?? []].flat()) search.append(key, item);
  }
  return search.toString();
}
