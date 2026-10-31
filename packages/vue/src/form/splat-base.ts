/** Decode a percent-encoded path, leaving it as is when it is malformed. */
export function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Where a route with a trailing catch-all ends, as the encoded pathname minus
 * the trailing segments of the splat, without a trailing slash. The pathname is
 * percent-encoded and the splat is decoded, so whole segments are dropped
 * rather than a textual suffix.
 */
export function splatBase(pathname: string, splat: string): string {
  if (splat === "") return pathname.replace(/\/+$/, "");
  const count = splat.split("/").length;
  const segments = pathname.split("/");
  const tail = segments.slice(-count).join("/");
  const own =
    segments.length > count && decodePath(tail) === splat
      ? segments.slice(0, -count).join("/")
      : pathname;
  return own.replace(/\/+$/, "");
}
