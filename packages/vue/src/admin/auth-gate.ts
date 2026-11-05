/**
 * The headless auth pieces the routing engine gates on — the Vue twin of
 * `@chelone/react`'s `admin/auth-gate.tsx`:
 *
 * - `useAuthGate(requireAuth)` — the no-flash gate state. Reuses the P3 auth
 *   query (`authStateQueryOptions` via `useCheloneAuthProvider`) but adds the two
 *   shell-specific concerns the raw `useAuthState()` does not: the `enabled`
 *   gating (`requireAuth` — no query when the shell doesn't gate) and the
 *   NO-AUTHPROVIDER shortcut (`authProvider == null` → frozen authenticated, so
 *   appless demos never gate). `<Admin requireAuth>` renders the login page WHILE
 *   `isPending`, so protected content NEVER mounts during the pending-auth
 *   window — that is the no-flash guarantee (not render-then-hide).
 *
 * - `useAuthenticated` — a per-page gate. Fires the auth check for a subtree and,
 *   on failure, logs out (default) or renders nothing; `logoutOnFailure`
 *   defaults `true`.
 *
 * - `useHandleAuthCallback` — the OAuth redirect resolver: call the provider's
 *   `handleCallback`, then redirect to `data.redirectTo` ELSE the stored
 *   `nextPathname` ELSE `location.state.nextPathname` ELSE `'/'`.
 *
 * Idiom translation from the React twin: React re-derives the gate values each
 * render; Vue returns `ComputedRef`s off the vue-query result refs so the shell
 * template re-renders reactively as the auth check settles. The one-shot
 * side-effects (logout / callback redirect) run in `watch(..., { immediate })`
 * instead of `useEffect`.
 */

import { authStateQueryOptions } from "@chelone/core";
import { useQuery } from "@tanstack/vue-query";
import { type ComputedRef, computed, type Ref, watch } from "vue";
import { useCheloneContext } from "../context";
import { useLocation, useRedirect } from "../router";

/** The no-flash gate state the routing engine branches on (reactive). */
export interface AuthGateState {
  /** The auth check is in flight — render the loading page, NOT the layout. */
  isPending: ComputedRef<boolean>;
  /** Whether the user is authenticated (meaningful once `!isPending`). */
  authenticated: ComputedRef<boolean>;
}

/**
 * The no-flash gate state. Composition over the P3 auth query, adding the two
 * shell concerns:
 *
 * 1. `enabled: requireAuth` — when the shell does not gate (`requireAuth` false)
 *    the query never fires and the gate is instantly "authenticated, not
 *    pending" (an ungated shell shows its content immediately).
 * 2. the no-authProvider shortcut — with no `authProvider` the gate is frozen
 *    `{ isPending: false, authenticated: true }` (appless demos never gate),
 *    regardless of `requireAuth`.
 *
 * `requireAuth` is read once at setup (a mount-stable `<Admin>` prop), mirroring
 * how the React twin reads a stable prop per render.
 */
export function useAuthGate(requireAuth: boolean): AuthGateState {
  const { authProvider } = useCheloneContext();
  const hasProvider = authProvider != null;
  // Only fetch when the shell gates AND a provider exists. A stub provider
  // satisfies the option factory's type when none is configured; the query is
  // disabled in that case so it never runs.
  const enabled = requireAuth && hasProvider;
  const { data, isPending, fetchStatus } = useQuery({
    ...authStateQueryOptions(
      authProvider ?? ({} as NonNullable<typeof authProvider>),
    ),
    enabled,
  });

  return {
    // No provider, or the shell does not gate → always authenticated, never
    // pending (the no-authProvider / ungated shortcut). This must win over the
    // query's own `isPending` (vue-query reports `isPending: true` for a
    // disabled-and-never-fetched query — `fetchStatus === 'idle'`).
    isPending: computed(() =>
      enabled ? isPending.value && fetchStatus.value !== "idle" : false,
    ),
    authenticated: computed(() =>
      enabled ? data.value?.authenticated === true : true,
    ),
  };
}

export interface UseAuthenticatedOptions {
  /** Whether to enforce the check (default true). `false` → a no-op pass. */
  enabled?: boolean;
  /** On a failed check, log the user out (default true) vs. render nothing. */
  logoutOnFailure?: boolean;
}

/**
 * A per-page auth gate. Fires the auth check for the current subtree; on failure
 * it logs out (default `logoutOnFailure: true`) so the shell returns to the
 * login flow. Returns the same reactive `{ isPending, authenticated }` gate
 * state, so a caller can hold rendering until resolved.
 */
export function useAuthenticated(
  options: UseAuthenticatedOptions = {},
): AuthGateState {
  const { enabled = true, logoutOnFailure = true } = options;
  const gate = useAuthGate(enabled);
  const { authProvider } = useCheloneContext();

  // React to the RESOLVED gate state: on a settled-but-unauthenticated check,
  // log out (when `logoutOnFailure`). Fires once per gate transition.
  watch(
    [gate.isPending, gate.authenticated],
    ([pending, authenticated]) => {
      if (!enabled) return;
      if (pending) return;
      if (!authenticated && logoutOnFailure) {
        void authProvider?.logout(undefined);
      }
    },
    { immediate: true },
  );

  return gate;
}

/** The Store key the login flow stashes the post-login target under. */
const NEXT_PATHNAME_KEY = "nextPathname";

export interface HandleAuthCallbackResult {
  /** True once the callback has resolved and the redirect has been issued. */
  settled: Ref<boolean>;
  /** The error, if `handleCallback` rejected. */
  error: Ref<unknown>;
}

/**
 * Resolve an OAuth auth-callback redirect. On mount, call the provider's
 * `handleCallback`; on success, redirect to the FIRST available of:
 * `data.redirectTo` → the stored `nextPathname` (Store) → `location.state
 * .nextPathname` → `'/'`. Rejections surface via the returned `error`.
 *
 * The redirect fires once (a `watch` on the settled query, guarded by a latch),
 * so a re-render does not re-navigate. Uses `useRedirect` (absolute-http targets
 * are honored, so a provider may redirect off-site).
 */
export function useHandleAuthCallback(): HandleAuthCallbackResult {
  const { authProvider, store } = useCheloneContext();
  const redirect = useRedirect();
  const location = useLocation();

  const { data, isSuccess, error } = useQuery({
    queryKey: ["auth", "handleCallback"],
    queryFn: async (): Promise<{ redirectTo?: string } | undefined> => {
      if (!authProvider?.handleCallback) {
        throw new Error(
          "useHandleAuthCallback: the authProvider does not implement handleCallback.",
        );
      }
      // The provider may resolve `void` (no explicit redirect) — normalize to
      // `undefined` so the redirect resolution falls through to the next source.
      return (await authProvider.handleCallback()) ?? undefined;
    },
    // Auth callback is a one-shot side-effecting resolve; never retry/refetch.
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // Fire the redirect exactly ONCE per settled callback. The redirect target is
  // read at fire time from the freshest data/store/location; a latch prevents a
  // re-fire on any incidental churn, which would double-navigate a one-shot
  // OAuth landing.
  let fired = false;
  watch(
    isSuccess,
    (success) => {
      if (!success || fired) return;
      fired = true;
      const fromData = data.value?.redirectTo;
      const fromStore = store?.getItem<string>(NEXT_PATHNAME_KEY);
      const fromState = location.value.state?.nextPathname;
      const target = fromData ?? fromStore ?? fromState ?? "/";
      // `redirect(fn)` navigates a RAW PATH verbatim — exactly what a resolved
      // callback target is (an app path or an absolute URL).
      redirect(() => target);
    },
    { immediate: true },
  );

  return { settled: isSuccess, error };
}
