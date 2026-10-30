import {
  authStateQueryOptions,
  type CanAccessParams,
  canAccessQueryOptions,
  checkError,
  identityQueryOptions,
  permissionsQueryOptions,
} from "@chelone/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useCheloneAuthProvider, useCheloneContext } from "./context";
import { type Redirect, useRedirectOptional } from "./router/nav-hooks";

export function useGetIdentity() {
  return useQuery(identityQueryOptions(useCheloneAuthProvider()));
}

export function useCanAccess(params: CanAccessParams) {
  return useQuery(canAccessQueryOptions(useCheloneAuthProvider(), params));
}

export function useAuthState() {
  return useQuery(authStateQueryOptions(useCheloneAuthProvider()));
}

export function useLogin() {
  const authProvider = useCheloneAuthProvider();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => authProvider.login(params),
  });
}

export function useLogout() {
  const authProvider = useCheloneAuthProvider();
  return useMutation({
    mutationFn: (params?: unknown) => authProvider.logout(params),
  });
}

/* -------------------------------------------------------------------------- */
/* R2 — permissions                                                           */
/* -------------------------------------------------------------------------- */

/** The result of {@link usePermissions}. */
export interface UsePermissionsResult<PermissionsType = unknown> {
  /** The current user's permissions (`undefined` until resolved / unconfigured). */
  permissions: PermissionsType | undefined;
  /** Whether the permissions query is in flight (always `false` when unconfigured). */
  isPending: boolean;
  /** The error, if the provider's `getPermissions` rejected. */
  error: unknown;
  /** Re-run the permissions query. */
  refetch: () => void;
}

/**
 * Fetch the current user's permissions via `authProvider.getPermissions`
 * (R2 parity with ra-core's `usePermissions`). Undefined-tolerant and no-throw:
 *
 * - No `authProvider`, or no `getPermissions` on it → `{ permissions: undefined,
 *   isPending: false }` (access control / permissions not configured).
 * - Otherwise wraps {@link permissionsQueryOptions} via react-query.
 *
 * Unlike {@link useCanAccess}/{@link useGetIdentity} (which THROW without a
 * provider), this degrades gracefully so a no-auth app can call it to gate
 * optional features.
 *
 * @example
 * const { permissions, isPending } = usePermissions<string[]>();
 * if (!isPending && permissions?.includes("admin")) return <AdminPanel />;
 */
export function usePermissions<PermissionsType = unknown>(
  params?: unknown,
  options: { staleTime?: number; enabled?: boolean } = {},
): UsePermissionsResult<PermissionsType> {
  const { authProvider } = useCheloneContext();
  const hasGetPermissions = authProvider?.getPermissions != null;
  const query = useQuery({
    ...permissionsQueryOptions(
      // A stub provider satisfies the option factory's type when none is
      // configured; the query is disabled in that case so it never runs.
      authProvider ?? ({} as NonNullable<typeof authProvider>),
      params,
    ),
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    enabled: (options.enabled ?? true) && hasGetPermissions,
  });

  // No provider / no getPermissions → permissions not configured. React-query
  // reports a disabled query as `isPending: true` (fetchStatus idle); the
  // undefined-tolerant contract must win over that.
  if (!hasGetPermissions) {
    return {
      permissions: undefined,
      isPending: false,
      error: null,
      refetch: query.refetch,
    };
  }
  return {
    permissions: query.data as PermissionsType | undefined,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

/* -------------------------------------------------------------------------- */
/* R2 — logout-if-access-denied + data-error wiring                           */
/* -------------------------------------------------------------------------- */

/** The default path a logged-out session is redirected to. */
const DEFAULT_LOGIN_PATH = "/login";

/**
 * Module-level debounce (mirrors ra-core): side-effects fire at most once per
 * tick, so a burst of simultaneously-erroring queries does not trigger a stack
 * of logouts / notifications in the same render pass.
 */
let logoutTimer: ReturnType<typeof setTimeout> | undefined;

/** Navigate after a logout: absolute URLs hard-navigate, paths use the router. */
function handleRedirect(redirect: Redirect, url: string): void {
  if (url.startsWith("http") && typeof window !== "undefined") {
    window.location.href = url;
  } else {
    // Function form navigates the raw path verbatim (basename-prefixed).
    redirect(() => url);
  }
}

/** The callback returned by {@link useLogoutIfAccessDenied}. */
export type LogoutIfAccessDenied = (error?: unknown) => Promise<boolean>;

/**
 * Returns a callback that runs `authProvider.checkError(error)` against a
 * data/mutation error and, if the session is invalid (checkError REJECTS), logs
 * the user out, notifies, and redirects to the login page (R2 parity with
 * ra-core's `useLogoutIfAccessDenied`).
 *
 * Fail-safe by construction:
 * - No `authProvider` → no-op, resolves `false`.
 * - checkError RESOLVES (an ordinary data error) → no-op, resolves `false`.
 * - checkError REJECTS → logout + notify + redirect, resolves `true`. Only an
 *   auth rejection ever logs the user out; ordinary data errors never do.
 *
 * The reject payload's hints (`redirectTo`, `logoutUser`, `message`) are honored
 * via the vanilla core {@link checkError} triage: `logoutUser: false` downgrades
 * to a "not authorized" notice + optional redirect without ending the session;
 * `message: false` suppresses the notification.
 */
export function useLogoutIfAccessDenied(): LogoutIfAccessDenied {
  const { authProvider, notifications } = useCheloneContext();
  // A tolerant logout mutation: `useLogout()` throws without an authProvider,
  // but this hook must be safe to mount in a no-auth app (the data-error
  // watcher calls it unconditionally). Inline the mutation so no throw occurs.
  const logout = useMutation({
    mutationFn: (params?: unknown) =>
      authProvider?.logout(params) ?? Promise.resolve(),
  });
  const redirect = useRedirectOptional();

  return useCallback<LogoutIfAccessDenied>(
    async (error) => {
      if (!authProvider) return false;
      const outcome = await checkError(authProvider, error);
      if (!outcome.logout) return false;

      // Debounce: at most one logout side-effect burst per tick.
      if (logoutTimer) return true;
      logoutTimer = setTimeout(() => {
        logoutTimer = undefined;
      }, 0);

      const { logoutUser, redirectTo, message } = outcome;
      const isHttpRedirect = redirectTo?.startsWith("http") ?? false;
      const shouldNotify = message !== false && !isHttpRedirect;
      if (shouldNotify && notifications) {
        notifications.notify(
          typeof message === "string"
            ? message
            : logoutUser
              ? "chelone.notification.logged_out"
              : "chelone.notification.not_authorized",
          { type: "error" },
        );
      }

      if (logoutUser) {
        logout.mutate(redirectTo != null ? { redirectTo } : undefined);
        handleRedirect(redirect, redirectTo ?? DEFAULT_LOGIN_PATH);
      } else if (redirectTo) {
        handleRedirect(redirect, redirectTo);
      }
      return true;
    },
    [authProvider, notifications, logout, redirect],
  );
}

/** True when a react-query key belongs to the auth subsystem (`["auth", …]`). */
function isAuthQueryKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === "auth";
}

/**
 * Wire `checkError` → auto-logout into the DATA ERROR PATH (R2). Subscribes to
 * the shared QueryClient's query + mutation caches and, on every settled error,
 * runs {@link useLogoutIfAccessDenied} — so a 401/403 surfaced by the
 * dataProvider auto-logs-out (checkError rejects) while an ordinary data error
 * is left alone (checkError resolves).
 *
 * Auth-subsystem queries (`["auth", …]` — checkAuth / canAccess / getIdentity /
 * getPermissions) are skipped to avoid feedback loops. A no-op without an
 * `authProvider`. Mounted once by `<AdminContext>` / `<Admin>`.
 */
export function useWatchDataErrors(): void {
  const queryClient = useQueryClient();
  const { authProvider } = useCheloneContext();
  const logoutIfAccessDenied = useLogoutIfAccessDenied();

  useEffect(() => {
    if (!authProvider) return;
    const queryCache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();

    const unsubQueries = queryCache.subscribe((event) => {
      if (event.type !== "updated") return;
      if (event.action.type !== "error") return;
      if (isAuthQueryKey(event.query.queryKey)) return;
      void logoutIfAccessDenied(event.action.error);
    });
    const unsubMutations = mutationCache.subscribe((event) => {
      if (event.type !== "updated") return;
      if (event.action.type !== "error") return;
      void logoutIfAccessDenied(event.action.error);
    });

    return () => {
      unsubQueries();
      unsubMutations();
    };
  }, [queryClient, authProvider, logoutIfAccessDenied]);
}
