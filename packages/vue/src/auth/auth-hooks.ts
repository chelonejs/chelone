/**
 * Auth composables over `@tanstack/vue-query` — the Vue twin of
 * `@chelone/react`'s `auth-hooks.ts` (`useGetIdentity` / `useAuthState` /
 * `useLogout`). Each wraps core's framework-agnostic query/mutation options
 * (`identityQueryOptions` / `authStateQueryOptions`) around the ambient
 * `authProvider`, reusing the SAME vue-query client `<Admin>` installs under
 * `VUE_QUERY_CLIENT`.
 *
 * The V3-a app shell ported the three the shell needs (`useGetIdentity` /
 * `useAuthState` / `useLogout`); the V3-c auth wave adds the login mutation
 * (`useLogin`) and the access check (`useCanAccess`) the login page + gate
 * consume. `useCheloneAuthProvider` throws when no provider is configured (parity
 * with the React twin), so every one of these must run past an authProvider
 * guard — `<UserMenu>` mounts its identity-reading body only when a provider is
 * present, exactly as the React twin isolates the read.
 */

import {
  authStateQueryOptions,
  type CanAccessParams,
  canAccessQueryOptions,
  identityQueryOptions,
} from "@chelone/core";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { useCheloneAuthProvider } from "../context";

/** Read the authenticated user's identity (`getIdentity`) as a vue-query query. */
export function useGetIdentity() {
  return useQuery(identityQueryOptions(useCheloneAuthProvider()));
}

/**
 * Read the current auth state (`checkAuth` → `{ authenticated }`) as a vue-query
 * query. Never rejects — a `checkAuth` rejection maps to `authenticated: false`.
 */
export function useAuthState() {
  return useQuery(authStateQueryOptions(useCheloneAuthProvider()));
}

/**
 * A login mutation — calls the provider's `login(params)` on `mutate(...)` /
 * `mutateAsync(...)`. The Vue twin of the React `useLogin`; `<LoginForm>` calls
 * `mutateAsync(credentials)` and catches a rejection to surface an auth-error
 * notification (the form `save` contract must resolve, never reject).
 */
export function useLogin() {
  const authProvider = useCheloneAuthProvider();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => authProvider.login(params),
  });
}

/** A logout mutation — calls the provider's `logout(params)` on `mutate(...)`. */
export function useLogout() {
  const authProvider = useCheloneAuthProvider();
  return useMutation({
    mutationFn: (params?: unknown) => authProvider.logout(params),
  });
}

/**
 * Read whether the current user may perform `action` on `resource` (+ optional
 * `record`) as a vue-query query — the Vue twin of the React `useCanAccess`.
 * Defaults to granted when the provider omits `canAccess` (via
 * `canAccessQueryOptions`).
 */
export function useCanAccess(params: CanAccessParams) {
  return useQuery(canAccessQueryOptions(useCheloneAuthProvider(), params));
}
