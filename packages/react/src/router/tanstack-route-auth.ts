import {
  type AuthProvider,
  checkRouteAuth,
  safeRedirectTarget,
} from "@chelone/core";
import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

/** The part of TanStack's `ParsedLocation` the guards read. */
interface BeforeLoadLocation {
  pathname: string;
  /** The raw query string, with its leading `?` or empty. */
  searchStr: string;
}

export interface RequireAuthBeforeLoadOptions {
  location: BeforeLoadLocation;
  authProvider: AuthProvider | undefined;
  queryClient: QueryClient;
  /** Where a logged-out visit goes. Defaults to core's `DEFAULT_LOGIN_PATH`. */
  loginPath?: string;
}

/**
 * A route's `beforeLoad` guard: a logged-out visit throws a redirect to the
 * login route before the route renders. The answer lands in the query cache,
 * so the shell's `useAuthGate` shows no loading state afterwards.
 */
export async function requireAuthBeforeLoad({
  location,
  authProvider,
  queryClient,
  loginPath,
}: RequireAuthBeforeLoadOptions): Promise<void> {
  const result = await checkRouteAuth(queryClient, authProvider, {
    location: location.pathname + location.searchStr,
    loginPath,
  });
  if (!result.authenticated) {
    throw redirect({ href: result.redirectTo });
  }
}

export interface RedirectAuthenticatedBeforeLoadOptions {
  location: BeforeLoadLocation;
  authProvider: AuthProvider | undefined;
  queryClient: QueryClient;
}

/**
 * The login route's `beforeLoad` guard: a logged-in visit throws a redirect to
 * the `redirect` search param when it is a same-origin path, else to `/`.
 */
export async function redirectAuthenticatedBeforeLoad({
  location,
  authProvider,
  queryClient,
}: RedirectAuthenticatedBeforeLoadOptions): Promise<void> {
  const result = await checkRouteAuth(queryClient, authProvider, {
    location: location.pathname,
  });
  if (result.authenticated) {
    const target = new URLSearchParams(location.searchStr).get("redirect");
    throw redirect({ href: safeRedirectTarget(target) });
  }
}
