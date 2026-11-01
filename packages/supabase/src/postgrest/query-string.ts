/** Encodes pairs as `k=v&k=v`: repeated keys stay, and a space is `%20`, not `+`. */
export function toQueryString(
  pairs: ReadonlyArray<readonly [string, string]>,
): string {
  return pairs
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}
