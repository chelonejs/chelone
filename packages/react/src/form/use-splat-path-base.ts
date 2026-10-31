import { useLocation, useParams } from "../router/nav-hooks";

/**
 * The base pathname a URL-synced TabbedForm's tabs resolve against: the current
 * pathname MINUS the parent route's `*` remainder (ra's `useSplatPathBase`).
 * Mounted under `/posts/1/*` at `/posts/1/two`, the splat is `two` and the base
 * is `/posts/1`; at `/posts/1` the splat is `''` and the base is `/posts/1`.
 */
export function useSplatPathBase(): string {
  const location = useLocation();
  const params = useParams();
  const splat = params["*"] ?? "";
  if (splat === "") return location.pathname;
  // Strip a trailing `/<splat>` (guard the regex-significant chars in `splat`).
  const suffix = `/${splat}`;
  return location.pathname.endsWith(suffix)
    ? location.pathname.slice(0, location.pathname.length - suffix.length)
    : location.pathname;
}
