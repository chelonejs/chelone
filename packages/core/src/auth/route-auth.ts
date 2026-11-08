import type { QueryClient } from "@tanstack/query-core";
import { authStateQueryOptions, DEFAULT_LOGIN_PATH } from "./auth-options";
import type { AuthProvider } from "./types";

/** Query keys a sign-in flow leaves in the URL; never copied into a redirect. */
const CREDENTIAL_KEYS = [
  "access_token",
  "id_token",
  "refresh_token",
  "token",
  "code",
  "state",
] as const;

export interface RouteAuthOptions {
  /** The path and query being entered, e.g. `/admin/posts?page=2`. */
  location: string;
  /** Where a logged-out visit goes. Defaults to {@link DEFAULT_LOGIN_PATH}. */
  loginPath?: string;
  /** The login URL's query key for the entered location. Defaults to `"redirect"`. */
  redirectParam?: string;
}

export type RouteAuthResult =
  | { authenticated: true }
  | { authenticated: false; redirectTo: string };

/** `location` without its hash and credential keys. */
function withoutCredentials(location: string): {
  pathname: string;
  search: string;
} {
  const [beforeHash = ""] = location.split("#", 1);
  const queryStart = beforeHash.indexOf("?");
  if (queryStart === -1) {
    return { pathname: beforeHash, search: "" };
  }
  const params = new URLSearchParams(beforeHash.slice(queryStart + 1));
  for (const key of CREDENTIAL_KEYS) {
    params.delete(key);
  }
  const search = params.toString();
  return {
    pathname: beforeHash.slice(0, queryStart),
    search: search === "" ? "" : `?${search}`,
  };
}

/**
 * The route-level auth check, run before a route renders. It fetches the same
 * query the shell's `useAuthGate` reads, so the gate finds the answer cached
 * and shows no loading state. No `authProvider` counts as authenticated.
 */
export async function checkRouteAuth(
  queryClient: QueryClient,
  authProvider: AuthProvider | undefined,
  options: RouteAuthOptions,
): Promise<RouteAuthResult> {
  if (!authProvider) {
    return { authenticated: true };
  }
  const { authenticated } = await queryClient.fetchQuery(
    authStateQueryOptions(authProvider),
  );
  if (authenticated) {
    return { authenticated: true };
  }
  const { loginPath = DEFAULT_LOGIN_PATH, redirectParam = "redirect" } =
    options;
  const { pathname, search } = withoutCredentials(options.location);
  if (pathname === loginPath) {
    return { authenticated: false, redirectTo: loginPath };
  }
  const params = new URLSearchParams({ [redirectParam]: pathname + search });
  return { authenticated: false, redirectTo: `${loginPath}?${params}` };
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

/**
 * `raw` when it is a same-origin path, else `fallback`. A redirect target read
 * from a URL is attacker-controlled, so only a path that starts with one `/`
 * and holds no control character gets through.
 */
export function safeRedirectTarget(raw: unknown, fallback = "/"): string {
  if (
    typeof raw === "string" &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/\\") &&
    !CONTROL_CHARACTER.test(raw)
  ) {
    return raw;
  }
  return fallback;
}
