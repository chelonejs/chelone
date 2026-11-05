/**
 * The headless auth pieces the routing engine gates on (plan §0a-7/16, D4, W1-T7):
 *
 * - `useAuthGate(requireAuth)` — the no-flash gate state. Reuses the P3 auth
 *   query (`authStateQueryOptions` via `useCheloneAuthProvider`) but adds the two
 *   shell-specific concerns the raw `useAuthState()` does not: the `enabled`
 *   gating (`requireAuth` — no query when the shell doesn't gate) and the
 *   NO-AUTHPROVIDER shortcut (`authProvider == null` → frozen authenticated, so
 *   appless demos never gate — plan §0a-16). The routing engine renders the
 *   loading page WHILE `isPending`, so protected content NEVER mounts during the
 *   pending-auth window — that is the no-flash guarantee (not render-then-hide).
 *
 * - `Authenticated` / `useAuthenticated` — a per-page gate (plan §0a-7). Fires
 *   the auth check for a subtree and, on failure, logs out (default) or renders
 *   nothing; `logoutOnFailure` defaults `true`.
 *
 * - `useHandleAuthCallback` — the OAuth redirect resolver (plan §0a-7): call the
 *   provider's `handleCallback`, then redirect to `data.redirectTo` ELSE the
 *   stored `nextPathname` ELSE `location.state.nextPathname` ELSE `'/'`.
 *
 * - `LogoutOnMount` — logs out on mount (the unauthenticated branch's effect).
 */

import { authStateQueryOptions } from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { useLogout } from "../auth-hooks";
import { useCheloneContext } from "../context";
import { useLocation, useRedirect } from "../router/nav-hooks";

/** The no-flash gate state the routing engine branches on (plan §0a-7). */
export interface AuthGateState {
  /** The auth check is in flight — render the loading page, NOT the layout. */
  isPending: boolean;
  /** Whether the user is authenticated (meaningful once `!isPending`). */
  authenticated: boolean;
}

/**
 * The no-flash gate state (plan §0a-7/16, D4). Composition over the P3 auth
 * query, adding the two shell concerns:
 *
 * 1. `enabled: requireAuth` — when the shell does not gate (`requireAuth` false)
 *    the query never fires and the gate is instantly "authenticated, not
 *    pending" (an ungated shell shows its content immediately).
 * 2. the no-authProvider shortcut — with no `authProvider` the gate is frozen
 *    `{ isPending: false, authenticated: true }` (appless demos never gate —
 *    plan §0a-16), regardless of `requireAuth`.
 *
 * The hooks run unconditionally (Rules of Hooks); `enabled` gates the network,
 * not the hook call.
 */
export function useAuthGate(requireAuth: boolean): AuthGateState {
  const { authProvider } = useCheloneContext();
  const hasProvider = authProvider != null;
  // Only fetch when the shell gates AND a provider exists.
  const enabled = requireAuth && hasProvider;
  const { data, isPending, fetchStatus } = useQuery({
    ...authStateQueryOptions(authProvider),
    enabled,
  });

  // No provider, or the shell does not gate → always authenticated, never
  // pending (the no-authProvider / ungated shortcut). This must win over the
  // query's own `isPending` (react-query reports `isPending: true` for a
  // disabled-and-never-fetched query — `fetchStatus === 'idle'`).
  if (!enabled) {
    return { isPending: false, authenticated: true };
  }
  // A disabled query reports `isPending` true but `fetchStatus` idle; only a
  // genuinely in-flight fetch (or one not yet resolved) is the pending window.
  const pending = isPending && fetchStatus !== "idle";
  return { isPending: pending, authenticated: data?.authenticated === true };
}

export interface UseAuthenticatedOptions {
  /** Whether to enforce the check (default true). `false` → a no-op pass. */
  enabled?: boolean;
  /** On a failed check, log the user out (default true) vs. render nothing. */
  logoutOnFailure?: boolean;
}

/**
 * A per-page auth gate (plan §0a-7). Fires the auth check for the current
 * subtree; on failure it logs out (default `logoutOnFailure: true`) so the shell
 * returns to the login flow. Returns the same `{ isPending, authenticated }`
 * gate state, so a caller can hold rendering until resolved.
 */
export function useAuthenticated(
  options: UseAuthenticatedOptions = {},
): AuthGateState {
  const { enabled = true, logoutOnFailure = true } = options;
  const gate = useAuthGate(enabled);
  const logout = useLogout();

  // React to the RESOLVED gate state: on a settled-but-unauthenticated check,
  // log out (when `logoutOnFailure`). `logout` is a stable react-query mutation
  // object — deliberately omitted from the key so the effect fires on the gate
  // transition, not on the (stable) mutation identity.
  // biome-ignore lint/correctness/useExhaustiveDependencies: logout.mutate is a stable mutation object; keying on it adds no signal and the effect must fire only on the gate-state transition.
  useEffect(() => {
    if (!enabled) return;
    if (gate.isPending) return;
    if (!gate.authenticated && logoutOnFailure) {
      logout.mutate(undefined);
    }
  }, [enabled, gate.isPending, gate.authenticated, logoutOnFailure]);

  return gate;
}

export interface AuthenticatedProps extends UseAuthenticatedOptions {
  /** Rendered only once authenticated (never during the pending window). */
  children: ReactNode;
  /** Shown while the check is pending (default: nothing). */
  loading?: ReactNode;
}

/**
 * Component form of `useAuthenticated` (plan §0a-7). Renders `children` only
 * when authenticated; renders `loading` (default nothing) while pending; renders
 * nothing when unauthenticated (the hook triggers the logout). Protected
 * children NEVER mount during the pending window (no-flash).
 */
export function Authenticated({
  children,
  loading = null,
  ...options
}: AuthenticatedProps): ReactNode {
  const gate = useAuthenticated(options);
  if (gate.isPending) return loading;
  if (!gate.authenticated) return null;
  return children;
}

/** The Store key the login flow stashes the post-login target under. */
const NEXT_PATHNAME_KEY = "nextPathname";

export interface HandleAuthCallbackResult {
  /** True once the callback has resolved and the redirect has been issued. */
  settled: boolean;
  /** The error, if `handleCallback` rejected. */
  error: Error | null;
}

/**
 * Resolve an OAuth auth-callback redirect (plan §0a-7). On mount, call the
 * provider's `handleCallback`; on success, redirect to the FIRST available of:
 * `data.redirectTo` → the stored `nextPathname` (Store) → `location.state
 * .nextPathname` → `'/'`. Rejections surface via the returned `error`.
 *
 * The redirect fires once (an effect keyed on the settled query), so a re-render
 * does not re-navigate. Uses `useRedirect` (absolute-http targets are honored,
 * so a provider may redirect off-site).
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
  // read at fire time from the freshest data/store/location; keying on the other
  // values would re-navigate on any of their (incidental) changes, which is
  // wrong for a one-shot OAuth landing. `isSuccess` is the sole trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot redirect; target read at fire time, re-firing on data/store/location churn would double-navigate.
  useEffect(() => {
    if (!isSuccess) return;
    const fromData = data?.redirectTo;
    const fromStore = store?.getItem<string>(NEXT_PATHNAME_KEY);
    const fromState = location.state?.nextPathname;
    const target = fromData ?? fromStore ?? fromState ?? "/";
    // `redirect(fn)` navigates a RAW PATH verbatim — exactly what a resolved
    // callback target is (an app path or an absolute URL).
    redirect(() => target);
  }, [isSuccess]);

  return { settled: isSuccess, error };
}

/**
 * Log out on mount (plan §0a-7 — the unauthenticated branch's effect). Rendered
 * (returning nothing) so the shell's unauthenticated branch can `<LogoutOnMount/>`
 * to bounce the user to the login flow without a bespoke effect at the call site.
 */
export function LogoutOnMount(): ReactNode {
  const logout = useLogout();
  // Mount-only: log out exactly once when this branch renders. `logout` is a
  // stable react-query mutation object; an empty dep array is intentional (a
  // re-render must not re-trigger the logout).
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only logout; re-triggering on any dep change would loop the logout mutation.
  useEffect(() => {
    logout.mutate(undefined);
  }, []);
  return null;
}
