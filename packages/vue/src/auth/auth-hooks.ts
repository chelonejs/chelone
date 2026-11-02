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
  type UserIdentity,
} from "@chelone/core";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { type ComputedRef, computed } from "vue";
import { useCheloneAuthProvider, useCheloneContext } from "../context";

/** Read the authenticated user's identity (`getIdentity`) as a vue-query query. */
export function useGetIdentity() {
  return useQuery(identityQueryOptions(useCheloneAuthProvider()));
}

export interface UseOptionalIdentityResult {
  /** The signed-in identity (`undefined` until resolved, or when unavailable). */
  identity: ComputedRef<UserIdentity | undefined>;
  /** Whether the identity query is in flight (false when unavailable). */
  isPending: ComputedRef<boolean>;
}

/**
 * Read the signed-in identity without requiring an `authProvider` — the Vue twin
 * of the React `useOptionalIdentity`. Unlike {@link useGetIdentity}, which
 * THROWS without a provider, this yields `identity: undefined` and
 * `isPending: false` when there is no provider or it has no `getIdentity`, and
 * when `getIdentity` rejects. It shares `useGetIdentity`'s query key, so both
 * read one cached call.
 */
export function useOptionalIdentity(): UseOptionalIdentityResult {
  const { authProvider } = useCheloneContext();
  const hasGetIdentity = authProvider?.getIdentity != null;
  const query = useQuery({
    // A stub provider satisfies the option factory's type when none is
    // configured; the query is disabled in that case so it never runs.
    ...identityQueryOptions(
      authProvider ?? ({} as NonNullable<typeof authProvider>),
    ),
    enabled: hasGetIdentity,
  });

  return {
    // A disabled query reports `isPending: true`; a rejected one has no data.
    identity: computed(() =>
      !hasGetIdentity || query.isError.value ? undefined : query.data.value,
    ),
    isPending: computed(() =>
      !hasGetIdentity || query.isError.value ? false : query.isPending.value,
    ),
  };
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
