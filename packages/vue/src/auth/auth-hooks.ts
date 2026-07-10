/**
 * Auth composables over `@tanstack/vue-query` — the Vue twin of
 * `@chelone/react`'s `auth-hooks.ts` (`useGetIdentity` / `useAuthState` /
 * `useLogout`). Each wraps core's framework-agnostic query/mutation options
 * (`identityQueryOptions` / `authStateQueryOptions`) around the ambient
 * `authProvider`, reusing the SAME vue-query client `<Admin>` installs under
 * `VUE_QUERY_CLIENT`.
 *
 * Only the three the V3-a app shell needs are ported here — the login page +
 * the auth gate (`useLogin` / `useCanAccess` / `useAuthState`-gated routing)
 * land in the V3-c auth wave. `useChelonAuthProvider` throws when no provider is
 * configured (parity with the React twin), so every one of these must run past
 * an authProvider guard — `<UserMenu>` mounts its identity-reading body only
 * when a provider is present, exactly as the React twin isolates the read.
 */

import { authStateQueryOptions, identityQueryOptions } from "@chelone/core";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { useChelonAuthProvider } from "../context";

/** Read the authenticated user's identity (`getIdentity`) as a vue-query query. */
export function useGetIdentity() {
  return useQuery(identityQueryOptions(useChelonAuthProvider()));
}

/**
 * Read the current auth state (`checkAuth` → `{ authenticated }`) as a vue-query
 * query. Never rejects — a `checkAuth` rejection maps to `authenticated: false`.
 */
export function useAuthState() {
  return useQuery(authStateQueryOptions(useChelonAuthProvider()));
}

/** A logout mutation — calls the provider's `logout(params)` on `mutate(...)`. */
export function useLogout() {
  const authProvider = useChelonAuthProvider();
  return useMutation({
    mutationFn: (params?: unknown) => authProvider.logout(params),
  });
}
